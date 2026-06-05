// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, adminGuard, publicGuard, memberGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Fitness Gym | Entrena y alcanza tus metas',
    canActivate: [publicGuard],
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'login',
    title: 'Iniciar Sesión | Fitness Gym',
    canActivate: [publicGuard],
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '',          redirectTo: 'home', pathMatch: 'full' },
      { path: 'home',      title: 'Inicio | Admin', loadComponent: () => import('./pages/admin/home/home.component').then(m => m.HomeComponent) },
      { path: 'users',     title: 'Miembros | Admin', loadComponent: () => import('./pages/admin/users/users.component').then(m => m.UsersComponent) },
      { path: 'users/:id', title: 'Perfil de Miembro | Admin', loadComponent: () => import('./pages/admin/users/user-details/user-details').then(m => m.UserDetails) },
      { path: 'inventory', title: 'Inventario | Admin', loadComponent: () => import('./pages/admin/inventory/inventory.component').then(m => m.InventoryComponent) },
      { path: 'inventory/:id', title: 'Detalles de Producto | Admin', loadComponent: () => import('./pages/admin/inventory/product-details/product-details').then(m => m.ProductDetails) },
      { path: 'prices',    title: 'Precios | Admin', loadComponent: () => import('./pages/admin/prices/prices.component').then(m => m.PricesComponent) },
      { path: 'dashboard', title: 'Dashboard | Admin', loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
    ]
  },
  {
    path: 'member',
    canActivate: [authGuard, memberGuard],
    children: [
      {
        path: 'dashboard',
        title: 'Mi Perfil | Fitness Gym',
        loadComponent: () =>
          import('./pages/member/dashboard/dashboard.component')
            .then(m => m.MemberDashboardComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  {
    path: 'reset-password',
    title: 'Restablecer Contraseña | Fitness Gym',
    loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  { path: '**', redirectTo: '' }
];

