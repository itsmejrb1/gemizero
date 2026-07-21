import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiError, InitError, APIError, StreamError } from '../src/errors.js';

describe('GeminiError', () => {
  it('is an Error with name GeminiError', () => {
    const err = new GeminiError('test');
    assert.ok(err instanceof Error);
    assert.equal(err.name, 'GeminiError');
    assert.equal(err.message, 'test');
  });
});

describe('InitError', () => {
  it('extends GeminiError with name InitError', () => {
    const err = new InitError('init failed');
    assert.ok(err instanceof GeminiError);
    assert.ok(err instanceof Error);
    assert.equal(err.name, 'InitError');
    assert.equal(err.message, 'init failed');
  });
});

describe('APIError', () => {
  it('extends GeminiError with status and body', () => {
    const err = new APIError(401, 'unauthorized');
    assert.ok(err instanceof GeminiError);
    assert.equal(err.name, 'APIError');
    assert.equal(err.status, 401);
    assert.equal(err.body, 'unauthorized');
    assert.ok(err.message.includes('401'));
  });
});

describe('StreamError', () => {
  it('extends GeminiError with optional cause', () => {
    const cause = new Error('underlying');
    const err = new StreamError('stream broke', cause);
    assert.ok(err instanceof GeminiError);
    assert.equal(err.name, 'StreamError');
    assert.equal(err.message, 'stream broke');
    assert.equal(err.cause, cause);
  });

  it('works without cause', () => {
    const err = new StreamError('stream broke');
    assert.equal(err.cause, undefined);
  });
});
