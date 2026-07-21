import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildModelHeaders,
  buildRequestHeaders,
  buildInnerPayload,
  buildGenerateRequest,
} from '../src/protocol.js';

describe('buildModelHeaders', () => {
  it('returns headers with model id and default capacity', () => {
    const headers = buildModelHeaders('abc123');
    assert.ok(headers['x-goog-ext-525001261-jspb']);
    assert.equal(headers['x-goog-ext-73010989-jspb'], '[0]');
    assert.equal(headers['x-goog-ext-73010990-jspb'], '[0,0,0]');

    const parsed = JSON.parse(headers['x-goog-ext-525001261-jspb']);
    assert.equal(parsed[4], 'abc123');
    assert.equal(parsed[11], 1);
  });

  it('accepts custom capacity tail', () => {
    const headers = buildModelHeaders('xyz', 3);
    const parsed = JSON.parse(headers['x-goog-ext-525001261-jspb']);
    assert.equal(parsed[11], 3);
  });
});

describe('buildRequestHeaders', () => {
  it('includes all required fields', () => {
    const headers = buildRequestHeaders('cookie=abc', 'model1');
    assert.equal(headers['Content-Type'], 'application/x-www-form-urlencoded;charset=UTF-8');
    assert.equal(headers.Cookie, 'cookie=abc');
    assert.equal(headers.Origin, 'https://gemini.google.com');
    assert.equal(headers.Referer, 'https://gemini.google.com/');
    assert.equal(headers['X-Same-Domain'], '1');
    assert.ok(headers['x-goog-ext-525001261-jspb']);
  });
});

describe('buildInnerPayload', () => {
  it('creates a 69-element array', () => {
    const payload = buildInnerPayload('hello', 'en-US', null);
    assert.equal(payload.length, 69);
  });

  it('places prompt at index 0', () => {
    const payload = buildInnerPayload('hello', 'en-US', null);
    assert.deepEqual(payload[0], ['hello', 0, null, null, null, null, 0]);
  });

  it('places language at index 1', () => {
    const payload = buildInnerPayload('hello', 'fr-FR', null);
    assert.deepEqual(payload[1], ['fr-FR']);
  });

  it('uses default metadata when none provided', () => {
    const payload = buildInnerPayload('hello', 'en-US', null);
    assert.ok(Array.isArray(payload[2]));
    assert.equal(payload[2].length, 11);
    assert.equal(payload[2][0], '');
  });

  it('merges short metadata array into defaults', () => {
    const metadata = ['ctx_key', 'resp_key'];
    const payload = buildInnerPayload('hello', 'en-US', metadata);
    assert.equal(payload[2][0], 'ctx_key');
    assert.equal(payload[2][1], 'resp_key');
    assert.equal(payload[2].length, 11);
  });

  it('uses metadata directly when longer than defaults', () => {
    const longMeta = new Array(12).fill('x');
    const payload = buildInnerPayload('hello', 'en-US', longMeta);
    assert.equal(payload[2], longMeta);
  });

  it('sets safety settings to [1]', () => {
    const payload = buildInnerPayload('hi', 'en-US', null);
    assert.deepEqual(payload[6], [1]);
  });

  it('generates a UUID at index 59 (uppercase, no dashes)', () => {
    const payload = buildInnerPayload('hi', 'en-US', null);
    const id = payload[59];
    assert.equal(typeof id, 'string');
    assert.equal(id, id.toUpperCase());
    assert.ok(!id.includes('-'));
  });
});

describe('buildGenerateRequest', () => {
  const context = {
    buildLabel: 'bl123',
    sessionId: 'sid456',
    language: 'en-US',
    reqid: 50000,
  };

  it('returns url and body', () => {
    const inner = buildInnerPayload('hi', 'en-US', null);
    const result = buildGenerateRequest(inner, context);
    assert.ok(result.url);
    assert.ok(result.body);
  });

  it('includes language and reqid in url params', () => {
    const inner = buildInnerPayload('hi', 'en-US', null);
    const result = buildGenerateRequest(inner, context);
    assert.ok(result.url.includes('hl=en-US'));
    assert.ok(result.url.includes('_reqid=50000'));
    assert.ok(result.url.includes('rt=c'));
  });

  it('includes buildLabel and sessionId when present', () => {
    const inner = buildInnerPayload('hi', 'en-US', null);
    const result = buildGenerateRequest(inner, context);
    assert.ok(result.url.includes('bl=bl123'));
    assert.ok(result.url.includes('f.sid=sid456'));
  });

  it('omits optional params when null', () => {
    const inner = buildInnerPayload('hi', 'en-US', null);
    const minimal = { buildLabel: null, sessionId: null, language: 'en', reqid: 1 };
    const result = buildGenerateRequest(inner, minimal);
    assert.ok(!result.url.includes('bl='));
    assert.ok(!result.url.includes('f.sid='));
  });

  it('body is URL-encoded with f.req', () => {
    const inner = buildInnerPayload('hi', 'en-US', null);
    const result = buildGenerateRequest(inner, context);
    assert.ok(result.body.startsWith('f.req='));
    assert.ok(result.body.includes('%5Bnull%2C'));
  });
});
