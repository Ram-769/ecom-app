import { type ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { MessageService } from 'primeng/api';
import { routes } from './app.routes';

const FormaPreset = definePreset(Aura, {
  semantic: {
    primary: { 50: '#edf5f0', 100: '#d6e7dd', 200: '#aecdbb', 300: '#83af96', 400: '#5a8d72', 500: '#356b52', 600: '#255640', 700: '#173f35', 800: '#14352d', 900: '#112b25', 950: '#081c17' },
    colorScheme: { light: { primary: { color: '{primary.700}', inverseColor: '#ffffff', hoverColor: '{primary.800}', activeColor: '{primary.900}' } } },
  },
});
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), provideZonelessChangeDetection(), provideHttpClient(), provideRouter(routes),
    providePrimeNG({ theme: { preset: FormaPreset, options: { darkModeSelector: false, cssLayer: false } }, ripple: true }),
    MessageService,
  ],
};
