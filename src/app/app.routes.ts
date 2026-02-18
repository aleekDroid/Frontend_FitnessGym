// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, adminGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '',          redirectTo: 'home', pathMatch: 'full' },
      { path: 'home',      loadComponent: () => import('./pages/admin/home/home.component').then(m => m.HomeComponent) },
      { path: 'users',     loadComponent: () => import('./pages/admin/users/users.component').then(m => m.UsersComponent) },
      { path: 'inventory', loadComponent: () => import('./pages/admin/inventory/inventory.component').then(m => m.InventoryComponent) },
      { path: 'prices',    loadComponent: () => import('./pages/admin/prices/prices.component').then(m => m.PricesComponent) },
      { path: 'dashboard', loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
