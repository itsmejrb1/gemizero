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
export function parsePayload(body: string): any[];
/**
 * Extract structured response data from parsed chunks.
 * @param {any[]} chunks
 * @returns {GeminiResponse}
 */
export function extractResponse(chunks: any[]): GeminiResponse;
/**
 * Incremental parser for streaming batchexecute responses.
 */
export class ResponseParser {
    /**
     * Push a raw chunk into the parser and extract any new text deltas.
     * @param {string} chunk
     * @returns {string[]}
     */
    push(chunk: string): string[];
    #private;
}
export type GeminiResponse = {
    text: string | null;
    conversationId: string | null;
    responseId: string | null;
    responseContextId: string | null;
    metadata: any[] | null;
};
