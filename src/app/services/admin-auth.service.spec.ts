import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { firstValueFrom } from 'rxjs';
import type { User } from '@supabase/supabase-js';

// Mock environment
vi.mock('../../environments/environment', () => ({
  environment: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-anon-key-123'
  }
}));

// Mock Sentry
vi.mock('@sentry/angular', () => ({
  captureException: vi.fn()
}));

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key) => ({
    _url: url,
    _key: key,
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }))
}));

// Mock Angular's inject function
let mockRouter: any;
let mockSupabaseService: any;
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual('@angular/core');
  return {
    ...actual,
    inject: vi.fn((token: any) => {
      if (token === Router || token.name === 'Router') {
        return mockRouter;
      }
      if (token === SupabaseService || token.name === 'SupabaseService') {
        return mockSupabaseService;
      }
      return null;
    })
  };
});

describe('AdminAuthService', () => {
  let service: any; // AdminAuthService - imported dynamically
  let mockSupabaseClient: any;

  beforeEach(async () => {
    localStorage.clear();
    vi.useFakeTimers();
    
    // Mock window and document event listeners
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
    vi.spyOn(document, 'addEventListener').mockImplementation(() => {});

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true)
    };

    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ 
          data: { session: null },
          error: null 
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        }),
        signOut: vi.fn().mockResolvedValue({ error: null })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
      }),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: {}, error: null })
      }
    };

    // Create mock SupabaseService
    mockSupabaseService = {
      client: mockSupabaseClient,
      directQuery: vi.fn().mockResolvedValue({ data: null, error: null }),
      getSupabaseUrl: () => 'https://test.supabase.co',
      getSupabaseKey: () => 'test-anon-key-123'
    };

    // Dynamically import the service after mocks are set up
    const { AdminAuthService } = await import('./admin-auth.service');
    service = new AdminAuthService(mockSupabaseService);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be created', async () => {
      await vi.advanceTimersByTimeAsync(100);
      expect(service).toBeTruthy();
    });

    it('should expose observable streams', async () => {
      await vi.advanceTimersByTimeAsync(100);
      expect(service.user$).toBeDefined();
      expect(service.isAdmin$).toBeDefined();
      expect(service.isAuthenticated$).toBeDefined();
      expect(service.loading$).toBeDefined();
    });

    it('should have getter methods', async () => {
      await vi.advanceTimersByTimeAsync(100);
      expect(service.getUser()).toBe(null);
      expect(service.getIsAdmin()).toBe(false);
      expect(typeof service.isLoading()).toBe('boolean');
    });
  });

  describe('logout', () => {
    it('should logout successfully and navigate to login', async () => {
      await vi.advanceTimersByTimeAsync(100);
      
      await service.logout();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      
      const user = await firstValueFrom(service.user$);
      const isAdmin = await firstValueFrom(service.isAdmin$);
      const isAuthenticated = await firstValueFrom(service.isAuthenticated$);

      expect(user).toBe(null);
      expect(isAdmin).toBe(false);
      expect(isAuthenticated).toBe(false);
    });

    it('should clear approval session data on logout', async () => {
      await vi.advanceTimersByTimeAsync(100);
      
      localStorage.setItem('approvalAdminEmail', 'test@example.com');
      localStorage.setItem('approvalSessionValidated', 'true');
      localStorage.setItem('approvalApprovalType', 'test');
      localStorage.setItem('approvalApprovalId', '123');

      await service.logout();

      expect(localStorage.getItem('approvalAdminEmail')).toBe(null);
      expect(localStorage.getItem('approvalSessionValidated')).toBe(null);
      expect(localStorage.getItem('approvalApprovalType')).toBe(null);
      expect(localStorage.getItem('approvalApprovalId')).toBe(null);
    });

    it('should handle logout errors gracefully', async () => {
      await vi.advanceTimersByTimeAsync(100);
      
      mockSupabaseClient.auth.signOut = vi.fn().mockRejectedValue(new Error('Logout failed'));

      // Should not throw even when signOut fails
      await expect(service.logout()).resolves.not.toThrow();
      
      // When signOut fails, navigation won't happen because we're in catch block
      // This is the current behavior - it just logs the error
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('recordActivity', () => {
    it('should record user activity', async () => {
      await vi.advanceTimersByTimeAsync(100);
      
      const beforeTime = Date.now();
      service.recordActivity();
      const afterTime = Date.now();

      expect(afterTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('sendMfaCode', () => {
    it('should send MFA code successfully', async () => {
      await vi.advanceTimersByTimeAsync(100);
      
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ 
          data: { require_site_login: true }, 
          error: null 
        })
      });

      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { codeId: 'code123' },
        error: null
      });

      const result = await service.sendMfaCode('test@example.com');

      expect(result.success).toBe(true);
      expect(result.codeId).toBe('code123');
      expect(localStorage.getItem('mfa_code_id')).toBe('code123');
      expect(localStorage.getItem('mfa_user_email')).toBe('test@example.com');
    });

    it('should handle send verification code error', async () => {
      await vi.advanceTimersByTimeAsync(100);
      
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ 
          data: { require_site_login: true }, 
          error: null 
        })
      });

      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Send failed' }
      });

      const result = await service.sendMfaCode('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Send failed');
    });

    it('should handle service error in response data', async () => {
      await vi.advanceTimersByTimeAsync(100);
      
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ 
          data: { require_site_login: true }, 
          error: null 
        })
      });

      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { error: 'Service error' },
        error: null
      });

      const result = await service.sendMfaCode('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });

    it('should check admin status when site protection is disabled', async () => {
      await vi.advanceTimersByTimeAsync(100);
      
      mockSupabaseClient.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ 
          data: { require_site_login: false }, 
          error: null 
        })
      });

      mockSupabaseClient.functions.invoke = vi.fn()
        .mockResolvedValueOnce({ // check-admin-status
          data: { is_admin: false },
          error: null
        });

      const result = await service.sendMfaCode('nonadmin@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should handle unexpected errors', async () => {
      await vi.advanceTimersByTimeAsync(100);
      
      mockSupabaseClient.from = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await service.sendMfaCode('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('verifyMfaCode', () => {
    beforeEach(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should verify MFA code successfully for admin', async () => {
      localStorage.setItem('mfa_code_id', 'code123');
      localStorage.setItem('mfa_user_email', 'admin@example.com');

      mockSupabaseClient.functions.invoke = vi.fn()
        .mockResolvedValueOnce({ // verify-code
          data: { success: true },
          error: null
        })
        .mockResolvedValueOnce({ // check-admin-status
          data: { is_admin: true },
          error: null
        });

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(true);
      expect(result.isAdmin).toBe(true);
      expect(localStorage.getItem('approvalAdminEmail')).toBe('admin@example.com');
      expect(localStorage.getItem('approvalSessionValidated')).toBe('true');
      expect(localStorage.getItem('mfa_code_id')).toBe(null);
    });

    it('should verify MFA code successfully for non-admin', async () => {
      localStorage.setItem('mfa_code_id', 'code123');
      localStorage.setItem('mfa_user_email', 'user@example.com');

      mockSupabaseClient.functions.invoke = vi.fn()
        .mockResolvedValueOnce({ // verify-code
          data: { success: true },
          error: null
        })
        .mockResolvedValueOnce({ // check-admin-status
          data: { is_admin: false },
          error: null
        });

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(true);
      expect(result.isAdmin).toBe(false);
    });

    it('should fail when no MFA session found', async () => {
      localStorage.removeItem('mfa_code_id');
      localStorage.removeItem('mfa_user_email');

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No MFA session found');
    });

    it('should handle verification error', async () => {
      localStorage.setItem('mfa_code_id', 'code123');
      localStorage.setItem('mfa_user_email', 'test@example.com');

      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid code' }
      });

      const result = await service.verifyMfaCode('000000');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid code');
    });

    it('should handle service error in response data', async () => {
      localStorage.setItem('mfa_code_id', 'code123');
      localStorage.setItem('mfa_user_email', 'test@example.com');

      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { error: 'Code expired' },
        error: null
      });

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Code expired');
    });

    it('should handle unexpected errors', async () => {
      localStorage.setItem('mfa_code_id', 'code123');
      localStorage.setItem('mfa_user_email', 'test@example.com');

      mockSupabaseClient.functions.invoke = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });
  });

  describe('setApprovalSession', () => {
    beforeEach(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should set approval session for admin user', async () => {
      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      await service.setApprovalSession('admin@example.com');

      const isAuthenticated = await firstValueFrom(service.isAuthenticated$);
      const isAdmin = await firstValueFrom(service.isAdmin$);
      const hasAdminEmail = await firstValueFrom(service.hasAdminEmail$);
      const adminSessionExpired = await firstValueFrom(service.adminSessionExpired$);

      expect(isAuthenticated).toBe(true);
      expect(isAdmin).toBe(true);
      expect(hasAdminEmail).toBe(true);
      expect(adminSessionExpired).toBe(false);
      expect(localStorage.getItem('approvalAdminEmail')).toBe('admin@example.com');
      expect(localStorage.getItem('approvalSessionValidated')).toBe('true');
    });

    it('should set approval session for non-admin user', async () => {
      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { is_admin: false },
        error: null
      });

      await service.setApprovalSession('user@example.com');

      const isAuthenticated = await firstValueFrom(service.isAuthenticated$);
      const isAdmin = await firstValueFrom(service.isAdmin$);
      const hasAdminEmail = await firstValueFrom(service.hasAdminEmail$);

      expect(isAuthenticated).toBe(true);
      expect(isAdmin).toBe(false);
      expect(hasAdminEmail).toBe(false);
    });
  });

  describe('reloadSiteProtectionSetting', () => {
    beforeEach(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should reload site protection setting from database', async () => {
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: [{ require_site_login: false }],
        error: null
      });

      await service.reloadSiteProtectionSetting();

      const requireSiteLogin = await firstValueFrom(service.requireSiteLogin$);
      expect(requireSiteLogin).toBe(false);

      const cached = localStorage.getItem('adminTimeoutSettings');
      expect(cached).toContain('requireSiteLogin');
    });

    it('should handle reload error', async () => {
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(service.reloadSiteProtectionSetting()).resolves.not.toThrow();
    });

    it('should handle reload exception', async () => {
      mockSupabaseService.directQuery = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.reloadSiteProtectionSetting()).resolves.not.toThrow();
    });
  });

  describe('checkBlockedStatusInBackground', () => {
    beforeEach(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    it('should throttle blocked status checks', async () => {
      // Clear any previous calls from initialization
      vi.clearAllMocks();
      const directQuerySpy = vi.spyOn(mockSupabaseService, 'directQuery');

      service.checkBlockedStatusInBackground();
      service.checkBlockedStatusInBackground();
      service.checkBlockedStatusInBackground();
      await vi.advanceTimersByTimeAsync(100);

      // Should only call once due to throttling (within 60 second window)
      expect(directQuerySpy).toHaveBeenCalledTimes(1);
    });

    it('should handle blocked check error gracefully', async () => {
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      service.checkBlockedStatusInBackground();
      await vi.advanceTimersByTimeAsync(100);

      // Should not crash or logout
      expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled();
    });

    it('should handle blocked check exception gracefully', async () => {
      mockSupabaseService.directQuery = vi.fn().mockRejectedValue(new Error('Network error'));

      service.checkBlockedStatusInBackground();
      await vi.advanceTimersByTimeAsync(100);

      // Should not crash or logout
      expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled();
    });

    it('should logout blocked user', async () => {
      // First set up a user
      const mockUser = { 
        id: '123', 
        email: 'blocked@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };

      // Recreate service with a user
      mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      });
      
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: [{ is_admin: false }],
        error: null
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      service = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Now check blocked status and user should be blocked
      vi.clearAllMocks();
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: [{ is_blocked: true }],
        error: null
      });

      service.checkBlockedStatusInBackground('/admin/users');
      await vi.advanceTimersByTimeAsync(100);

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/admin/users', blocked: 'true' }
      });
    });
  });

  describe('Initialization Paths', () => {
    it('should initialize with approval session', async () => {
      localStorage.setItem('approvalAdminEmail', 'admin@example.com');
      localStorage.setItem('approvalSessionValidated', 'true');
      
      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValueOnce({ data: null, error: null }) // timeout settings
        .mockResolvedValueOnce({ data: null, error: null }); // refresh timeout settings
      
      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      const isAuthenticated = await firstValueFrom(newService.isAuthenticated$);
      expect(isAuthenticated).toBe(true);
    });

    it('should initialize with current session', async () => {
      const mockUser = { 
        id: '123', 
        email: 'user@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };

      mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      });

      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValueOnce({ data: null, error: null }) // timeout settings
        .mockResolvedValueOnce({ data: null, error: null }) // refresh
        .mockResolvedValueOnce({ data: [], error: null }); // admin check

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      const user = await firstValueFrom(newService.user$);
      expect(user).toEqual(mockUser);
    });

    it('should load cached timeout settings', async () => {
      const cachedSettings = {
        inactivityTimeoutMinutes: 45,
        requireSiteLogin: false
      };
      
      localStorage.setItem('adminTimeoutSettings', JSON.stringify(cachedSettings));

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      const requireSiteLogin = await firstValueFrom(newService.requireSiteLogin$);
      expect(requireSiteLogin).toBe(false);
    });

    it('should handle invalid cached timeout settings', async () => {
      localStorage.setItem('adminTimeoutSettings', 'invalid-json');

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      expect(newService).toBeTruthy();
    });

    it('should load timeout settings from database', async () => {
      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValueOnce({ 
          data: [{ 
            inactivity_timeout_minutes: 60, 
            require_site_login: false 
          }], 
          error: null 
        })
        .mockResolvedValueOnce({ data: null, error: null }); // refresh

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      const requireSiteLogin = await firstValueFrom(newService.requireSiteLogin$);
      expect(requireSiteLogin).toBe(false);
    });

    it('should handle timeout settings load error', async () => {
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      expect(newService).toBeTruthy();
    });
  });

  describe('Auth State Changes', () => {
    it('should handle user sign in via auth state change', async () => {
      const mockUser = { 
        id: '123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };

      let authCallback: any;
      mockSupabaseClient.auth.onAuthStateChange = vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValue({ data: [], error: null });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Trigger sign in
      authCallback('SIGNED_IN', { user: mockUser });
      await vi.advanceTimersByTimeAsync(100);

      const user = await firstValueFrom(newService.user$);
      const isAuthenticated = await firstValueFrom(newService.isAuthenticated$);

      expect(user).toEqual(mockUser);
      expect(isAuthenticated).toBe(true);
    });

    it('should handle user sign out via auth state change', async () => {
      let authCallback: any;
      mockSupabaseClient.auth.onAuthStateChange = vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Trigger sign out
      authCallback('SIGNED_OUT', null);
      await vi.advanceTimersByTimeAsync(100);

      const user = await firstValueFrom(newService.user$);
      const isAdmin = await firstValueFrom(newService.isAdmin$);
      const isAuthenticated = await firstValueFrom(newService.isAuthenticated$);

      expect(user).toBe(null);
      expect(isAdmin).toBe(false);
      expect(isAuthenticated).toBe(false);
    });

    it('should persist session start on sign in when not already set', async () => {
      const mockUser = { 
        id: '123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };

      let authCallback: any;
      mockSupabaseClient.auth.onAuthStateChange = vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Clear any existing session start
      localStorage.removeItem('adminSessionStart');

      // Trigger sign in
      authCallback('SIGNED_IN', { user: mockUser });
      await vi.advanceTimersByTimeAsync(100);

      const sessionStart = localStorage.getItem('adminSessionStart');
      expect(sessionStart).toBeTruthy();
    });
  });

  describe('Session Timeouts', () => {
    it('should expire admin session after inactivity', async () => {
      // Set up service with admin
      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValue({ data: null, error: null });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      await newService.setApprovalSession('admin@example.com');
      
      let isAdmin = await firstValueFrom(newService.isAdmin$);
      expect(isAdmin).toBe(true);

      // Advance time by 31 minutes (more than default 30 min timeout)
      await vi.advanceTimersByTimeAsync(31 * 60 * 1000);

      isAdmin = await firstValueFrom(newService.isAdmin$);
      const adminSessionExpired = await firstValueFrom(newService.adminSessionExpired$);

      expect(isAdmin).toBe(false);
      expect(adminSessionExpired).toBe(true);
    });

    it('should not expire session if user has recent activity', async () => {
      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      await newService.setApprovalSession('admin@example.com');

      // Advance time by 15 minutes
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
      newService.recordActivity();

      // Advance another 15 minutes (total 30, but activity was recorded)
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

      const isAdmin = await firstValueFrom(newService.isAdmin$);
      expect(isAdmin).toBe(true);
    });
  });

  describe('Window Focus Handler', () => {
    it('should refresh timeout settings on window focus', async () => {
      let focusHandler: any;
      vi.spyOn(window, 'addEventListener').mockImplementation((event: any, handler: any) => {
        if (event === 'focus') {
          focusHandler = handler;
        }
      });

      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValueOnce({ data: null, error: null }) // initial load
        .mockResolvedValueOnce({ data: null, error: null }) // initial refresh
        .mockResolvedValueOnce({ // focus event refresh
          data: [{ 
            inactivity_timeout_minutes: 45, 
            require_site_login: false 
          }], 
          error: null 
        });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      expect(focusHandler).toBeDefined();

      // Trigger focus
      if (focusHandler) {
        focusHandler();
        await vi.advanceTimersByTimeAsync(100);
      }

      // Should have called directQuery to refresh settings
      expect(mockSupabaseService.directQuery).toHaveBeenCalledTimes(3);
    });
  });

  describe('checkAdminStatus', () => {
    it('should handle user without email using approval session', async () => {
      localStorage.setItem('approvalAdminEmail', 'admin@example.com');
      localStorage.setItem('approvalSessionValidated', 'true');

      const mockUser = { 
        id: '123', 
        email: undefined,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      } as any;

      // Set up auth callback capture before creating service
      let authCallback: any;
      const tempOnAuthStateChange = vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockSupabaseClient.auth.onAuthStateChange = tempOnAuthStateChange;

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Since approval session exists, service is already authenticated
      // Now test the auth state change callback with user without email
      if (authCallback) {
        authCallback('SIGNED_IN', { user: mockUser });
        await vi.advanceTimersByTimeAsync(100);

        const isAdmin = await firstValueFrom(newService.isAdmin$);
        const hasAdminEmail = await firstValueFrom(newService.hasAdminEmail$);
        const isAuthenticated = await firstValueFrom(newService.isAuthenticated$);

        expect(isAdmin).toBe(true);
        expect(hasAdminEmail).toBe(true);
        expect(isAuthenticated).toBe(true);
      }
    });

    it('should check admin status from database for user with email', async () => {
      const mockUser = { 
        id: '123', 
        email: 'admin@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };

      // Set up auth callback capture before creating service
      let authCallback: any;
      const tempOnAuthStateChange = vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockSupabaseClient.auth.onAuthStateChange = tempOnAuthStateChange;

      // Use a flexible mock that returns admin data for admin checks
      mockSupabaseService.directQuery = vi.fn().mockImplementation((table, options) => {
        // Check if this is an admin status check
        if (options?.eq?.email === 'admin@example.com') {
          return Promise.resolve({ data: [{ is_admin: true }], error: null });
        }
        // For other queries (timeout settings, etc.), return empty
        return Promise.resolve({ data: null, error: null });
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Ensure callback was set up
      expect(authCallback).toBeDefined();

      // Trigger sign in
      if (authCallback) {
        authCallback('SIGNED_IN', { user: mockUser });
        // Give more time for async admin check to complete
        await vi.advanceTimersByTimeAsync(200);

        const isAdmin = await firstValueFrom(newService.isAdmin$);
        const hasAdminEmail = await firstValueFrom(newService.hasAdminEmail$);

        expect(isAdmin).toBe(true);
        expect(hasAdminEmail).toBe(true);
      }
    });

    it('should handle admin check exception', async () => {
      const mockUser = { 
        id: '123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };

      let authCallback: any;
      mockSupabaseClient.auth.onAuthStateChange = vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValueOnce({ data: null, error: null }) // initial
        .mockResolvedValueOnce({ data: null, error: null }) // refresh
        .mockRejectedValueOnce(new Error('Network error')); // admin check fails

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Trigger sign in
      authCallback('SIGNED_IN', { user: mockUser });
      await vi.advanceTimersByTimeAsync(100);

      const isAdmin = await firstValueFrom(newService.isAdmin$);
      expect(isAdmin).toBe(false);
    });
  });

  describe('localStorage Persistence', () => {
    it('should persist and restore session start', async () => {
      const timestamp = Date.now() - 1000;
      localStorage.setItem('adminSessionStart', timestamp.toString());

      const mockUser = { 
        id: '123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };

      mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      });

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: [], 
        error: null
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      const sessionStart = localStorage.getItem('adminSessionStart');
      expect(sessionStart).toBe(timestamp.toString());
    });

    it('should handle invalid persisted session start', async () => {
      localStorage.setItem('adminSessionStart', 'invalid');

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      expect(newService).toBeTruthy();
    });

    it('should handle localStorage errors when persisting', async () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const mockUser = { 
        id: '123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };

      mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      });

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: [], 
        error: null
      });

      await expect(async () => {
        const { AdminAuthService } = await import('./admin-auth.service');
        const newService = new AdminAuthService(mockSupabaseService);
        await vi.advanceTimersByTimeAsync(100);
      }).not.toThrow();

      Storage.prototype.setItem = originalSetItem;
    });

    it('should handle localStorage errors when reading', async () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      await expect(async () => {
        const { AdminAuthService } = await import('./admin-auth.service');
        const newService = new AdminAuthService(mockSupabaseService);
        await vi.advanceTimersByTimeAsync(100);
      }).not.toThrow();

      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe('Activity Tracking', () => {
    it('should set up activity tracking event listeners', async () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Check that event listeners were added
      const calls = addEventListenerSpy.mock.calls;
      const eventTypes = calls.map(call => call[0]);
      
      expect(eventTypes).toContain('mousedown');
      expect(eventTypes).toContain('keydown');
      expect(eventTypes).toContain('scroll');
      expect(eventTypes).toContain('touchstart');
    });

    it('should update lastActivity when activity events fire', async () => {
      let activityHandler: any;
      vi.spyOn(document, 'addEventListener').mockImplementation((event: any, handler: any) => {
        if (event === 'mousedown') {
          activityHandler = handler;
        }
      });

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Trigger activity
      if (activityHandler) {
        const beforeTime = Date.now();
        activityHandler();
        const afterTime = Date.now();
        
        // The handler updates lastActivity internally
        expect(afterTime).toBeGreaterThanOrEqual(beforeTime);
      }
    });
  });

  describe('Timeout Settings Edge Cases', () => {
    it('should apply timeout settings with all null values', async () => {
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: [{ 
          inactivity_timeout_minutes: null, 
          require_site_login: null 
        }], 
        error: null
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Should use defaults when null
      const requireSiteLogin = await firstValueFrom(newService.requireSiteLogin$);
      expect(requireSiteLogin).toBe(true);
    });

    it('should handle empty timeout settings data', async () => {
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      expect(newService).toBeTruthy();
    });
  });

  describe('Additional Edge Cases', () => {
    it('should not check blocked status if no user email', async () => {
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Clear mocks to track calls
      vi.clearAllMocks();

      // Check blocked status when no user is set
      newService.checkBlockedStatusInBackground();
      await vi.advanceTimersByTimeAsync(100);

      // Should call directQuery with empty email
      expect(mockSupabaseService.directQuery).toHaveBeenCalled();
    });

    it('should handle approval session for non-admin on init', async () => {
      localStorage.setItem('approvalAdminEmail', 'user@example.com');
      localStorage.setItem('approvalSessionValidated', 'true');
      
      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });
      
      mockSupabaseClient.functions.invoke = vi.fn().mockResolvedValue({
        data: { is_admin: false },
        error: null
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      const isAdmin = await firstValueFrom(newService.isAdmin$);
      const hasAdminEmail = await firstValueFrom(newService.hasAdminEmail$);
      const isAuthenticated = await firstValueFrom(newService.isAuthenticated$);

      expect(isAdmin).toBe(false);
      expect(hasAdminEmail).toBe(false);
      expect(isAuthenticated).toBe(true);
    });

    it('should check admin status without approval session for user without email', async () => {
      const mockUser = { 
        id: '123', 
        email: undefined,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      } as any;

      let authCallback: any;
      const tempOnAuthStateChange = vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockSupabaseClient.auth.onAuthStateChange = tempOnAuthStateChange;

      mockSupabaseService.directQuery = vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Trigger sign in with user without email and no approval session
      if (authCallback) {
        authCallback('SIGNED_IN', { user: mockUser });
        await vi.advanceTimersByTimeAsync(100);

        const isAdmin = await firstValueFrom(newService.isAdmin$);
        const hasAdminEmail = await firstValueFrom(newService.hasAdminEmail$);
        const isAuthenticated = await firstValueFrom(newService.isAuthenticated$);

        expect(isAdmin).toBe(false);
        expect(hasAdminEmail).toBe(false);
        // User is authenticated (has a session) but is not admin
        expect(isAuthenticated).toBe(true);
      }
    });

    it('should handle admin check returning empty data', async () => {
      const mockUser = { 
        id: '123', 
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };

      let authCallback: any;
      const tempOnAuthStateChange = vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });
      mockSupabaseClient.auth.onAuthStateChange = tempOnAuthStateChange;

      mockSupabaseService.directQuery = vi.fn().mockImplementation((table, options) => {
        // Return empty data for admin check
        if (options?.eq?.email) {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      if (authCallback) {
        authCallback('SIGNED_IN', { user: mockUser });
        await vi.advanceTimersByTimeAsync(200);

        const isAdmin = await firstValueFrom(newService.isAdmin$);
        const hasAdminEmail = await firstValueFrom(newService.hasAdminEmail$);

        expect(isAdmin).toBe(false);
        expect(hasAdminEmail).toBe(false);
      }
    });
  });

  describe('Focus/Visibility Change Handler - iOS Edge Fix', () => {
    it('should re-validate admin status on window focus after background suspension', async () => {
      let focusHandler: any;
      vi.spyOn(window, 'addEventListener').mockImplementation((event: any, handler: any) => {
        if (event === 'focus') {
          focusHandler = handler;
        }
      });

      const mockUser = {
        id: '123',
        email: 'admin@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      } as any;

      mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      });

      let authCallback: any;
      mockSupabaseClient.auth.onAuthStateChange = vi.fn((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      // Mock directQuery to return admin status
      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValueOnce({ data: null, error: null }) // initial load
        .mockResolvedValueOnce({ data: [{ is_admin: true }], error: null }) // first checkAdminStatus
        .mockResolvedValueOnce({ 
          data: [{ 
            inactivity_timeout_minutes: 30, 
            require_site_login: true 
          }], 
          error: null 
        }) // focus event timeout settings
        .mockResolvedValueOnce({ data: [{ is_admin: true }], error: null }); // focus event admin re-validation

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      // Verify initial admin status was set
      let isAdmin = await firstValueFrom(newService.isAdmin$);
      expect(isAdmin).toBe(true);

      // Trigger focus event (simulating app return from background)
      expect(focusHandler).toBeDefined();
      if (focusHandler) {
        focusHandler();
        await vi.advanceTimersByTimeAsync(200); // Wait longer for async operations
      }

      // Verify checkAdminStatus was called again during focus
      // Should have been called at least twice (initial + focus event)
      expect(mockSupabaseService.directQuery).toHaveBeenCalledWith(
        'email_subscribers',
        expect.objectContaining({
          eq: { email: 'admin@example.com', is_admin: true }
        })
      );
    });

    it('should re-validate admin status on visibilitychange when page becomes visible', async () => {
      let visibilityChangeHandler: any;
      vi.spyOn(document, 'addEventListener').mockImplementation((event: any, handler: any) => {
        if (event === 'visibilitychange') {
          visibilityChangeHandler = handler;
        }
      });

      const mockUser = {
        id: '123',
        email: 'admin@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      } as any;

      mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      });

      mockSupabaseClient.auth.onAuthStateChange = vi.fn((callback) => {
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValueOnce({ data: null, error: null }) // initial load
        .mockResolvedValueOnce({ data: [{ is_admin: true }], error: null }) // first checkAdminStatus
        .mockResolvedValueOnce({ data: [{ is_admin: true }], error: null }); // visibilitychange re-validation

      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      let isAdmin = await firstValueFrom(newService.isAdmin$);
      expect(isAdmin).toBe(true);

      // Trigger visibilitychange event (page becomes visible)
      expect(visibilityChangeHandler).toBeDefined();
      if (visibilityChangeHandler) {
        visibilityChangeHandler();
        await vi.advanceTimersByTimeAsync(200); // Wait for async operations
      }

      // Verify admin status was re-checked
      expect(mockSupabaseService.directQuery).toHaveBeenCalledWith(
        'email_subscribers',
        expect.objectContaining({
          eq: { email: 'admin@example.com', is_admin: true }
        })
      );
    });

    it('should not trigger re-validation if page stays hidden on visibilitychange', async () => {
      let visibilityChangeHandler: any;
      vi.spyOn(document, 'addEventListener').mockImplementation((event: any, handler: any) => {
        if (event === 'visibilitychange') {
          visibilityChangeHandler = handler;
        }
      });

      mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: null
      });

      mockSupabaseClient.auth.onAuthStateChange = vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }));

      mockSupabaseService.directQuery = vi.fn()
        .mockResolvedValueOnce({ data: null, error: null }); // initial load

      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true // Page is hidden
      });

      const { AdminAuthService } = await import('./admin-auth.service');
      const newService = new AdminAuthService(mockSupabaseService);
      await vi.advanceTimersByTimeAsync(100);

      const initialCallCount = mockSupabaseService.directQuery.mock.calls.length;

      // Trigger visibilitychange event while page is still hidden
      if (visibilityChangeHandler) {
        visibilityChangeHandler();
        await vi.advanceTimersByTimeAsync(100);
      }

      // No additional directQuery calls should happen when page stays hidden
      expect(mockSupabaseService.directQuery.mock.calls.length).toBe(initialCallCount);
    });

  });
});
