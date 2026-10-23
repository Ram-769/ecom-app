import { InjectionToken, inject } from '@angular/core';
import { RuntimeConfigService } from '../services/runtime-config.service';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root', factory: () => inject(RuntimeConfigService).apiBaseUrl,
});
