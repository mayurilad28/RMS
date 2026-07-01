import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth.service';

/**
 * On app start, if we already have a saved token, ping /api/auth/me to
 * confirm it is still valid. This way a stale token doesn't survive a
 * server-side revocation, and the topbar shows the correct state on
 * first paint.
 */
function bootstrapAuth() {
  const auth = inject(AuthService);
  return () => firstValueFrom(auth.verifyToken()).catch(() => null);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: bootstrapAuth,
      multi: true,
    },
  ],
};
