import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
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

  return adminAuthService.isAdmin$.pipe(
    map(isAdmin => {
      if (!isAdmin) {
        router.navigate(['/admin-login']);
        return false;
      }
      return true;
    })
  );
};
