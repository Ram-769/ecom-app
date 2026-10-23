import { writeFile, access } from 'node:fs/promises';
import { parseApiBaseUrl, netlifySecurityHeaders } from './lib/deployment-config.mjs';

try {
  const apiBaseUrl = parseApiBaseUrl(process.env.API_BASE_URL);
  const output = new URL('../client/dist/storefront/browser/', import.meta.url);
  await access(new URL('index.html', output));
  await Promise.all([
    writeFile(new URL('app-config.json', output), `${JSON.stringify({ apiBaseUrl }, null, 2)}\n`),
    writeFile(new URL('_headers', output), netlifySecurityHeaders(apiBaseUrl)),
  ]);
  console.log('Netlify runtime configuration and security headers generated.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Netlify configuration failed.');
  process.exitCode = 1;
}
