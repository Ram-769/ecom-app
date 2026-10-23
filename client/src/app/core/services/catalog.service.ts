import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { API_BASE_URL } from '../constants/store.constants';
import type { CatalogResponse, DataMode, Product } from '../models/store.models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly productsState = signal<readonly Product[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');
  private readonly modeState = signal<DataMode | null>(null);
  readonly products = this.productsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly mode = this.modeState.asReadonly();
  constructor() { this.load(); }

  load(): void {
    if (this.loadingState()) return;
    this.loadingState.set(true);
    this.errorState.set('');
    this.http.get<CatalogResponse>(`${API_BASE_URL}/products`).pipe(
      finalize(() => this.loadingState.set(false)), takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: response => { this.productsState.set(response.products); this.modeState.set(response.mode); },
      error: () => this.errorState.set('We could not load the collection. Please try again.'),
    });
  }
}
