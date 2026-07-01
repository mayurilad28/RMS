import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// In dev this is `http://localhost:5000`; in prod it is `''` because
// the API is same-origin (served from `/api/*` on the Vercel deploy).
const API_ORIGIN = environment.apiBase;

/**
 * Functional HTTP interceptor.
 *
 * On every request to our API:
 *   - attach the JWT as `Authorization: Bearer <token>` if we have one
 *
 * On every response:
 *   - if the server replies 401 (token missing / invalid / expired),
 *     clear the session and bounce the user to /login.
 *
 * We deliberately skip non-API requests so an interceptor mishap can't
 * break, e.g., static asset loads.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Only attach the token to our own API calls, never to third-party
  // requests. `API_ORIGIN` is empty in prod (same-origin), so guard
  // against `startsWith('')` being trivially true.
  const isApi =
    req.url.startsWith('/api/') ||
    (API_ORIGIN !== '' && req.url.startsWith(API_ORIGIN));

  let outgoing = req;
  const token = auth.getToken();
  if (isApi && token) {
    outgoing = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isApi && err.status === 401 && auth.getToken()) {
        // Token went stale — drop the session and send the user to login.
        auth.clearSession();
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url },
        });
      }
      return throwError(() => err);
    })
  );
};
