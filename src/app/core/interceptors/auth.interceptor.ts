// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notify      = inject(NotificationService);
  const token       = authService.getToken();
  const isAuthEndpoint = req.url.includes('/auth/');

  // ── Refresh proactivo: token expirado ANTES de enviar la request ───────────
  // Evita mandar una request condenada a fallar con 401 — hace el refresh
  // primero y reintenta con el token nuevo. Usa ensureValidSession() para que
  // si hay múltiples requests concurrentes, solo se haga UN refresh.
  if (token && authService.isTokenExpired(token) && !isAuthEndpoint) {
    return authService.ensureValidSession().pipe(
      switchMap(ok => {
        if (!ok) {
          authService.logout();
          return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
        }
        const freshToken = authService.getToken();
        const retryReq = req.clone({
          setHeaders: { Authorization: `Bearer ${freshToken}` }
        });
        return next(retryReq);
      })
    );
  }

  // ── Adjuntar token vigente al header ─────────────────────────────────────
  let authReq = req;
  if (token && !authService.isTokenExpired(token)) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const hasSession = !!authService.getToken() || !!localStorage.getItem('fg_user');

      // ── Refresh reactivo: 401 inesperado (ej. token invalidado en servidor) ─
      if (
        error.status === 401 &&
        hasSession &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh-access-token')
      ) {
        return authService.ensureValidSession().pipe(
          switchMap(ok => {
            if (!ok) {
              authService.logout();
              return throwError(() => error);
            }
            const freshToken = authService.getToken();
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${freshToken}` }
            });
            return next(retryReq);
          }),
          catchError((refreshErr: HttpErrorResponse) => {
            // Solo desloguear en 401 real (RT inválido/expirado).
            // En 429 o errores de red la sesión sigue vigente, no expulsar al usuario.
            if (refreshErr.status === 401) {
              authService.logout();
            }
            return throwError(() => refreshErr);
          })
        );
      }

      // ── Mensajes de error para el usuario (saltar endpoints internos de auth) ─
      if (!isAuthEndpoint) {
        if (error.status === 429) {
          notify.show('Demasiadas solicitudes. Espera un momento antes de continuar.', 'warning', 6000);
        } else if (error.status === 0) {
          notify.show('Sin conexión. Revisa tu red e intenta de nuevo.', 'error');
        } else if (error.status >= 500) {
          notify.show('Error en el servidor. Intenta de nuevo más tarde.', 'error');
        }
      }

      return throwError(() => error);
    })
  );
};