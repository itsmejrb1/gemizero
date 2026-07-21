import { ENDPOINTS, MODEL_IDS } from './constants.js';
import { InitError, APIError } from './errors.js';
import { request, requestStream } from './request.js';
import { parsePayload, extractResponse, ResponseParser } from './parser.js';
import { buildInnerPayload, buildGenerateRequest, buildRequestHeaders } from './protocol.js';

const INIT_REQID = Math.floor(Math.random() * 90000) + 10000;
const REQID_STEP = 100000;

export class GeminiClient {
  #cookies = '';
  #buildLabel = null;
  #sessionId = null;
  #language = 'en-US';
  #reqid = INIT_REQID;
  #modelId = MODEL_IDS['gemini-3-flash'];
  #ready = false;

  get ready() {
    return this.#ready;
  }

  /**
   * @param {string} [cookieStr]
   * @returns {Promise<void>}
   */
  async init(cookieStr) {
    if (cookieStr) { this.#cookies = cookieStr; }

    const res = await request(ENDPOINTS.INIT, {
      headers: { Cookie: this.#cookies, Accept: 'text/html,*/*' },
    });

    if (res.cookies) { this.#cookies = res.cookies; }

    const match = res.body.match(/WIZ_global_data\s*=\s*({.*?});/);
    if (!match) { throw new InitError('Could not extract WIZ_global_data from page'); }

    const wiz = JSON.parse(match[1]);
    this.#buildLabel = wiz.cfb2h || null;
    this.#sessionId = wiz.FdrFJe || null;
    this.#language = wiz.TuX5cc || 'en-US';
    this.#ready = true;
  }

  /**
   * @param {string} prompt
   * @param {{ model?: string, metadata?: any[]|null }} [options]
   * @returns {Promise<import('./parser.js').GeminiResponse>}
   */
  async sendMessage(prompt, { model = 'gemini-3-flash', metadata } = {}) {
    const { url, body } = this.#buildRequest(prompt, model, metadata);

    const res = await request(url, {
      method: 'POST',
      headers: buildRequestHeaders(this.#cookies, this.#modelId),
      body,
    });

    if (res.status !== 200) { throw new APIError(res.status, res.body); }

    return extractResponse(parsePayload(res.body));
  }

  /**
   * @param {string} prompt
   * @param {{ model?: string, metadata?: any[]|null }} [options]
   * @yields {string}
   */
  async *streamMessage(prompt, { model = 'gemini-3-flash', metadata } = {}) {
    const { url, body } = this.#buildRequest(prompt, model, metadata);

    const response = await requestStream(url, {
      method: 'POST',
      headers: buildRequestHeaders(this.#cookies, this.#modelId),
      body,
    });

    if (!response.ok) {
      throw new APIError(response.status, await response.text().catch(() => ''));
    }

    if (!response.body) { throw new Error('Response body is null'); }

    const reader = response.body.getReader();
    const parser = new ResponseParser();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { break; }

        for (const delta of parser.push(decoder.decode(value, { stream: true }))) {
          yield delta;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * @param {string} prompt
   * @param {string} model
   * @param {any[]|null} [metadata]
   * @returns {{ url: string, body: string }}
   */
  #buildRequest(prompt, model, metadata) {
    this.#modelId = MODEL_IDS[/** @type {keyof typeof MODEL_IDS} */ (model)] || MODEL_IDS['gemini-3-flash'];
    const payload = buildInnerPayload(prompt, this.#language, metadata);
    const req = buildGenerateRequest(payload, {
      buildLabel: this.#buildLabel,
      sessionId: this.#sessionId,
      language: this.#language,
      reqid: this.#reqid,
    });
    this.#reqid += REQID_STEP;
    return req;
  }
}
