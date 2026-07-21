# gemizero

> Unofficial Google Gemini API — no login, no API keys, no cost.

**gemizero** reverse-engineers the internal `batchexecute` RPC protocol used by the Gemini web app and exposes it as a standard **OpenAI-compatible** HTTP API.

```sh
npx gemizero
curl http://localhost:5000/v1/chat/completions \
  -H "content-type: application/json" \
  -d '{ "messages": [{ "role": "user", "content": "hello" }] }'
```

---

## Features

- **No authentication** — works without a Google account or API key
- **OpenAI-compatible** — drop-in replacement for any OpenAI SDK
- **Streaming** — SSE-formatted stream responses via `stream: true`
- **Multi-turn** — pass `metadata` from the previous response to continue conversations
- **Multiple models** — Flash, Pro, Thinking, and their plus variants

## Usage

### CLI

```sh
PORT=3000 npx gemizero
```

### Programmatic

```js
import { GeminiClient } from 'gemizero';

const client = new GeminiClient();
await client.init();

const res = await client.sendMessage('tell me a joke');
console.log(res.text);
```

### With OpenAI SDK

```js
import OpenAI from 'openai';

const gemini = new OpenAI({ baseURL: 'http://localhost:5000/v1', apiKey: 'sk-placeholder' });

// Single message
const chat = await gemini.chat.completions.create({
  model: 'gemini-3-flash',
  messages: [{ role: 'user', content: 'hello' }],
});
console.log(chat.choices[0].message.content);

// Streaming
const stream = await gemini.chat.completions.create({
  model: 'gemini-3-flash',
  messages: [{ role: 'user', content: 'count to 5' }],
  stream: true,
});
for await (const part of stream) {
  process.stdout.write(part.choices[0]?.delta?.content || '');
}

// Multi-turn
const meta = chat.choices[0].message.metadata;
const followUp = await gemini.chat.completions.create({
  model: 'gemini-3-flash',
  messages: [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: chat.choices[0].message.content, metadata: meta },
    { role: 'user', content: 'what did I say?' },
  ],
});
```

### API Endpoints

| Method | Path                      | Description              |
|--------|---------------------------|--------------------------|
| GET    | `/v1/models`              | List available models    |
| POST   | `/v1/chat/completions`    | Chat completion (stream + non-stream) |
| GET    | `/health`                 | Health check             |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `5000`  | HTTP port   |

### Models

| ID                             | Description              |
|--------------------------------|--------------------------|
| `gemini-3-flash`               | Fast, lightweight        |
| `gemini-3-flash-plus`          | Flash with plus features |
| `gemini-3-pro`                 | High quality             |
| `gemini-3-pro-plus`            | Pro with plus features   |
| `gemini-3-flash-thinking`      | Flash + reasoning        |
| `gemini-3-flash-thinking-plus` | Flash thinking + plus    |

## How It Works

gemizero talks directly to the internal RPC endpoints the Gemini web app uses.
It does **not** use the official Google Gemini API — there is no API key, no
billing, and no Google account required.

The library:

1. Fetches `gemini.google.com/app` to obtain session cookies and extract `WIZ_global_data`
2. Sends requests to `BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate` using Google's `batchexecute` length-prefixed protocol
3. Parses the deeply nested JSON response and extracts model output

Because it relies on the web-facing API, there is **no guarantee of uptime or
rate limits**. Google may change the protocol at any time.

## Project Structure

```
src/
├── client.js      # GeminiClient — session management, send & stream messages
├── constants.js   # Endpoints, model IDs, defaults
├── errors.js      # Error classes (GeminiError, InitError, APIError, StreamError)
├── parser.js      # batchexecute response parser + streaming parser
├── protocol.js    # Payload builders, header generators
├── request.js     # HTTP client (native fetch wrapper)
└── server.js      # Express app — OpenAI-compatible HTTP API
```

## License

MIT © [Jr Busaco](https://github.com/itsmejrb1)
