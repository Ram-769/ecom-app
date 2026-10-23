import { config } from 'dotenv';
import { z } from 'zod';
import { setServers } from 'node:dns/promises';
import { isIP } from 'node:net';

config({ path: new URL('../../.env', import.meta.url), quiet: true });
const environment = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().refine(value => isIP(value) !== 0 || value === 'localhost').default('127.0.0.1'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  DATA_MODE: z.enum(['demo', 'mongodb']).default('demo'),
  MONGODB_URI: z.string().optional(),
  MONGODB_DB: z.string().regex(/^[a-zA-Z0-9_-]+$/).default('ecom_app'),
  CLIENT_ORIGIN: z.url().default('http://localhost:4200'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NODE_DNS_SERVERS: z.string().optional().refine(value => !value || value.split(',').every(ip => isIP(ip.trim()) !== 0)),
}).safeParse(process.env);

if (!environment.success) throw new Error('Invalid environment configuration. Check .env against .env.example.');
export const configValues = environment.data;
if (configValues.NODE_DNS_SERVERS) setServers(configValues.NODE_DNS_SERVERS.split(',').map(ip => ip.trim()));
if (configValues.DATA_MODE === 'mongodb' && (!configValues.MONGODB_URI || /<|>/.test(configValues.MONGODB_URI))) {
  throw new Error('Set a valid MONGODB_URI in .env for MongoDB mode.');
}
