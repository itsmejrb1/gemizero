import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePayload, extractResponse, ResponseParser } from '../src/parser.js';

/**
 * Build a batchexecute chunk from inner data.
 * Wire format: [[null, null, "<inner_json_string>"]]
 */
function makeChunk(innerData) {
  const innerStr = JSON.stringify(innerData);
  const payload = JSON.stringify([[null, null, innerStr]]);
  return `${payload.length}\n${payload}\n`;
}

describe('parsePayload', () => {
  it('returns empty array for empty body', () => {
    assert.deepEqual(parsePayload(''), []);
  });

  it('returns empty array for malformed input', () => {
    assert.deepEqual(parsePayload('not-json'), []);
  });

  it('parses a valid batchexecute chunk', () => {
    const body = makeChunk([null, ['a', 'b'], [['c']]]);
    const result = parsePayload(body);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], [null, ['a', 'b'], [['c']]]);
  });

  it('skips chunks where inner is not a string', () => {
    const payload = JSON.stringify([[null, null, 123]]);
    const body = `${payload.length}\n${payload}\n`;
    assert.deepEqual(parsePayload(body), []);
  });
});

describe('extractResponse', () => {
  it('returns null fields for empty chunks', () => {
    const res = extractResponse([]);
    assert.equal(res.text, null);
    assert.equal(res.metadata, null);
  });

  it('extracts text from candidate response', () => {
    const chunks = [[null, null, null, null, [[null, ['hello world']]]]];
    const res = extractResponse(chunks);
    assert.equal(res.text, 'hello world');
  });

  it('extracts conversation metadata', () => {
    const chunks = [[null, ['conv_id', 'resp_id']]];
    const res = extractResponse(chunks);
    assert.equal(res.conversationId, 'conv_id');
    assert.equal(res.responseId, 'resp_id');
  });

  it('extracts all fields from complex response', () => {
    const chunks = [
      [
        null,
        ['conv_1', 'resp_1'],
        null,
        null,
        [[null, ['first text']], ['ctx_1', ['second text']]],
      ],
    ];
    const res = extractResponse(chunks);
    assert.equal(res.text, 'second text');
    assert.equal(res.conversationId, 'conv_1');
    assert.equal(res.responseId, 'resp_1');
    assert.equal(res.responseContextId, 'ctx_1');
  });
});

describe('ResponseParser', () => {
  it('extracts text deltas incrementally', () => {
    const parser = new ResponseParser();

    const first = parser.push(makeChunk([null, null, null, null, [[null, ['hel']]]]));
    assert.deepEqual(first, ['hel']);

    const second = parser.push(makeChunk([null, null, null, null, [[null, ['hello']]]]));
    assert.deepEqual(second, ['lo']);
  });

  it('processes multiple chunks with growing text', () => {
    const parser = new ResponseParser();

    const make = (text) => {
      const inner = JSON.stringify([null, null, null, null, [[null, [text]]]]);
      const payload = JSON.stringify([[null, null, inner]]);
      return `${payload.length}\n${payload}\n`;
    };

    const result = parser.push(make('ab') + make('abcd'));
    assert.deepEqual(result, ['ab', 'cd']);
  });

  it('yields empty array for partial first line', () => {
    const parser = new ResponseParser();
    assert.deepEqual(parser.push('incomplete'), []);
  });
});
