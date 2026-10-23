import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { orderSchema } from './order.js';
import { HttpError } from './errors.js';
import type { StoreRepository } from './repositories/store.repository.js';

interface AppOptions {
  readonly clientOrigin: string;
  readonly serveClient?: boolean;
  readonly trustProxyHops?: number;
}

export function createApp(repository: StoreRepository, options: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxyHops ?? 0);
  app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'"], 'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:'] } } }));
  app.use(cors({ origin: options.clientOrigin, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Idempotency-Key'] }));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use('/api', rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in a minute.' } }));

  app.get('/api/health', async (_req, res) => {
    await repository.ping();
    res.json({ status: 'ok', mode: repository.mode });
  });
  app.get('/api/products', async (_req, res) => { res.json(await repository.catalog()); });
  app.post('/api/orders', rateLimit({ windowMs: 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { code: 'RATE_LIMITED', message: 'Please wait a minute before trying checkout again.' } }), async (req, res) => {
    const parsed = orderSchema.safeParse(req.body as unknown);
    if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', 'Provide valid customer details and between 1 and 10 of each product.');
    const key = z.uuid().safeParse(req.get('Idempotency-Key'));
    if (!key.success) throw new HttpError(400, 'INVALID_CHECKOUT_KEY', 'A valid Idempotency-Key header is required.');
    const order = await repository.placeOrder(parsed.data, key.data);
    res.status(201).json({ order, mode: repository.mode });
  });
  app.use('/api', (_req, _res, next) => { next(new HttpError(404, 'NOT_FOUND', 'API endpoint not found.')); });

  const clientPath = fileURLToPath(new URL('../../client/dist/storefront/browser/', import.meta.url));
  if (options.serveClient && existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get('/{*path}', (_req, res) => { res.sendFile(`${clientPath}/index.html`); });
  }
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof HttpError) { res.status(error.status).json({ code: error.code, message: error.message }); return; }
    if (error instanceof SyntaxError || (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large')) {
      res.status(400).json({ code: 'INVALID_BODY', message: 'The request body is invalid or too large.' }); return;
    }
    // Never log raw database errors; they can contain connection details or customer data.
    console.error('Request failed:', error instanceof Error ? error.name : 'UnknownError');
    res.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'The store is temporarily unavailable. Please try again.' });
  };
  app.use(errorHandler);
  return app;
}
