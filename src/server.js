import crypto from 'crypto';
import express from 'express';
import { GeminiClient } from './client.js';

/** @type {GeminiClient|null} */
let client = null;

/** @returns {Promise<GeminiClient>} */
async function getClient() {
  if (!client) {
    client = new GeminiClient();
    await client.init();
  }
  return client;
}

/**
 * Process an OpenAI-format messages array into prompt + metadata.
 * Builds conversation context from prior messages when no metadata token is available.
 * @param {{ role: string, content: string, metadata?: any[] }[]} messages
 * @returns {{ prompt: string, metadata: any[]|null }}
 */
export function processMessages(messages) {
  let prompt = '';
  /** @type {string[]} */
  const contextParts = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (!prompt && msg.role === 'user') {
      prompt = msg.content;
    } else if (msg.role === 'assistant') {
      contextParts.unshift(`Assistant: ${msg.content}`);
    } else if (msg.role === 'user') {
      contextParts.unshift(`User: ${msg.content}`);
    }
  }

  if (!prompt) {
    return { prompt: '', metadata: null };
  }

  if (contextParts.length > 0) {
    prompt = `${contextParts.join('\n')}\nUser: ${prompt}`;
  }

  return { prompt, metadata: null };
}

/**
 * @param {Function} fn
 * @returns {express.RequestHandler}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function createTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function corsMiddleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { return res.sendStatus(204); }

  next();
}

/**
 * @param {Error} err
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
function errorHandler(err, _req, res, _next) {
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
}

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
function notFoundHandler(_req, res) {
  res.status(404).json({ error: { message: 'Not found' } });
}

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
function healthHandler(_req, res) {
  res.json({ status: 'ok' });
}

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
function modelsHandler(_req, res) {
  const modelNames = Object.keys(/** @type {GeminiClient} */ (client).models);
  res.json({
    object: 'list',
    data: modelNames.map((id) => ({
      id,
      object: 'model',
      created: createTimestamp(),
      owned_by: 'google',
    })),
  });
}

/**
 * @param {string} id
 * @param {string} model
 * @param {import('./parser.js').GeminiResponse} result
 * @returns {Record<string, any>}
 */
function chatResponse(id, model, result) {
  return {
    id,
    object: 'chat.completion',
    created: createTimestamp(),
    model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: result.text,
        metadata: result.metadata,
      },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: -1, completion_tokens: -1, total_tokens: -1 },
  };
}

/**
 * @param {string} id
 * @param {string} model
 * @param {Record<string, any>} delta
 * @param {string|null} finishReason
 * @returns {Record<string, any>}
 */
function chunkResponse(id, model, delta, finishReason) {
  return {
    id,
    object: 'chat.completion.chunk',
    created: createTimestamp(),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

/**
 * @param {express.Response} res
 * @param {Record<string, any>} data
 */
function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * @param {GeminiClient} gemini
 * @param {express.Response} res
 * @param {string} id
 * @param {string} model
 * @param {string} prompt
 * @param {any[]|null} metadata
 */
async function handleStreamingChat(gemini, res, id, model, prompt, metadata) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sendSSE(res, chunkResponse(id, model, { role: 'assistant' }, null));

  try {
    for await (const delta of gemini.streamMessage(prompt, { model, metadata })) {
      sendSSE(res, chunkResponse(id, model, { content: delta }, null));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendSSE(res, { error: { message } });
  }

  sendSSE(res, chunkResponse(id, model, {}, 'stop'));
  res.write('data: [DONE]\n\n');
  res.end();
}

/**
 * @param {GeminiClient} gemini
 * @param {express.Response} res
 * @param {string} id
 * @param {string} model
 * @param {string} prompt
 * @param {any[]|null} metadata
 */
async function handleChat(gemini, res, id, model, prompt, metadata) {
  try {
    const result = await gemini.sendMessage(prompt, { model, metadata });
    res.json(chatResponse(id, model, result));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: { message } });
  }
}

/** @returns {Promise<express.Application>} */
export async function createApp() {
  const gemini = await getClient();
  const modelNames = Object.keys(gemini.models);
  const defaultModel = modelNames[0];
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(corsMiddleware);

  app.get('/health', healthHandler);
  app.get('/v1/models', modelsHandler);

  app.post(
    '/v1/chat/completions',
    asyncHandler(async (/** @type {express.Request} */ req, /** @type {express.Response} */ res) => {
      const { model = defaultModel, messages, stream = false } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          error: { message: 'messages is required and must be a non-empty array' },
        });
      }

      const selectedModel = modelNames.includes(model) ? model : defaultModel;
      const { prompt, metadata } = processMessages(messages);

      if (!prompt) {
        return res.status(400).json({ error: { message: 'No user message found' } });
      }

      const id = `chatcmpl-${crypto.randomUUID().slice(0, 12)}`;

      if (stream) {
        return handleStreamingChat(gemini, res, id, selectedModel, prompt, metadata);
      }

      return handleChat(gemini, res, id, selectedModel, prompt, metadata);
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
