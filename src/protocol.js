import crypto from 'crypto';
import { ENDPOINTS, DEFAULT_METADATA } from './constants.js';

/**
 * @typedef {Object} RequestContext
 * @property {string|null} buildLabel
 * @property {string|null} sessionId
 * @property {string} language
 * @property {number} reqid
 */

// Reverse-engineered field indices in Google's 69-element request array.
// These mirror the internal `batchexecute` protocol used by gemini.google.com.
const F = {
  PROMPT: 0,
  LANGUAGE: 1,
  METADATA: 2,
  SAFETY_SETTINGS: 6,
  GENERATION_ID: 59,
  LAST: 68,
};

/**
 * @param {string} modelId
 * @param {number} [capacityTail]
 * @returns {Record<string, string>}
 */
export function buildModelHeaders(modelId, capacityTail = 1) {
  return {
    'x-goog-ext-525001261-jspb': JSON.stringify([
      1, null, null, null, modelId, null, null, 0, [4], null, null, capacityTail,
    ]),
    'x-goog-ext-73010989-jspb': '[0]',
    'x-goog-ext-73010990-jspb': '[0,0,0]',
  };
}

/**
 * @param {string} cookies
 * @param {string} modelId
 * @returns {Record<string, string>}
 */
export function buildRequestHeaders(cookies, modelId) {
  return {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    Cookie: cookies,
    Origin: 'https://gemini.google.com',
    Referer: 'https://gemini.google.com/',
    'X-Same-Domain': '1',
    ...buildModelHeaders(modelId),
  };
}

/**
 * @param {string} prompt
 * @param {string} language
 * @param {any[]|null} [metadata]
 * @returns {any[]}
 */
export function buildInnerPayload(prompt, language, metadata) {
  const payload = new Array(69).fill(null);

  payload[F.PROMPT] = [prompt, 0, null, null, null, null, 0];
  payload[F.LANGUAGE] = [language];
  payload[F.METADATA] = metadata || DEFAULT_METADATA;
  payload[F.SAFETY_SETTINGS] = [1];
  payload[7] = 1;
  payload[10] = 1;
  payload[11] = 0;
  payload[17] = [[0]];
  payload[18] = 0;
  payload[27] = 1;
  payload[30] = [4];
  payload[41] = [2];
  payload[53] = 0;
  payload[F.GENERATION_ID] = crypto.randomUUID().toUpperCase();
  payload[61] = [];
  payload[F.LAST] = 2;

  return payload;
}

/**
 * @param {any[]} innerPayload
 * @param {RequestContext} context
 * @returns {{ url: string, body: string }}
 */
export function buildGenerateRequest(innerPayload, context) {
  const fReq = JSON.stringify([null, JSON.stringify(innerPayload)]);
  const body = new URLSearchParams({ 'f.req': fReq }).toString();

  const params = new URLSearchParams({
    hl: context.language,
    _reqid: String(context.reqid),
    rt: 'c',
  });

  if (context.buildLabel) { params.set('bl', context.buildLabel); }
  if (context.sessionId) { params.set('f.sid', context.sessionId); }

  return { url: `${ENDPOINTS.GENERATE}?${params}`, body };
}
