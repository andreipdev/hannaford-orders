// Defense in depth for a single-user, loopback-bound tool; not user authentication.
function isLocalRequest(request) {
  try {
    // Next.js may normalize request.url to an internal hostname. Validate the
    // actual Host header, and compare Origin against that browser-facing host.
    const host = request.headers.get('host');
    if (!host) return false;
    const url = new URL('http://' + host);
    if (url.host !== host || url.username || url.password || url.pathname !== '/') return false;
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return false;
    if (request.headers.get('x-hannaford-local') !== '1') return false;
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return false;
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') return false;
    return true;
  } catch {
    return false;
  }
}

module.exports = { isLocalRequest };
