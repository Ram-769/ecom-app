import { Injectable, effect, signal } from '@angular/core';
import { FAVORITES_STORAGE_KEY } from '../constants/store.constants';
import { readStorage, writeStorage } from '../../shared/utils/storage';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly saved = readStorage(FAVORITES_STORAGE_KEY);
  private readonly idsState = signal<ReadonlySet<string>>(new Set(Array.isArray(this.saved) ? this.saved.filter((id: unknown): id is string => typeof id === 'string').slice(0, 200) : []));
  readonly ids = this.idsState.asReadonly();
  constructor() { effect(() => writeStorage(FAVORITES_STORAGE_KEY, [...this.idsState()])); }
  toggle(id: string): void {
    this.idsState.update(ids => { const next = new Set(ids); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
}
