import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from '../services/user-session.service';
import { filter, map, take } from 'rxjs/operators';

/** Presentation is church data. Group-only subscribers stay on Home. */
export const churchMemberGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(UserSessionService);
  return session.userSession$.pipe(
    filter((row): row is NonNullable<typeof row> => row !== null),
    take(1),
    map((row) => (row.isChurchMember === false ? router.createUrlTree(['/']) : true)),
  );
};
