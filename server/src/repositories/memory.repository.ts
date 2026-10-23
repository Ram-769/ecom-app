import type { CreateOrderRequest, Order, Product } from '@ecom/contracts';
import { sampleProducts } from '../data/products.js';
import { HttpError } from '../errors.js';
import { buildOrder, fingerprint } from '../order.js';
import type { StoreRepository } from './store.repository.js';

export class MemoryRepository implements StoreRepository {
  readonly mode = 'demo' as const;
  private products: Product[];
  private readonly orders = new Map<string, { order: Order; fingerprint: string }>();

  constructor(products: readonly Product[] = sampleProducts) { this.products = structuredClone([...products]); }
  async catalog() { return { products: structuredClone(this.products), mode: this.mode }; }

  async placeOrder(request: CreateOrderRequest, idempotencyKey: string): Promise<Order> {
    const hash = fingerprint(request);
    const previous = this.orders.get(idempotencyKey);
    if (previous) {
      if (previous.fingerprint !== hash) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'This checkout key was already used for a different order.');
      return structuredClone(previous.order);
    }
    // No await between validation and mutation: one atomic turn in this single-process demo.
    const order = buildOrder(request, this.products);
    this.products = this.products.map(product => ({
      ...product, stock: product.stock - (order.items.find(item => item.productId === product.id)?.quantity ?? 0),
    }));
    this.orders.set(idempotencyKey, { order, fingerprint: hash });
    return structuredClone(order);
  }
  async ping(): Promise<void> { /* In-memory store is always available. */ }
  async close(): Promise<void> { this.orders.clear(); }
}
