import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { presentationAccessGuard } from './presentation-access.guard';

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

function routeWithHomeTypes(homeTypes: string | null) {
  return {
    queryParamMap: {
      get: (key: string) => (key === 'homeTypes' ? homeTypes : null),
    },
  } as never;
}

describe('presentationAccessGuard', () => {
  beforeEach(() => {
    mockRouter = {
      createUrlTree: vi.fn((commands: unknown[], extras?: { queryParams?: unknown }) => ({
        commands,
        queryParams: extras?.queryParams ?? {},
      })),
    };
    mockSession = {
      sessionInitialized$: new BehaviorSubject(true),
      userSession$: new BehaviorSubject<{
        isChurchMember?: boolean;
        prayerGroupsEnabled?: boolean;
      } | null>({ isChurchMember: true }),
    };
  });

  it('allows church members on church presentation types', async () => {
    const result = await firstValueFrom(
      presentationAccessGuard(routeWithHomeTypes('prayers'), {} as never)
    );
    expect(result).toBe(true);
  });

  it('keeps group-only users on a groups presentation handoff', async () => {
    mockSession.userSession$.next({
      isChurchMember: false,
      prayerGroupsEnabled: true,
    });
    const result = await firstValueFrom(
      presentationAccessGuard(routeWithHomeTypes('groups'), {} as never)
    );
    expect(result).toBe(true);
  });

  it('redirects group-only users away from church presentation types', async () => {
    mockSession.userSession$.next({
      isChurchMember: false,
      prayerGroupsEnabled: true,
    });
    const result = await firstValueFrom(
      presentationAccessGuard(routeWithHomeTypes('prayers'), {} as never)
    );
    expect(result).not.toBe(true);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/'], {
      queryParams: { filter: 'groups' },
    });
  });
});
