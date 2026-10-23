import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { STORE_CONFIG, shippingFor } from '@ecom/contracts';
import type { CartItem, Product, StoredCartEntry } from '../models/store.models';
import { CART_STORAGE_KEY } from '../constants/store.constants';
import { CatalogService } from './catalog.service';
import { readStorage, writeStorage } from '../../shared/utils/storage';

function readCart(): readonly StoredCartEntry[] {
  const value = readStorage(CART_STORAGE_KEY);
  if (!Array.isArray(value)) return [];
  const entries: StoredCartEntry[] = [];
  for (const candidate of value as unknown[]) {
    if (typeof candidate !== 'object' || candidate === null || !('productId' in candidate) || !('quantity' in candidate)) continue;
    if (typeof candidate.productId !== 'string' || typeof candidate.quantity !== 'number' || !Number.isInteger(candidate.quantity) || candidate.quantity < 1 || entries.some(item => item.productId === candidate.productId)) continue;
    entries.push({ productId: candidate.productId, quantity: Math.min(candidate.quantity, STORE_CONFIG.maxQuantity) });
    if (entries.length === STORE_CONFIG.maxOrderLines) break;
  }
  return entries;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly catalog = inject(CatalogService);
  private readonly entries = signal<readonly StoredCartEntry[]>(readCart());
  readonly items = computed<readonly CartItem[]>(() => this.entries().flatMap(entry => {
    const product = this.catalog.products().find(item => item.id === entry.productId);
    return product ? [{ product, quantity: entry.quantity }] : [];
  }));
  readonly count = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + item.product.price * item.quantity, 0));
  readonly shipping = computed(() => shippingFor(this.subtotal()));
  readonly total = computed(() => this.subtotal() + this.shipping());
  readonly invalidStock = computed(() => this.items().some(item => item.quantity > item.product.stock));
  readonly freeShippingRemaining = computed(() => Math.max(0, STORE_CONFIG.freeShippingThreshold - this.subtotal()));
  readonly maxQuantity = STORE_CONFIG.maxQuantity;
  constructor() { effect(() => writeStorage(CART_STORAGE_KEY, this.entries())); }

  add(product: Product): boolean {
    const current = this.entries().find(item => item.productId === product.id);
    const quantity = (current?.quantity ?? 0) + 1;
    if (quantity > Math.min(product.stock, STORE_CONFIG.maxQuantity)) return false;
    if (!current && this.entries().length >= STORE_CONFIG.maxOrderLines) return false;
    this.entries.update(items => current ? items.map(item => item.productId === product.id ? { ...item, quantity } : item) : [...items, { productId: product.id, quantity }]);
    return true;
  }
  setQuantity(product: Product, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > Math.min(product.stock, STORE_CONFIG.maxQuantity)) return;
    this.entries.update(items => items.map(item => item.productId === product.id ? { ...item, quantity } : item));
  }
  remove(productId: string): void { this.entries.update(items => items.filter(item => item.productId !== productId)); }
  clear(): void { this.entries.set([]); }
}
