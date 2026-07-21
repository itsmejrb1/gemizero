/**
 * @typedef {Object} RequestContext
 * @property {string|null} buildLabel
 * @property {string|null} sessionId
 * @property {string} language
 * @property {number} reqid
 */
/**
 * @param {string} modelId
 * @param {number} [capacityTail]
 * @returns {Record<string, string>}
 */
export function buildModelHeaders(modelId: string, capacityTail?: number): Record<string, string>;
/**
 * @param {string} cookies
 * @param {string} modelId
 * @returns {Record<string, string>}
 */
export function buildRequestHeaders(cookies: string, modelId: string): Record<string, string>;
/**
 * Build the inner 69-element payload array.
 * @param {string} prompt
 * @param {string} language
 * @param {any[]|null} [metadata]
 * @returns {any[]}
 */
export function buildInnerPayload(prompt: string, language: string, metadata?: any[] | null): any[];
/**
 * @param {any[]} innerPayload
 * @param {RequestContext} context
 * @returns {{ url: string, body: string }}
 */
export function buildGenerateRequest(innerPayload: any[], context: RequestContext): {
    url: string;
    body: string;
};
export type RequestContext = {
    buildLabel: string | null;
    sessionId: string | null;
    language: string;
    reqid: number;
};
