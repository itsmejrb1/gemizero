import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:5432';

let server;
/** @type {import('../src/server.js').processMessages | undefined} */
let processMessages;

before(async () => {
  const { createApp, processMessages: pm } = await import('../src/server.js');
  processMessages = pm;
  const app = await createApp();
  await new Promise((resolve) => {
    server = app.listen(5432, resolve);
  });
});

after(() => {
  if (server) server.close();
});

describe('server', () => {
  it('GET /health returns ok', async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  it('GET /v1/models lists models', async () => {
    const res = await fetch(`${BASE}/v1/models`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.object, 'list');
    assert.ok(body.data.length > 0);
    assert.equal(body.data[0].object, 'model');
  });

  it('POST /v1/chat/completions validates messages', async () => {
    const res = await fetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.message.includes('messages'));
  });

  it('POST /v1/chat/completions validates user message', async () => {
    const res = await fetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'assistant', content: 'hi' }] }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.message.includes('user message'));
  });

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`${BASE}/unknown`);
    assert.equal(res.status, 404);
  });
});

describe('processMessages', () => {
  it('extracts single user message', () => {
    const { prompt, metadata } = processMessages([
      { role: 'user', content: 'Hello' },
    ]);
    assert.equal(prompt, 'Hello');
    assert.equal(metadata, null);
  });

  it('builds conversation context for multi-turn without metadata', () => {
    const { prompt, metadata } = processMessages([
      { role: 'user', content: 'First message' },
      { role: 'assistant', content: 'First response' },
      { role: 'user', content: 'Second message' },
    ]);
    assert.ok(prompt.includes('First message'));
    assert.ok(prompt.includes('First response'));
    assert.ok(prompt.includes('Second message'));
    assert.equal(metadata, null);
  });

  it('uses metadata from the last assistant message', () => {
    const meta = ['ctx_token', '', '', null, null, null, null, null, null, null, ''];
    const { prompt, metadata } = processMessages([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello', metadata: meta },
      { role: 'user', content: 'Bye' },
    ]);
    assert.equal(prompt, 'User: Hi\nAssistant: Hello\nUser: Bye');
    assert.deepEqual(metadata, meta);
  });

  it('picks last assistant metadata when multiple exist', () => {
    const meta1 = ['first'];
    const meta2 = ['second'];
    const { prompt, metadata } = processMessages([
      { role: 'user', content: 'A' },
      { role: 'assistant', content: 'B', metadata: meta1 },
      { role: 'user', content: 'C' },
      { role: 'assistant', content: 'D', metadata: meta2 },
      { role: 'user', content: 'E' },
    ]);
    assert.ok(prompt.includes('C'));
    assert.deepEqual(metadata, meta2);
  });
});
