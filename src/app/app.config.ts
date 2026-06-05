// src/app/app.config.ts
import { ApplicationConfig, provideAppInitializer, inject, LOCALE_ID } from '@angular/core'; // LOCALE_ID is used in providers below
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
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
      const currentToken = authService.getToken();

      // Si el token aún es válido, listo — no hacer nada extra al iniciar
      if (currentToken && !authService.isTokenExpired(currentToken)) {
        return Promise.resolve();
      }

      // Token expirado o inexistente: intentar refresh silencioso con la cookie RT.
      // No depende de localStorage — solo de la cookie httpOnly del browser (7 días).
      return firstValueFrom(
        authService.ensureValidSession().pipe(catchError(() => of(null)))
      );
    }),

  ]
};

