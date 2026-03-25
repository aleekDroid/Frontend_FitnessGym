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
      const currentToken = authService.getToken();

      // 1. If we have a token and it's NOT expired, we are good to go.
      if (currentToken && !authService.isTokenExpired(currentToken)) {
        return Promise.resolve();
      }

      // 2. If we have no token (or it's expired) but we have the user marker,
      // attempt a silent refresh using the RT cookie.
      if (userStr) {
        return firstValueFrom(
          authService.refreshToken().pipe(
            catchError((err: HttpErrorResponse) => {
              if (err.status === 401) {
                localStorage.removeItem('fg_user');
                localStorage.removeItem('fg_token');
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

