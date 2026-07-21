export class GeminiError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class InitError extends GeminiError {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'InitError';
  }
}

export class APIError extends GeminiError {
  /** @param {number} status @param {string} body */
  constructor(status, body) {
    super(`Gemini API returned ${status}`);
    this.name = 'APIError';
    this.status = status;
    this.body = body;
  }
}

export class StreamError extends GeminiError {
  /** @param {string} message @param {Error} [cause] */
  constructor(message, cause) {
    super(message);
    this.name = 'StreamError';
    this.cause = cause;
  }
}
