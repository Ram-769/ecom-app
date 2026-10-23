export function parseApiBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Set API_BASE_URL to the Render HTTPS URL followed by /api before deploying to Netlify.');
  }
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('API_BASE_URL must be an absolute HTTPS URL ending in /api.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !/^\/api\/?$/.test(url.pathname)) {
    throw new Error('API_BASE_URL must use HTTPS, end in /api, and contain no credentials, query, or fragment.');
  }
  return `${url.origin}/api`;
}

export function netlifySecurityHeaders(apiBaseUrl) {
  const origin = new URL(apiBaseUrl).origin;
  return `/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' ${origin}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/app-config.json
  Cache-Control: no-store

/index.html
  Cache-Control: no-cache
`;
}
