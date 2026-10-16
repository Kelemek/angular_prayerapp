import { BehaviorSubject, of } from 'rxjs';
import type { AdminAuthService } from '../services/admin-auth.service';
import type { SupabaseDataAccessGateService } from '../services/supabase-data-access-gate.service';

export function createLoggedOutAdminAuthStub(): AdminAuthService {
  const isAuthenticated$ = new BehaviorSubject(false);
  return {
    isUserAuthenticated: () => isAuthenticated$.value,
    isAuthenticated$,
    waitForDataAccessReady: async () => {},
    dataAccessReady$: of(true),
  } as unknown as AdminAuthService;
}

/** Manual `new PrayerService(...)` specs without AdminAuth — behave like signed-in for catalog loads. */
export function createPrayerServiceTestAdminAuthStub(): AdminAuthService {
  const isAuthenticated$ = new BehaviorSubject(true);
  return {
    isUserAuthenticated: () => isAuthenticated$.value,
    isAuthenticated$,
    waitForDataAccessReady: async () => {},
    dataAccessReady$: of(true),
  } as unknown as AdminAuthService;
}

export function createDataAccessGateStub(
  ready = true
): SupabaseDataAccessGateService {
  return {
    waitForReady: async () => {},
    ready$: of(ready),
    isReady: ready,
    syncAuthenticated: async () => {},
    refresh: async () => {},
    registerTimeoutHandler: () => {},
    bindAuthenticatedStream: () => {},
  } as unknown as SupabaseDataAccessGateService;
}
