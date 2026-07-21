/**
 * @typedef {Object} RequestOptions
 * @property {string} [method]
 * @property {Record<string,string>} [headers]
 * @property {string} [body]
 */
/**
 * @typedef {Object} RequestResult
 * @property {number} status
 * @property {Headers} headers
 * @property {string} body
 * @property {string} cookies
 */
/**
 * @param {string} url
 * @param {RequestOptions} [options]
 * @returns {Promise<RequestResult>}
 */
export function request(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * @param {string} url
 * @param {RequestOptions} [options]
 * @returns {Promise<Response>}
 */
export function requestStream(url: string, options?: RequestOptions): Promise<Response>;
export type RequestOptions = {
    method?: string | undefined;
    headers?: Record<string, string> | undefined;
    body?: string | undefined;
};
export type RequestResult = {
    status: number;
    headers: Headers;
    body: string;
    cookies: string;
};
