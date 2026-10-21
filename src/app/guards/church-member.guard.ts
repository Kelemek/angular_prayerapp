import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { groupOnlyHomeRedirect } from '../lib/church-member-access';
import { UserSessionService } from '../services/user-session.service';

/** Church-only routes wait for the live session, then send group-only users home. */
export const churchMemberGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = inject(UserSessionService);
  return combineLatest([
    session.sessionInitialized$,
    session.userSession$,
  ]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([, row]) => {
      if (row?.isChurchMember !== false) {
        return true;
      }
      const redirect = groupOnlyHomeRedirect(row ?? {});
      return router.createUrlTree(redirect.commands, {
        queryParams: redirect.queryParams,
      });
    }),
  );
};
