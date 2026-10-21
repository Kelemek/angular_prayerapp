import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import {
  permittedPresentationTypesForSession,
  presentationTypesFromQuery,
} from '../lib/church-member-access';
import { UserSessionService } from '../services/user-session.service';

export const presentationAccessGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const session = inject(UserSessionService);
  return combineLatest([
    session.sessionInitialized$,
    session.userSession$,
  ]).pipe(
    filter(([ready]) => ready),
    take(1),
    map(([, row]) => {
      const requested = presentationTypesFromQuery((key) =>
        route.queryParamMap.get(key)
      );
      const access = permittedPresentationTypesForSession(row ?? {}, requested);
      if (access.kind === 'redirect') {
        return router.createUrlTree(access.redirect.commands, {
          queryParams: access.redirect.queryParams,
        });
      }
      return true;
    })
  );
};
