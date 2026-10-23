import { MongoClient, MongoServerError, ServerApiVersion, type Collection } from 'mongodb';
import type { CreateOrderRequest, Order, Product } from '@ecom/contracts';
import { sampleProducts } from '../data/products.js';
import { buildOrder, fingerprint } from '../order.js';
import { HttpError } from '../errors.js';
import type { StoreRepository } from './store.repository.js';

interface OrderDocument { idempotencyKey: string; fingerprint: string; order: Order; }

export class MongoRepository implements StoreRepository {
  readonly mode = 'mongodb' as const;
  private readonly client: MongoClient;
  private readonly products: Collection<Product>;
  private readonly orders: Collection<OrderDocument>;

  constructor(uri: string, databaseName: string) {
    this.client = new MongoClient(uri, {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
      serverSelectionTimeoutMS: 10000, maxPoolSize: 10,
    });
    const db = this.client.db(databaseName);
    this.products = db.collection<Product>('products');
    this.orders = db.collection<OrderDocument>('orders');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.ping();
    await Promise.all([
      this.products.createIndex({ id: 1 }, { unique: true }),
      this.orders.createIndex({ idempotencyKey: 1 }, { unique: true }),
    ]);
  }

  /** Inserts missing sample products only; never resets existing inventory or orders. */
  async seed(): Promise<void> {
    await this.products.bulkWrite(sampleProducts.map(product => ({
      updateOne: { filter: { id: product.id }, update: { $setOnInsert: product }, upsert: true },
    })));
  }

  async catalog() {
    const products = await this.products.find({}, { projection: { _id: 0 } }).toArray();
    return { products, mode: this.mode };
  }

  async placeOrder(request: CreateOrderRequest, idempotencyKey: string): Promise<Order> {
    const hash = fingerprint(request);
    const existing = await this.orders.findOne({ idempotencyKey });
    if (existing) return this.matchExisting(existing, hash);
    const session = this.client.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const duplicate = await this.orders.findOne({ idempotencyKey }, { session });
        if (duplicate) return this.matchExisting(duplicate, hash);
        const products = await this.products.find({ id: { $in: request.items.map(item => item.productId) } }, { session }).toArray();
        const order = buildOrder(request, products);
        for (const item of order.items) {
          const updated = await this.products.updateOne(
            { id: item.productId, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { session },
          );
          if (updated.modifiedCount !== 1) throw new HttpError(409, 'OUT_OF_STOCK', 'Stock changed during checkout. Please refresh your bag.');
        }
        await this.orders.insertOne({ idempotencyKey, fingerprint: hash, order }, { session });
        return order;
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
      if (!result) throw new HttpError(503, 'CHECKOUT_UNAVAILABLE', 'Checkout could not complete. Please retry.');
      return result;
    } catch (error: unknown) {
      if (error instanceof MongoServerError && error.code === 11000) {
        const duplicate = await this.orders.findOne({ idempotencyKey });
        if (duplicate) return this.matchExisting(duplicate, hash);
      }
      throw error;
    } finally { await session.endSession(); }
  }

  private matchExisting(document: OrderDocument, hash: string): Order {
    if (document.fingerprint !== hash) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'This checkout key was already used for a different order.');
    return document.order;
  }
  async ping(): Promise<void> { await this.client.db().command({ ping: 1 }); }
  async close(): Promise<void> { await this.client.close(); }
}
