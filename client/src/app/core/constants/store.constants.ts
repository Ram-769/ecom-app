export const API_BASE_URL = '/api';
export const CART_STORAGE_KEY = 'forma.cart.v1';
export const FAVORITES_STORAGE_KEY = 'forma.favorites.v1';
export const SORT_OPTIONS = [
  { label: 'Featured', value: 'featured' },
  { label: 'Price: low to high', value: 'price-asc' },
  { label: 'Price: high to low', value: 'price-desc' },
  { label: 'Top rated', value: 'rating' },
] as const;
export type SortOrder = (typeof SORT_OPTIONS)[number]['value'];
