import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { CreateOrderRequest, OrderResponse } from '../models/store.models';
import { API_BASE_URL } from '../constants/store.constants';
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  place(request: CreateOrderRequest, key: string): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${API_BASE_URL}/orders`, request, { headers: { 'Idempotency-Key': key } });
  }
}
