import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { churchMemberGuard } from './church-member.guard';

type MockRouter = {
  createUrlTree: ReturnType<typeof vi.fn>;
};
type MockSession = {
  sessionInitialized$: BehaviorSubject<boolean>;
  userSession$: BehaviorSubject<{
    isChurchMember?: boolean;
    prayerGroupsEnabled?: boolean;
  } | null>;
};

let mockRouter: MockRouter;
let mockSession: MockSession;

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<typeof import('@angular/core')>('@angular/core');
  return {
    ...actual,
    inject: (token: { name?: string }) => {
      const tokenName = token?.name || String(token);
      if (tokenName === 'Router') return mockRouter;
      if (tokenName === 'UserSessionService') return mockSession;
      return null;
    },
  };
});

describe('churchMemberGuard', () => {
  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn((commands: unknown[], extras?: { queryParams?: unknown }) => ({
        commands,
        queryParams: extras?.queryParams ?? {},
      })),
    };
    mockSession = {
      sessionInitialized$: new BehaviorSubject(false),
      userSession$: new BehaviorSubject<{
        isChurchMember?: boolean;
        prayerGroupsEnabled?: boolean;
      } | null>(null),
    };
  });

  it('allows church members after session init', async () => {
    mockSession.userSession$.next({ isChurchMember: true });
    mockSession.sessionInitialized$.next(true);

    const result = await firstValueFrom(churchMemberGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('waits for session init instead of trusting a cached group-only row', async () => {
    mockSession.userSession$.next({
      isChurchMember: false,
      prayerGroupsEnabled: true,
    });

    const pending = firstValueFrom(churchMemberGuard({} as never, {} as never));
    mockSession.sessionInitialized$.next(true);
    const result = await pending;

    expect(result).not.toBe(true);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/'], {
      queryParams: { filter: 'groups' },
    });
  });
});
