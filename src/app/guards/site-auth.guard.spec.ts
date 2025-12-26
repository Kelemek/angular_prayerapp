import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { siteAuthGuard } from './site-auth.guard';

// Define mock types
type MockRouter = {
  createUrlTree: ReturnType<typeof vi.fn>;
};
type MockAdminAuthService = {
  isAuthenticated$: BehaviorSubject<boolean>;
  loading$: BehaviorSubject<boolean>;
  checkBlockedStatusInBackground: ReturnType<typeof vi.fn>;
};

let mockAdminAuthService: MockAdminAuthService;
let mockRouter: MockRouter;
let mockRoute: any;
let mockState: any;

// Create module-level mocks
mockAdminAuthService = {
  isAuthenticated$: new BehaviorSubject<boolean>(false),
  loading$: new BehaviorSubject<boolean>(true),
  checkBlockedStatusInBackground: vi.fn(),
};

mockRouter = {
  createUrlTree: vi.fn((commands: any[], extras?: any) => ({
    toString: () => commands.join('/'),
    queryParams: extras?.queryParams || {},
    fragment: extras?.fragment || null,
  })),
};

// Mock Angular core inject
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<typeof import('@angular/core')>('@angular/core');
  return {
    ...actual,
    inject: (token: any) => {
      const tokenName = token?.name || String(token);
      if (tokenName === 'Router') return mockRouter;
      if (tokenName === 'AdminAuthService') return mockAdminAuthService;
      return null;
    },
  };
});

describe('siteAuthGuard', () => {
  beforeEach(() => {
    // Reset mocks
    mockAdminAuthService.isAuthenticated$.next(false);
    mockAdminAuthService.loading$.next(true);
    vi.clearAllMocks();
    
    mockRoute = {};
    mockState = { url: '/admin' };
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should allow access when user is authenticated', async () => {
    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(true);

    const guard$ = siteAuthGuard(mockRoute, mockState);
    const result = await firstValueFrom(guard$);
    
    expect(result).toBe(true);
    expect(mockAdminAuthService.checkBlockedStatusInBackground).toHaveBeenCalledWith('/admin');
  });

  it('should redirect to login when user is not authenticated', async () => {
    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(false);

    const guard$ = siteAuthGuard(mockRoute, mockState);
    const result = await firstValueFrom(guard$);
    
    expect(result).not.toBe(true);
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { returnUrl: '/admin' } }
    );
  });

  it('should skip values while loading is true', async () => {
    const guard$ = siteAuthGuard(mockRoute, mockState);
    const resultPromise = firstValueFrom(guard$);

    // These emissions should be skipped while loading is true
    mockAdminAuthService.isAuthenticated$.next(true);
    mockAdminAuthService.isAuthenticated$.next(false);

    // This should trigger the guard with authenticated state
    mockAdminAuthService.isAuthenticated$.next(true);
    mockAdminAuthService.loading$.next(false);

    const result = await resultPromise;
    expect(result).toBe(true);
    expect(mockAdminAuthService.checkBlockedStatusInBackground).toHaveBeenCalled();
  });

  it('should preserve returnUrl in query params', async () => {
    mockState.url = '/some/path';
    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(false);

    const guard$ = siteAuthGuard(mockRoute, mockState);
    await firstValueFrom(guard$);
    
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { returnUrl: '/some/path' } }
    );
  });

  it('should log access denial message', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    mockAdminAuthService.loading$.next(false);
    mockAdminAuthService.isAuthenticated$.next(false);

    const guard$ = siteAuthGuard(mockRoute, mockState);
    await firstValueFrom(guard$);
    
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[SiteAuthGuard] Access denied - redirecting to login'
    );
  });
});
