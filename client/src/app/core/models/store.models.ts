export type { ApiError, CartItem, CatalogResponse, Category, CreateOrderRequest, Customer, DataMode, Order, OrderResponse, Product } from '@ecom/contracts';
export interface StoredCartEntry { readonly productId: string; readonly quantity: number; }
