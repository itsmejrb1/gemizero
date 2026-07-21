import crypto from 'crypto';
import { ENDPOINTS, DEFAULT_METADATA } from './constants.js';

/**
 * @typedef {Object} RequestContext
 * @property {string|null} buildLabel
 * @property {string|null} sessionId
 * @property {string} language
 * @property {number} reqid
 */

// Field indices in Google's 69-element batchexecute request payload.
// Reverse-engineered from gemini.google.com's internal protocol.
// Each index maps to a specific input dimension of the model server.
const F = {
  PROMPT: 0,          // [text, 0, null, null, null, null, 0] - the user's message
  LANGUAGE: 1,        // [lang] - UI language code (e.g. "en-US")
  METADATA: 2,        // conversation context token from previous response
  SAFETY_SETTINGS: 6, // [1] - enables safety filtering
  GENERATION_ID: 59,  // UUID - unique generation identifier (uppercase, no dashes)
  LAST: 68,           // 2 - terminal field marking payload end
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
 * Build the inner 69-element payload array for Gemini's batchexecute endpoint.
 * @param {string} prompt
 * @param {string} language
 * @param {any[]|null} [metadata]
 * @returns {any[]}
 */
export function buildInnerPayload(prompt, language, metadata) {
  const payload = new Array(69).fill(null);

  // User input
  payload[F.PROMPT] = [prompt, 0, null, null, null, null, 0];
  payload[F.LANGUAGE] = [language];
  payload[F.METADATA] = metadata || DEFAULT_METADATA;

  // Safety & behavior flags
  payload[F.SAFETY_SETTINGS] = [1];
  payload[7] = 1;   // enable response generation
  payload[10] = 1;  // enable streaming-compatible mode
  payload[11] = 0;  // disable anonymous mode
  payload[17] = [[0]]; // response format: text
  payload[18] = 0;  // response length preference
  payload[27] = 1;  // enable context caching
  payload[30] = [4]; // max output tokens exponent
  payload[41] = [2]; // candidate count

  // Generation identity
  payload[53] = 0;  // generation version
  payload[F.GENERATION_ID] = crypto.randomUUID().toUpperCase();
  payload[61] = [];  // additional context (often empty)
  payload[F.LAST] = 2;

  return payload;
}

/**
 * Wrap the inner payload in the batchexecute wire format with URL parameters.
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
