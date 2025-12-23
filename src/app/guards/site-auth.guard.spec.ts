import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';

// Define mock types to avoid importing Router/AdminAuthService
type MockRouter = {
  createUrlTree: ReturnType<typeof vi.fn>;
};
type MockAdminAuthService = {
  isAuthenticated$: BehaviorSubject<boolean>;
  loading$: BehaviorSubject<boolean>;
};
type MockUrlTree = {
  toString: () => string;
  queryParams: any;
  fragment: any;
};

let mockAdminAuthService: MockAdminAuthService;
let mockRouter: MockRouter;
let mockRoute: any;
let mockState: any;

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

describe('siteAuthGuard', () => {
  beforeEach(() => {
    // Create mock services
    mockAdminAuthService = {
      isAuthenticated$: new BehaviorSubject<boolean>(false),
      loading$: new BehaviorSubject<boolean>(true),
    };

    mockRouter = {
      createUrlTree: vi.fn((commands: any[], extras?: any) => {
        // Return a mock UrlTree-like object
        return {
          toString: () => commands.join('/'),
          queryParams: extras?.queryParams || {},
          fragment: extras?.fragment || null,
        } as MockUrlTree;
      }),
    };

    mockRoute = {};
    mockState = { url: '/admin' };

    // Mock console.log to prevent noise in test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should allow access when user is authenticated', async () => {
    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    // Set loading to false and isAuthenticated to true
    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(true);

    const result = await firstValueFrom(guard$);
    expect(result).toBe(true);
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', async () => {
    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    // Set loading to false and isAuthenticated to false
    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(false);

    const result = await firstValueFrom(guard$);
    expect(result).not.toBe(true);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { returnUrl: '/admin' } }
    );
  });

  it('should skip values while loading is true', async () => {
    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    // Start collecting results
    const resultPromise = firstValueFrom(guard$);

    // Emit values while loading is still true - should be skipped
    mockAdminAuthService.isAuthenticated$.next(false);
    mockAdminAuthService.isAuthenticated$.next(true);
    mockAdminAuthService.isAuthenticated$.next(false);

    // Now set loading to false - this should trigger the guard
    mockAdminAuthService.loading$.next(false);

    const result = await resultPromise;
    // Should only emit once loading is complete
    expect(mockAdminAuthService.loading$.value).toBe(false);
  });

  it('should preserve returnUrl in query params when redirecting', async () => {
    mockState.url = '/some/protected/path';

    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(false);

    await firstValueFrom(guard$);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { returnUrl: '/some/protected/path' } }
    );
  });

  it('should log access denial message when redirecting', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(false);

    await firstValueFrom(guard$);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[SiteAuthGuard] Access denied - redirecting to login'
    );
  });

  it('should handle authentication status change from false to true', async () => {
    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    // Initially set as not authenticated
    mockAdminAuthService.isAuthenticated$.next(false);
    mockAdminAuthService.loading$.next(false);

    const result = await firstValueFrom(guard$);
    // First emission should be a redirect
    expect(result).not.toBe(true);
    expect(mockRouter.createUrlTree).toHaveBeenCalled();
  });

  it('should handle root path URL', async () => {
    mockState.url = '/';

    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(false);

    await firstValueFrom(guard$);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { returnUrl: '/' } }
    );
  });

  it('should handle URL with query parameters', async () => {
    mockState.url = '/admin?tab=settings&view=details';

    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(false);

    await firstValueFrom(guard$);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { returnUrl: '/admin?tab=settings&view=details' } }
    );
  });

  it('should return true immediately when already authenticated', async () => {
    // Start with authenticated state
    mockAdminAuthService.isAuthenticated$.next(true);
    mockAdminAuthService.loading$.next(false);

    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    const result = await firstValueFrom(guard$);
    expect(result).toBe(true);
    expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
  });

  it('should handle empty state URL', async () => {
    mockState.url = '';

    vi.resetModules();
    const { siteAuthGuard } = await import('./site-auth.guard');
    const { firstValueFrom } = await import('rxjs');

    const guard$ = siteAuthGuard(mockRoute, mockState);

    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(false);

    await firstValueFrom(guard$);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { returnUrl: '' } }
    );
  });
});
