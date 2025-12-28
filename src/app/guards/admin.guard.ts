import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { map, skipWhile, timeout, catchError } from 'rxjs/operators';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminGuard = () => {
  const adminAuthService = inject(AdminAuthService);
  const router = inject(Router);

  // Check for approval code in URL before checking isAdmin
  const params = new URLSearchParams(window.location.search);
  const hasApprovalCode = params.has('code');
  
  // If there's an approval code, let the app component handle it
  if (hasApprovalCode) {
    return true;
  }

  // Wait for loading to complete, then check admin status
  return combineLatest([
    adminAuthService.isAdmin$,
    adminAuthService.loading$
  ]).pipe(
    // Skip while loading
    skipWhile(([_, isLoading]) => isLoading),
    // Fail-fast if loading never resolves
    timeout(5000),
    // Check admin status
    map(([isAdmin]) => {
      if (!isAdmin) {
        router.navigate(['/login']);
        return false;
      }
      return true;
    }),
    catchError(err => {
      console.error('[adminGuard] timeout or error waiting for admin state:', err);
      // On timeout or error, navigate to login to avoid hanging the router
      router.navigate(['/login']);
      return of(false);
    })
  );
};
