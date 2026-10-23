import { type CatalogResponse, type CreateOrderRequest, type DataMode, type Order } from '@ecom/contracts';
export interface StoreRepository {
  readonly mode: DataMode;
  catalog(): Promise<CatalogResponse>;
  placeOrder(request: CreateOrderRequest, idempotencyKey: string): Promise<Order>;
  ping(): Promise<void>;
  close(): Promise<void>;
}
