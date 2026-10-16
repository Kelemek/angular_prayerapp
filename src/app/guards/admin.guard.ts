import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { map, skipWhile, timeout, catchError } from 'rxjs/operators';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const adminAuthService = inject(AdminAuthService);
  const router = inject(Router);

  // Wait for loading and (when signed in) admin eligibility before deciding
  return combineLatest([
    adminAuthService.isAdmin$,
    adminAuthService.loading$,
    adminAuthService.isAuthenticated$,
    adminAuthService.adminEligibilityResolved$,
  ]).pipe(
    skipWhile(
      ([, isLoading, isAuthenticated, eligibilityResolved]) =>
        isLoading || (isAuthenticated && !eligibilityResolved)
    ),
    // Fail-fast if loading never resolves
    timeout(5000),
    // Check admin status
    map(([isAdmin]) => {
      if (!isAdmin) {
        // Preserve the original URL in returnUrl so user returns after login
        return router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url }
        });
      }
      return true;
    }),
    catchError(err => {
      console.error('[adminGuard] timeout or error waiting for admin state:', err);
      // On timeout or error, navigate to login with returnUrl
      return of(router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      }));
    })
  );
};
