import { createHash, randomUUID } from 'node:crypto';
import { STORE_CONFIG, shippingFor, type CreateOrderRequest, type Order, type OrderLine, type Product } from '@ecom/contracts';
import { z } from 'zod';
import { HttpError } from './errors.js';

export const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.email().max(160),
    address: z.string().trim().min(10).max(400),
  }).strict(),
  items: z.array(z.object({
    productId: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
    quantity: z.number().int().min(1).max(STORE_CONFIG.maxQuantity),
  }).strict()).min(1).max(STORE_CONFIG.maxOrderLines),
}).strict().refine(value => new Set(value.items.map(item => item.productId)).size === value.items.length, {
  message: 'Each product can appear only once.', path: ['items'],
});

export function fingerprint(request: CreateOrderRequest): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex');
}

export function buildOrder(request: CreateOrderRequest, products: readonly Product[]): Order {
  const byId = new Map(products.map(product => [product.id, product]));
  const items: OrderLine[] = request.items.map(item => {
    const product = byId.get(item.productId);
    if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'A product is no longer available. Refresh your bag.');
    if (product.stock < item.quantity) throw new HttpError(409, 'OUT_OF_STOCK', `${product.name} has only ${product.stock} available.`);
    return { ...item, name: product.name, unitPrice: product.price };
  });
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = shippingFor(subtotal);
  return {
    id: randomUUID(), customer: request.customer, items, subtotal, shipping,
    total: subtotal + shipping, currency: STORE_CONFIG.currency,
    status: 'sample-confirmed', createdAt: new Date().toISOString(),
  };
}
