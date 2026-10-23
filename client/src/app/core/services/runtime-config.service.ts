import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private readonly http = inject(HttpClient);
  private apiBaseUrlValue = '/api';
  get apiBaseUrl(): string { return this.apiBaseUrlValue; }

  async load(): Promise<void> {
    const config = await firstValueFrom(this.http.get<unknown>('/app-config.json'));
    if (typeof config !== 'object' || config === null || !('apiBaseUrl' in config) || typeof config.apiBaseUrl !== 'string') {
      throw new Error('The storefront API configuration is invalid.');
    }
    const value = config.apiBaseUrl.replace(/\/$/, '');
    if (value === '/api') { this.apiBaseUrlValue = value; return; }
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/api') {
      throw new Error('The storefront requires a secure API URL ending in /api.');
    }
    this.apiBaseUrlValue = value;
  }
}
