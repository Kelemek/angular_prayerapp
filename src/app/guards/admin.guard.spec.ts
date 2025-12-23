import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';

// Define mock types to avoid importing Router/AdminAuthService
type MockRouter = { navigate: ReturnType<typeof vi.fn> };
type MockAdminAuthService = {
  isAdmin$: BehaviorSubject<boolean>;
  loading$: BehaviorSubject<boolean>;
};

let mockAdminAuthService: MockAdminAuthService;
let mockRouter: MockRouter;
let originalLocation: Location;

// Mock @angular/core inject function
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<typeof import('@angular/core')>('@angular/core');
  return {
    ...actual,
    inject: (token: any) => {
      const tokenName = token?.name || String(token);
      if (tokenName === 'Router') {
        return mockRouter;
      }
      if (tokenName === 'AdminAuthService') {
        return mockAdminAuthService;
      }
      return null;
    },
  };
});

// Mock the router module to avoid JIT compilation issues
vi.mock('@angular/router', () => ({
  Router: class Router {
    navigate = vi.fn();
  },
}));

// Mock combineLatest and operators from rxjs
vi.mock('rxjs', async () => {
  const actual = await vi.importActual<typeof import('rxjs')>('rxjs');
  return {
    ...actual,
    combineLatest: actual.combineLatest,
  };
});

vi.mock('rxjs/operators', async () => {
  const actual = await vi.importActual<typeof import('rxjs/operators')>('rxjs/operators');
  return {
    ...actual,
    map: actual.map,
    skipWhile: actual.skipWhile,
  };
});

describe('adminGuard', () => {
  beforeEach(async () => {
    // Create mock services
    mockAdminAuthService = {
      isAdmin$: new BehaviorSubject<boolean>(false),
      loading$: new BehaviorSubject<boolean>(true),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    // Save original location
    originalLocation = window.location;

    // Mock window.location
    delete (window as any).location;
    window.location = { 
      search: '',
      href: '',
      origin: '',
      protocol: '',
      host: '',
      hostname: '',
      port: '',
      pathname: '',
      hash: '',
      ancestorOrigins: {} as any,
      assign: vi.fn(),
      reload: vi.fn(),
      replace: vi.fn(),
    } as Location;
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
    vi.clearAllMocks();
  });

  it('should allow access when approval code is present in URL', async () => {
    window.location.search = '?code=approval-code-123';

    // Re-import the guard to pick up the new mocks
    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');

    const result = adminGuard();

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should allow access when user is admin after loading completes', async () => {
    window.location.search = '';

    // Re-import the guard
    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = adminGuard();

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    // Set loading to false and isAdmin to true
    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAdmin$.next(true);

    const result = await firstValueFrom(guard$);
    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect to login when user is not admin', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = adminGuard();

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    // Set loading to false and isAdmin to false
    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAdmin$.next(false);

    const result = await firstValueFrom(guard$);
    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should skip values while loading is true', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = adminGuard();

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    // Start collecting results
    const resultPromise = firstValueFrom(guard$);

    // Emit values while loading is still true - should be skipped
    mockAdminAuthService.isAdmin$.next(false);
    mockAdminAuthService.isAdmin$.next(true);
    mockAdminAuthService.isAdmin$.next(false);

    // Now set loading to false - this should trigger the guard
    mockAdminAuthService.loading$.next(false);

    const result = await resultPromise;
    // Should emit the current isAdmin value (false) once loading is complete
    expect(result).toBe(false);
    expect(mockAdminAuthService.loading$.value).toBe(false);
  });

  it('should handle URL with approval code even when user is not admin', async () => {
    window.location.search = '?code=test-code&other=param';
    mockAdminAuthService.isAdmin$.next(false);
    mockAdminAuthService.loading$.next(false);

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');

    const result = adminGuard();

    // Should return true immediately due to approval code
    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should handle empty search params (no approval code)', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = adminGuard();

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAdmin$.next(true);

    const result = await firstValueFrom(guard$);
    expect(result).toBe(true);
  });

  it('should handle URL params without code parameter', async () => {
    window.location.search = '?other=param&another=value';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = adminGuard();

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAdmin$.next(false);

    const result = await firstValueFrom(guard$);
    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
