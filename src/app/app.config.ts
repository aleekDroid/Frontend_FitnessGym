// src/app/app.config.ts
import { ApplicationConfig, provideAppInitializer, inject, LOCALE_ID } from '@angular/core'; // LOCALE_ID is used in providers below
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors,HttpErrorResponse } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { catchError, of, firstValueFrom } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';

registerLocaleData(localeEsMx);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-MX' },
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      const userStr = localStorage.getItem('fg_user');
      // User marker exists but no in-memory token → attempt silent refresh using the RT cookie
      if (userStr && !authService.getToken()) {
        return firstValueFrom(
          authService.refreshToken().pipe(
            catchError((err: HttpErrorResponse) => {
              // Only wipe session marker when RT is truly invalid (401).
              // On 429 (rate-limited), the RT is still valid — keep marker so
              // the next load can retry and recover the session automatically.
              if (err.status === 401) {
                localStorage.removeItem('fg_user');
              }
              return of(null);
            })
          )
        );
      }
      return Promise.resolve();
    }),
  ]
};

