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
export async function request(url, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body || undefined,
    redirect: 'follow',
  });

  return {
    status: response.status,
    headers: response.headers,
    body: await response.text(),
    cookies: extractCookies(response.headers),
  };
}

/**
 * @param {string} url
 * @param {RequestOptions} [options]
 * @returns {Promise<Response>}
 */
export async function requestStream(url, options = {}) {
  return fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body || undefined,
  });
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
