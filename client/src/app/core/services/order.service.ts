import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { CreateOrderRequest, OrderResponse } from '../models/store.models';
import { API_BASE_URL } from '../tokens/api.tokens';
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  place(request: CreateOrderRequest, key: string): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiBaseUrl}/orders`, request, { headers: { 'Idempotency-Key': key } });
  }
}
