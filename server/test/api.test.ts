import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { MemoryRepository } from '../src/repositories/memory.repository.js';
import { STORE_CONFIG, type CatalogResponse, type OrderResponse } from '@ecom/contracts';

let repository: MemoryRepository;
beforeEach(() => { repository = new MemoryRepository(); });
afterEach(async () => { await repository.close(); });
const app = () => createApp(repository, { clientOrigin: 'http://localhost:4200' });
const customer = { name: 'Sample Customer', email: 'sample@example.com', address: '123 Sample Street, Chennai 600001' };
const payload = { customer, items: [{ productId: 'arc-headphones', quantity: 1 }] };

test('catalog and health expose explicit data mode without database details', async () => {
  const health = await request(app()).get('/api/health').expect(200);
  assert.deepEqual(health.body, { status: 'ok', mode: 'demo' });
  const response = await request(app()).get('/api/products').expect(200);
  const catalog = response.body as CatalogResponse;
  assert.equal(catalog.products.length, 8);
  assert.ok(catalog.products.every(product => Number.isSafeInteger(product.price)));
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('checkout calculates authoritative prices and shipping, then decrements stock once', async () => {
  const key = randomUUID();
  const response = await request(app()).post('/api/orders').set('Idempotency-Key', key).send(payload).expect(201);
  const { order } = response.body as OrderResponse;
  assert.equal(order.subtotal, 449900);
  assert.equal(order.shipping, STORE_CONFIG.shippingFee);
  assert.equal(order.total, 459800);
  assert.equal(order.status, 'sample-confirmed');
  const retry = await request(app()).post('/api/orders').set('Idempotency-Key', key).send(payload).expect(201);
  assert.equal((retry.body as OrderResponse).order.id, order.id);
  assert.equal((await repository.catalog()).products.find(product => product.id === 'arc-headphones')?.stock, 23);
});

test('free-shipping threshold uses integer paise', async () => {
  const response = await request(app()).post('/api/orders').set('Idempotency-Key', randomUUID()).send({ ...payload, items: [{ productId: 'arc-headphones', quantity: 2 }] }).expect(201);
  assert.equal((response.body as OrderResponse).order.shipping, 0);
  assert.equal((response.body as OrderResponse).order.total, 899800);
});

test('rejects invalid quantity, duplicate products, missing key, unknown fields, and price tampering', async () => {
  const invalid = [
    { ...payload, items: [{ productId: 'arc-headphones', quantity: -1 }] },
    { ...payload, items: [{ productId: 'arc-headphones', quantity: 1.5 }] },
    { ...payload, items: [{ productId: 'arc-headphones', quantity: 11 }] },
    { ...payload, items: [...payload.items, ...payload.items] },
    { ...payload, total: 1 },
    { ...payload, customer: { ...customer, email: 'invalid' } },
    { ...payload, items: [] },
  ];
  for (const body of invalid) await request(app()).post('/api/orders').set('Idempotency-Key', randomUUID()).send(body).expect(400);
  await request(app()).post('/api/orders').send(payload).expect(400);
  assert.equal((await repository.catalog()).products[0]?.stock, 24);
});

test('rejects reused keys with a different payload', async () => {
  const key = randomUUID();
  await request(app()).post('/api/orders').set('Idempotency-Key', key).send(payload).expect(201);
  await request(app()).post('/api/orders').set('Idempotency-Key', key).send({ ...payload, items: [{ productId: 'arc-headphones', quantity: 2 }] }).expect(409);
});

test('out-of-stock and unknown products leave other inventory unchanged', async () => {
  await request(app()).post('/api/orders').set('Idempotency-Key', randomUUID()).send({ ...payload, items: [...payload.items, { productId: 'desk-organizer', quantity: 1 }] }).expect(409);
  await request(app()).post('/api/orders').set('Idempotency-Key', randomUUID()).send({ ...payload, items: [{ productId: 'missing', quantity: 1 }] }).expect(404);
  assert.equal((await repository.catalog()).products[0]?.stock, 24);
});

test('concurrent checkouts cannot oversell the last item', async () => {
  const source = (await repository.catalog()).products[0];
  assert.ok(source);
  const lastItemStore = new MemoryRepository([{ ...source, stock: 1 }]);
  const isolatedApp = createApp(lastItemStore, { clientOrigin: 'http://localhost:4200' });
  const responses = await Promise.all(Array.from({ length: 2 }, () => request(isolatedApp).post('/api/orders').set('Idempotency-Key', randomUUID()).send(payload)));
  assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
  assert.equal((await lastItemStore.catalog()).products[0]?.stock, 0);
  await lastItemStore.close();
});

test('malformed JSON and unknown API routes return consistent JSON errors', async () => {
  await request(app()).post('/api/orders').type('json').send('{broken').expect(400);
  const response = await request(app()).get('/api/missing').expect(404);
  assert.equal((response.body as { code: string }).code, 'NOT_FOUND');
});
