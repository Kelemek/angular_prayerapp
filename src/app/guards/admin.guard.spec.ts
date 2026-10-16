import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';

// Define mock types to avoid importing Router/AdminAuthService
type MockRouter = { 
  navigate: ReturnType<typeof vi.fn>,
  createUrlTree: ReturnType<typeof vi.fn>
};
type MockAdminAuthService = {
  isAdmin$: BehaviorSubject<boolean>;
  loading$: BehaviorSubject<boolean>;
  isAuthenticated$: BehaviorSubject<boolean>;
  adminEligibilityResolved$: BehaviorSubject<boolean>;
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
    createUrlTree = vi.fn();
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
    // Use fake timers for tests
    vi.useFakeTimers();

    // Create mock services
    mockAdminAuthService = {
      isAdmin$: new BehaviorSubject<boolean>(false),
      loading$: new BehaviorSubject<boolean>(true),
      isAuthenticated$: new BehaviorSubject<boolean>(false),
      adminEligibilityResolved$: new BehaviorSubject<boolean>(true),
    };

    mockRouter = {
      navigate: vi.fn(),
      createUrlTree: vi.fn((commands, extras) => {
        // Return a mock UrlTree object that evaluates to true in boolean context
        return { _commands: commands, _extras: extras } as any;
      }),
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
    vi.useRealTimers();
    vi.clearAllMocks();
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

    // Mock the route and state
    const route = { component: {} };
    const state = { url: '/admin' };

    const guard$ = adminGuard(route as any, state as any);

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    // Set loading to false and isAdmin to false
    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAdmin$.next(false);

    const result = await firstValueFrom(guard$);
    // Should return a UrlTree (redirect to login with returnUrl)
    expect(result).toBeDefined();
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin' }
    });
  });

  it('should skip values while loading is true', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const route = { component: {} };
    const state = { url: '/admin' };
    const guard$ = adminGuard(route as any, state as any);

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
    // Should return a UrlTree (redirect to login)
    expect(result).toBeDefined();
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin' }
    });
  });

  it('should check admin status normally with URL parameters', async () => {
    window.location.search = '?code=test-code&other=param';
    mockAdminAuthService.isAdmin$.next(false);
    mockAdminAuthService.loading$.next(false);

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const route = { component: {} };
    const state = { url: '/admin' };
    const guard$ = adminGuard(route as any, state as any);

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    const result = await firstValueFrom(guard$);

    // Should check admin status normally (not bypass due to code)
    expect(result).toBeDefined();
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin' }
    });
  });

  it('should handle empty search params (no approval code)', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const route = { component: {} };
    const state = { url: '/admin' };
    const guard$ = adminGuard(route as any, state as any);

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

    const route = { component: {} };
    const state = { url: '/admin' };
    const guard$ = adminGuard(route as any, state as any);

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAdmin$.next(false);

    const result = await firstValueFrom(guard$);
    expect(result).toBeDefined();
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin' }
    });
  });

  it('should handle timeout error from loading state', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const route = { component: {} };
    const state = { url: '/admin' };
    const guard$ = adminGuard(route as any, state as any);

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    // Don't set loading to false - let the timeout trigger (5 seconds)
    // This will trigger the catchError handler
    const resultPromise = firstValueFrom(guard$);

    // Advance timers to trigger the timeout
    await vi.advanceTimersByTimeAsync(5100);

    const result = await resultPromise;
    // Should return UrlTree redirecting to login
    expect(result).toBeDefined();
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin' }
    });
  });

  it('should handle error in combineLatest operator', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const route = { component: {} };
    const state = { url: '/admin' };
    const guard$ = adminGuard(route as any, state as any);

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    // Make loading$ emit an error
    const resultPromise = firstValueFrom(guard$);

    // Emit an error from loading$
    mockAdminAuthService.loading$.error(new Error('Test error'));

    try {
      await resultPromise;
    } catch (err) {
      // Error expected
    }

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin' }
    });
  });

  it('should return false on catchError', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const route = { component: {} };
    const state = { url: '/admin' };
    const guard$ = adminGuard(route as any, state as any);

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    // Simulate a timeout by letting the 5s timer expire
    // The catchError will handle it and createUrlTree to redirect to /login
    const resultPromise = firstValueFrom(guard$);

    // Advance timers to trigger timeout
    await vi.advanceTimersByTimeAsync(5100);

    const result = await resultPromise;
    expect(result).toBeDefined();
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin' }
    });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should handle multiple isAdmin emissions while loading', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = adminGuard();

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    const resultPromise = firstValueFrom(guard$);

    // Emit multiple values while loading is true
    mockAdminAuthService.isAdmin$.next(true);
    mockAdminAuthService.isAdmin$.next(false);
    mockAdminAuthService.isAdmin$.next(true);

    // Now complete loading - should use the final isAdmin value
    mockAdminAuthService.loading$.next(false);

    const result = await resultPromise;
    expect(result).toBe(true);
  });

  it('should wait for admin eligibility when signed in before denying access', async () => {
    window.location.search = '';

    vi.resetModules();
    const { adminGuard } = await import('./admin.guard');
    const { firstValueFrom } = await import('rxjs');

    const route = { component: {} };
    const state = { url: '/admin/email-subscribers' };
    const guard$ = adminGuard(route as any, state as any);

    if (typeof guard$ === 'boolean') {
      throw new Error('Guard should return an Observable');
    }

    const resultPromise = firstValueFrom(guard$);

    mockAdminAuthService.isAuthenticated$.next(true);
    mockAdminAuthService.adminEligibilityResolved$.next(false);
    mockAdminAuthService.isAdmin$.next(false);
    mockAdminAuthService.loading$.next(false);

    await Promise.resolve();
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();

    mockAdminAuthService.isAdmin$.next(true);
    mockAdminAuthService.adminEligibilityResolved$.next(true);

    const result = await resultPromise;
    expect(result).toBe(true);
  });

  it('should handle admin status change after loading completes', async () => {
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

    // Verify that the router.navigate was NOT called for allowed access
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
