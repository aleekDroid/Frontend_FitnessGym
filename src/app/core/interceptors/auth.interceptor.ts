// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notify    = inject(NotificationService);
  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const hasSession = !!authService.getToken() || !!localStorage.getItem('fg_user');

      if (
        error.status === 401 && 
        hasSession &&
        !req.url.includes('/auth/login') && 
        !req.url.includes('/auth/refresh-access-token')
      ) {
        return authService.refreshToken().pipe(
          switchMap((res) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` }
            });
            return next(retryReq);
          }),
          catchError((refreshErr: HttpErrorResponse) => {
            // Only logout on 401 (RT truly invalid/expired).
            // On 429 (throttled) or network errors, session is still valid — don't kick the user out.
            if (refreshErr.status === 401) {
              authService.logout();
            }
            return throwError(() => refreshErr);
          })
        );
      }

      // ── User-facing error messages (skip internal auth endpoints) ──────────
      const isAuthEndpoint = req.url.includes('/auth/login') ||
                             req.url.includes('/auth/refresh-access-token') ||
                             req.url.includes('/auth/logout');
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