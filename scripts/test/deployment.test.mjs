import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseApiBaseUrl, netlifySecurityHeaders } from '../lib/deployment-config.mjs';

test('deployment normalizes a secure Render API endpoint', () => {
  assert.equal(parseApiBaseUrl('https://sample-api.onrender.com/api/'), 'https://sample-api.onrender.com/api');
});
test('deployment rejects missing endpoints, credentials, HTTP, and URL injection', () => {
  for (const value of [undefined, '', '/api', 'http://sample-api.onrender.com/api', 'https://user:secret@host.test/api', 'https://host.test/api?secret=value', 'https://host.test/api#fragment', 'https://host.test/other']) {
    assert.throws(() => parseApiBaseUrl(value));
  }
});
test('security policy permits only the configured backend origin for external API connections', () => {
  const headers = netlifySecurityHeaders('https://sample-api.onrender.com/api');
  assert.ok(headers.includes("connect-src 'self' https://sample-api.onrender.com;"));
  assert.ok(headers.includes('/app-config.json\n  Cache-Control: no-store'));
  assert.ok(headers.includes("frame-ancestors 'none'"));
});
