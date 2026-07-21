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

const REQUEST_TIMEOUT = 30_000;

/**
 * @param {string} url
 * @param {RequestOptions & { signal?: AbortSignal }} [options]
 * @returns {Promise<RequestResult>}
 */
export async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body || undefined,
      redirect: 'follow',
      signal: options.signal || controller.signal,
    });

    return {
      status: response.status,
      headers: response.headers,
      body: await response.text(),
      cookies: extractCookies(response.headers),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {string} url
 * @param {RequestOptions & { signal?: AbortSignal }} [options]
 * @returns {Promise<Response>}
 */
export async function requestStream(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    return fetch(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body || undefined,
      signal: options.signal || controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {Headers} headers
 * @returns {string}
 */
function extractCookies(headers) {
  const values =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : [headers.get('set-cookie') || ''].flat();

  return values.map((c) => c.split(';')[0]).join('; ');
}
