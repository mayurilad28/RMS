import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Route guard that redirects unauthenticated users to /login,
 * preserving where they were trying to go via ?returnUrl=.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
