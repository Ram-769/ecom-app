import type { Routes } from '@angular/router';
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/storefront/pages/storefront.component').then(module => module.StorefrontComponent) },
  { path: '**', redirectTo: '' },
];
