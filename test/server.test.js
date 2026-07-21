import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:5432';

let server;

before(async () => {
  const { createApp } = await import('../src/server.js');
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
