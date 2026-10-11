import { BehaviorSubject } from 'rxjs';
import type { UserSessionData } from '../services/user-session.service';

/** Minimal `UserSessionService` stub for component tests that subscribe to `userSession$`. */
export function provideUserSessionTestMock(
  initial: UserSessionData | null = null
) {
  return {
    userSession$: new BehaviorSubject<UserSessionData | null>(initial),
  };
}
