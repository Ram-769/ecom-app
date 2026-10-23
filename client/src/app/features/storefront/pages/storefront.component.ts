import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CATEGORIES, STORE_CONFIG } from '@ecom/contracts';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { CatalogService } from '../../../core/services/catalog.service';
import { CartService } from '../../../core/services/cart.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { SORT_OPTIONS, type SortOrder } from '../../../core/constants/store.constants';
import type { Category, Product } from '../../../core/models/store.models';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { CartDrawerComponent } from '../components/cart-drawer/cart-drawer.component';

@Component({
  selector: 'app-storefront', standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule, SkeletonModule, ProductCardComponent, CartDrawerComponent, MoneyPipe],
  templateUrl: './storefront.component.html', styleUrl: './storefront.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorefrontComponent {
  readonly catalog = inject(CatalogService);
  readonly cart = inject(CartService);
  readonly favorites = inject(FavoritesService);
  private readonly messages = inject(MessageService);
  readonly categories = ['All products', ...CATEGORIES] as const;
  readonly category = signal<Category | 'All products'>('All products');
  readonly search = signal('');
  readonly sort = signal<SortOrder>('featured');
  readonly favoritesOnly = signal(false);
  readonly cartVisible = signal(false);
  readonly sortOptions = [...SORT_OPTIONS];
  readonly shippingThreshold = STORE_CONFIG.freeShippingThreshold;
  readonly skeletons = [0, 1, 2, 3];
  readonly products = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const products = this.catalog.products().filter(product =>
      (this.category() === 'All products' || product.category === this.category()) &&
      (!query || `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase().includes(query)) &&
      (!this.favoritesOnly() || this.favorites.ids().has(product.id)),
    );
    switch (this.sort()) {
      case 'price-asc': return products.sort((a, b) => a.price - b.price);
      case 'price-desc': return products.sort((a, b) => b.price - a.price);
      case 'rating': return products.sort((a, b) => b.rating - a.rating);
      default: return products;
    }
  });
  addProduct(product: Product): void {
    const added = this.cart.add(product);
    this.messages.add({ severity: added ? 'success' : 'info', summary: added ? 'A good addition.' : 'Bag limit reached', detail: added ? `${product.name} is in your bag.` : 'The available stock or quantity limit has been reached.' });
  }
  resetFilters(): void { this.search.set(''); this.category.set('All products'); this.favoritesOnly.set(false); this.sort.set('featured'); }
}
