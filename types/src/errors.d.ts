export class GeminiError extends Error {
    /** @param {string} message */
    constructor(message: string);
}
export class InitError extends GeminiError {
}
export class APIError extends GeminiError {
    /** @param {number} status @param {string} body */
    constructor(status: number, body: string);
    status: number;
    body: string;
}
export class StreamError extends GeminiError {
    /** @param {string} message @param {Error} [cause] */
    constructor(message: string, cause?: Error);
    cause: Error | undefined;
}
