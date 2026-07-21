/**
 * @typedef {Object} GeminiResponse
 * @property {string|null} text
 * @property {string|null} conversationId
 * @property {string|null} responseId
 * @property {string|null} responseContextId
 * @property {any[]|null} metadata
 */

/**
 * Parse a complete batchexecute response into data chunks.
 * @param {string} body
 * @returns {any[]}
 */
export function parsePayload(body) {
  /** @type {any[]} */
  const chunks = [];
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const length = parseInt(lines[i], 10);
    if (isNaN(length)) { continue; }

    const raw = lines[++i];
    if (!raw) { break; }

    try {
      const parsed = JSON.parse(raw);
      const inner = parsed[0]?.[2];
      if (inner && typeof inner === 'string') {
        chunks.push(JSON.parse(inner));
      }
    } catch {
      // malformed chunk
    }
  }

  return chunks;
}

/**
 * Extract structured response data from parsed chunks.
 * @param {any[]} chunks
 * @returns {GeminiResponse}
 */
export function extractResponse(chunks) {
  /** @type {string|null} */
  let text = null;
  /** @type {string|null} */
  let conversationId = null;
  /** @type {string|null} */
  let responseId = null;
  /** @type {string|null} */
  let responseContextId = null;
  /** @type {any[]|null} */
  let metadata = null;

  for (const chunk of chunks) {
    if (!metadata && chunk[1]) { metadata = chunk[1]; }
    if (!conversationId) { conversationId = chunk[1]?.[0] || null; }
    if (!responseId) { responseId = chunk[1]?.[1] || null; }

    /** @type {any[]} */
    const candidates = chunk[4] || [];
    for (const c of candidates) {
      if (!responseContextId) { responseContextId = c[0] || null; }
      const candidateText = c[1]?.[0];
      if (candidateText) { text = candidateText; }
    }
  }

  return { text, conversationId, responseId, responseContextId, metadata };
}

/**
 * Incremental parser for streaming batchexecute responses.
 */
export class ResponseParser {
  /** @type {string} */
  #buffer = '';
  /** @type {number} */
  #maxTextLength = 0;

  /**
   * Push a raw chunk into the parser and extract any new text deltas.
   * @param {string} chunk
   * @returns {string[]}
   */
  push(chunk) {
    this.#buffer += chunk;
    return this.#extractDeltas();
  }

  /**
   * @returns {string[]}
   */
  #extractDeltas() {
    /** @type {string[]} */
    const deltas = [];
    const lines = this.#buffer.split('\n');
    this.#buffer = lines.pop() || '';

    for (let i = 0; i < lines.length; i++) {
      const length = parseInt(lines[i], 10);
      if (isNaN(length)) { continue; }

      const raw = lines[++i];
      if (!raw) { break; }

      try {
        const parsed = JSON.parse(raw);
        const inner = parsed[0]?.[2];
        if (!inner) { continue; }

        const data = JSON.parse(inner);
        /** @type {any[]} */
        const candidates = data[4] || [];
        for (const c of candidates) {
          const text = c[1]?.[0] || '';
          if (text.length > this.#maxTextLength) {
            deltas.push(text.slice(this.#maxTextLength));
            this.#maxTextLength = text.length;
          }
        }
      } catch {
        // malformed chunk
      }
    }

    return deltas;
  }
}
