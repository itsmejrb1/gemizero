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
  if (server) { server.close(); }
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

describe('streaming', () => {
  it('POST /v1/chat/completions?stream=true returns SSE headers', async () => {
    const res = await fetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        stream: true,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/event-stream');
    assert.equal(res.headers.get('cache-control'), 'no-cache');
    assert.equal(res.headers.get('connection'), 'keep-alive');
  });

  it('POST /v1/chat/completions?stream=true validates messages', async () => {
    const res = await fetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stream: true, messages: [] }),
    });
    assert.equal(res.status, 400);
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

  it('ignores assistant metadata and uses text context instead', () => {
    const meta = ['ctx_token', ''];
    const { prompt, metadata } = processMessages([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello', metadata: meta },
      { role: 'user', content: 'Bye' },
    ]);
    assert.equal(prompt, 'User: Hi\nAssistant: Hello\nUser: Bye');
    assert.equal(metadata, null);
  });
});
