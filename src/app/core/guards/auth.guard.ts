// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Intenta refresh silencioso si el accessToken está expirado,
 * antes de redirigir al login. Permite que la cookie del RT (7 días)
 * mantenga la sesión activa aunque el accessToken (15min) haya vencido.
 */
async function trySessionOrRedirect(
  auth: AuthService,
  router: Router,
  extraCheck?: () => boolean,
): Promise<boolean> {
  // Token válido y (si hay) extra check (ej. isAdmin) — acceso inmediato
  if (auth.isLoggedIn() && (!extraCheck || extraCheck())) return true;

  // Si el token expiró, intentar refresh silencioso con la cookie httpOnly
  const ok = await firstValueFrom(auth.ensureValidSession());

  if (ok && (!extraCheck || extraCheck())) return true;

  router.navigate(['/login']);
  return false;
}

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return trySessionOrRedirect(auth, router);
};

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return trySessionOrRedirect(auth, router, () => auth.isAdmin());
};

export const memberGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return trySessionOrRedirect(auth, router, () => auth.currentUser()?.role === 'member');
};

export const publicGuard: CanActivateFn = async () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Si no hay sesión activa ni posible refresh, mostrar página pública
  let loggedIn = auth.isLoggedIn();
  if (!loggedIn) {
    loggedIn = await firstValueFrom(auth.ensureValidSession());
  }

  if (!loggedIn) return true;

  // Ya tiene sesión — redirigir al área correcta
  if (auth.isAdmin()) {
    router.navigate(['/admin/home']);
  } else if (auth.currentUser()?.role === 'member') {
    router.navigate(['/member/dashboard']);
  } else {
    router.navigate(['/login']);
  }
  return false;
};

