export const CATEGORIES = ['Audio', 'Workspace', 'Lifestyle'] as const;
export type Category = (typeof CATEGORIES)[number];
export type DataMode = 'demo' | 'mongodb';
export const STORE_CONFIG = {
  currency: 'INR', locale: 'en-IN', shippingFee: 9900, freeShippingThreshold: 500000,
  maxQuantity: 10, maxOrderLines: 20,
} as const;

/** All money values are integer paise, including prices returned by the API. */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly category: Category;
  readonly description: string;
  readonly price: number;
  readonly originalPrice?: number;
  readonly image: string;
  readonly imageAlt: string;
  readonly color: string;
  readonly rating: number;
  readonly reviews: number;
  readonly stock: number;
  readonly badge?: string;
}
export interface CatalogResponse { readonly products: readonly Product[]; readonly mode: DataMode; }
export interface CartItem { readonly product: Product; readonly quantity: number; }
export interface Customer { readonly name: string; readonly email: string; readonly address: string; }
export interface OrderLineRequest { readonly productId: string; readonly quantity: number; }
export interface CreateOrderRequest { readonly customer: Customer; readonly items: readonly OrderLineRequest[]; }
export interface OrderLine extends OrderLineRequest { readonly name: string; readonly unitPrice: number; }
export interface Order {
  readonly id: string;
  readonly customer: Customer;
  readonly items: readonly OrderLine[];
  readonly subtotal: number;
  readonly shipping: number;
  readonly total: number;
  readonly currency: typeof STORE_CONFIG.currency;
  readonly status: 'sample-confirmed';
  readonly createdAt: string;
}
export interface OrderResponse { readonly order: Order; readonly mode: DataMode; }
export interface ApiError { readonly message: string; readonly code: string; }

export function shippingFor(subtotal: number): number {
  return subtotal === 0 || subtotal >= STORE_CONFIG.freeShippingThreshold ? 0 : STORE_CONFIG.shippingFee;
}
