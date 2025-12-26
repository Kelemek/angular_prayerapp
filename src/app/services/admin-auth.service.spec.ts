import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';
import { SupabaseService } from './supabase.service';

// Mock inject function before anything else
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual('@angular/core');
  return {
    ...actual,
    inject: vi.fn((token) => {
      if (token === Router) {
        return { navigate: vi.fn() };
      }
      return null;
    })
  };
});

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let mockSupabaseService: any;
  let mockRouter: any;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockSupabaseService = {
      client: {
        auth: {
          getSession: vi.fn(() => Promise.resolve({ 
            data: { session: null }, 
            error: null 
          })),
          onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } }
          })),
          signOut: vi.fn(() => Promise.resolve({ error: null }))
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        })),
        functions: {
          invoke: vi.fn(() => Promise.resolve({ data: {}, error: null }))
        }
      },
      directQuery: vi.fn(() => Promise.resolve({ data: [], error: null }))
    };

    mockRouter = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: Router, useValue: mockRouter },
        AdminAuthService
      ]
    });

    service = TestBed.inject(AdminAuthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with loading true', (done) => {
      service.loading$.subscribe(loading => {
        if (!loading) {
          done();
        }
      });
    });

    it('should load timeout settings from localStorage cache', async () => {
      const cachedSettings = {
        inactivityTimeoutMinutes: 60,
        requireSiteLogin: false
      };
      localStorage.setItem('adminTimeoutSettings', JSON.stringify(cachedSettings));

      const newService = new AdminAuthService(mockSupabaseService);
      
      await vi.runAllTimersAsync();

      newService.requireSiteLogin$.subscribe(value => {
        expect(value).toBe(false);
      });
    });

    it('should check for approval code session on init', async () => {
      localStorage.setItem('approvalAdminEmail', 'admin@example.com');
      localStorage.setItem('approvalSessionValidated', 'true');

      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      const newService = new AdminAuthService(mockSupabaseService);
      await vi.runAllTimersAsync();

      newService.isAuthenticated$.subscribe(value => {
        expect(value).toBe(true);
      });
    });

    it('should check current session on init', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01'
      };

      mockSupabaseService.client.auth.getSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      });

      const newService = new AdminAuthService(mockSupabaseService);
      await vi.runAllTimersAsync();

      newService.user$.subscribe(user => {
        if (user) {
          expect(user.email).toBe('test@example.com');
        }
      });
    });
  });

  describe('sendMfaCode', () => {
    it('should send MFA code via email', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: { require_site_login: true }, 
              error: null 
            }))
          }))
        }))
      });

      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: { codeId: 'code-123' },
        error: null
      });

      const result = await service.sendMfaCode('admin@example.com');

      expect(result.success).toBe(true);
      expect(result.codeId).toBe('code-123');
      expect(localStorage.getItem('mfa_code_id')).toBe('code-123');
      expect(localStorage.getItem('mfa_user_email')).toBe('admin@example.com');
    });

    it('should check if email is admin when site protection is disabled', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: { require_site_login: false }, 
              error: null 
            }))
          }))
        }))
      });

      mockSupabaseService.client.functions.invoke
        .mockResolvedValueOnce({
          data: { is_admin: false },
          error: null
        });

      const result = await service.sendMfaCode('user@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should handle errors when sending MFA code', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: { require_site_login: true }, 
              error: null 
            }))
          }))
        }))
      });

      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error('Send failed')
      });

      const result = await service.sendMfaCode('admin@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle service errors from function response', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: { require_site_login: true }, 
              error: null 
            }))
          }))
        }))
      });

      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: { error: 'Service error occurred' },
        error: null
      });

      const result = await service.sendMfaCode('admin@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error occurred');
    });
  });

  describe('verifyMfaCode', () => {
    beforeEach(() => {
      localStorage.setItem('mfa_code_id', 'code-123');
      localStorage.setItem('mfa_user_email', 'admin@example.com');
    });

    it('should verify MFA code and create session', async () => {
      mockSupabaseService.client.functions.invoke
        .mockResolvedValueOnce({
          data: {},
          error: null
        })
        .mockResolvedValueOnce({
          data: { is_admin: true },
          error: null
        });

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(true);
      expect(result.isAdmin).toBe(true);
      expect(localStorage.getItem('approvalAdminEmail')).toBe('admin@example.com');
      expect(localStorage.getItem('approvalSessionValidated')).toBe('true');
    });

    it('should return error if no MFA session found', async () => {
      localStorage.removeItem('mfa_code_id');
      localStorage.removeItem('mfa_user_email');

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No MFA session found');
    });

    it('should handle verification errors', async () => {
      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error('Verification failed')
      });

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle invalid code response', async () => {
      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: { error: 'Invalid code' },
        error: null
      });

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid code');
    });

    it('should set admin status based on email check', async () => {
      mockSupabaseService.client.functions.invoke
        .mockResolvedValueOnce({
          data: {},
          error: null
        })
        .mockResolvedValueOnce({
          data: { is_admin: false },
          error: null
        });

      const result = await service.verifyMfaCode('123456');

      expect(result.success).toBe(true);
      expect(result.isAdmin).toBe(false);
    });

    it('should clean up MFA storage after verification', async () => {
      mockSupabaseService.client.functions.invoke
        .mockResolvedValueOnce({
          data: {},
          error: null
        })
        .mockResolvedValueOnce({
          data: { is_admin: true },
          error: null
        });

      await service.verifyMfaCode('123456');

      expect(localStorage.getItem('mfa_code_id')).toBeNull();
      expect(localStorage.getItem('mfa_user_email')).toBeNull();
    });
  });

  describe('setApprovalSession', () => {
    it('should set session for admin user', async () => {
      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      await service.setApprovalSession('admin@example.com');

      expect(localStorage.getItem('approvalAdminEmail')).toBe('admin@example.com');
      expect(localStorage.getItem('approvalSessionValidated')).toBe('true');
      
      service.isAuthenticated$.subscribe(value => {
        expect(value).toBe(true);
      });
      
      service.isAdmin$.subscribe(value => {
        expect(value).toBe(true);
      });
    });

    it('should set session for non-admin user', async () => {
      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: { is_admin: false },
        error: null
      });

      await service.setApprovalSession('user@example.com');

      expect(localStorage.getItem('approvalAdminEmail')).toBe('user@example.com');
      
      service.isAuthenticated$.subscribe(value => {
        expect(value).toBe(true);
      });
      
      service.isAdmin$.subscribe(value => {
        expect(value).toBe(false);
      });
    });
  });

  describe('logout', () => {
    it('should sign out user and clear session', async () => {
      await service.logout();

      expect(mockSupabaseService.client.auth.signOut).toHaveBeenCalled();
      expect(localStorage.getItem('approvalAdminEmail')).toBeNull();
      expect(localStorage.getItem('approvalSessionValidated')).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should reset all subjects', async () => {
      await service.logout();

      service.user$.subscribe(user => {
        expect(user).toBeNull();
      });

      service.isAdmin$.subscribe(isAdmin => {
        expect(isAdmin).toBe(false);
      });

      service.isAuthenticated$.subscribe(isAuth => {
        expect(isAuth).toBe(false);
      });
    });

    it('should handle logout errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseService.client.auth.signOut.mockRejectedValue(new Error('Logout failed'));

      await service.logout();

      expect(consoleSpy).toHaveBeenCalledWith('Error during logout:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('getUser', () => {
    it('should return current user', () => {
      const mockUser: any = {
        id: 'user-123',
        email: 'test@example.com'
      };

      service['userSubject'].next(mockUser);

      const user = service.getUser();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null if no user', () => {
      service['userSubject'].next(null);

      const user = service.getUser();
      expect(user).toBeNull();
    });
  });

  describe('getIsAdmin', () => {
    it('should return admin status', () => {
      service['isAdminSubject'].next(true);
      expect(service.getIsAdmin()).toBe(true);

      service['isAdminSubject'].next(false);
      expect(service.getIsAdmin()).toBe(false);
    });
  });

  describe('isLoading', () => {
    it('should return loading status', () => {
      service['loadingSubject'].next(true);
      expect(service.isLoading()).toBe(true);

      service['loadingSubject'].next(false);
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('recordActivity', () => {
    it('should update last activity timestamp', () => {
      const before = service['lastActivity'];
      
      vi.advanceTimersByTime(1000);
      service.recordActivity();
      
      const after = service['lastActivity'];
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('checkBlockedStatusInBackground', () => {
    it('should check if user is blocked', async () => {
      const mockUser: any = {
        id: 'user-123',
        email: 'blocked@example.com'
      };
      
      service['userSubject'].next(mockUser);

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ is_blocked: true }],
        error: null
      });

      service.checkBlockedStatusInBackground('/admin');
      
      await vi.runAllTimersAsync();

      expect(mockSupabaseService.directQuery).toHaveBeenCalled();
    });

    it('should throttle checks to once per minute', () => {
      service.checkBlockedStatusInBackground();
      service.checkBlockedStatusInBackground();
      service.checkBlockedStatusInBackground();

      expect(mockSupabaseService.directQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle check errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: new Error('Check failed')
      });

      service.checkBlockedStatusInBackground();
      
      await vi.runAllTimersAsync();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should logout and redirect if user is blocked', async () => {
      const mockUser: any = {
        id: 'user-123',
        email: 'blocked@example.com'
      };
      
      service['userSubject'].next(mockUser);

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ is_blocked: true }],
        error: null
      });

      const logoutSpy = vi.spyOn(service, 'logout').mockResolvedValue();

      service.checkBlockedStatusInBackground('/admin');
      
      await vi.runAllTimersAsync();

      expect(logoutSpy).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          returnUrl: '/admin',
          blocked: 'true'
        }
      });
    });
  });

  describe('reloadSiteProtectionSetting', () => {
    it('should reload site protection setting from database', async () => {
      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ require_site_login: false }],
        error: null
      });

      await service.reloadSiteProtectionSetting();

      service.requireSiteLogin$.subscribe(value => {
        expect(value).toBe(false);
      });
    });

    it('should handle errors when reloading settings', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: new Error('Load failed')
      });

      await service.reloadSiteProtectionSetting();

      expect(consoleSpy).toHaveBeenCalledWith('Error reloading site protection setting:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should update localStorage cache', async () => {
      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ require_site_login: false }],
        error: null
      });

      await service.reloadSiteProtectionSetting();

      const cached = JSON.parse(localStorage.getItem('adminTimeoutSettings') || '{}');
      expect(cached.requireSiteLogin).toBe(false);
      expect(localStorage.getItem('adminTimeoutSettingsTimestamp')).toBeTruthy();
    });
  });

  describe('timeout settings', () => {
    it('should apply cached timeout settings', () => {
      const settings = {
        inactivityTimeoutMinutes: 45,
        requireSiteLogin: false
      };
      
      localStorage.setItem('adminTimeoutSettings', JSON.stringify(settings));

      service['applyCachedTimeoutSettings']();

      expect(service['timeoutSettings'].inactivityTimeoutMinutes).toBe(45);
    });

    it('should handle invalid cached settings', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorage.setItem('adminTimeoutSettings', 'invalid json');

      service['applyCachedTimeoutSettings']();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should refresh timeout settings from database', async () => {
      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ 
          inactivity_timeout_minutes: 60,
          require_site_login: false
        }],
        error: null
      });

      await service['refreshTimeoutSettingsFromDb']();

      expect(service['timeoutSettings'].inactivityTimeoutMinutes).toBe(60);
    });

    it('should use defaults if settings not in database', async () => {
      mockSupabaseService.directQuery.mockResolvedValue({
        data: [],
        error: null
      });

      await service['refreshTimeoutSettingsFromDb']();

      expect(service['timeoutSettings'].inactivityTimeoutMinutes).toBeTruthy();
    });
  });

  describe('session timeouts', () => {
    it('should check for admin session timeout', async () => {
      service['isAdminSubject'].next(true);
      service['lastActivity'] = Date.now() - (31 * 60 * 1000); // 31 minutes ago

      service['setupSessionTimeouts']();
      
      await vi.advanceTimersByTimeAsync(60000); // Advance 1 minute

      service.isAdmin$.subscribe(value => {
        expect(value).toBe(false);
      });
    });

    it('should not timeout non-admin sessions', async () => {
      service['isAdminSubject'].next(false);
      service['lastActivity'] = Date.now() - (31 * 60 * 1000);

      service['setupSessionTimeouts']();
      
      await vi.advanceTimersByTimeAsync(60000);

      service.isAdmin$.subscribe(value => {
        expect(value).toBe(false);
      });
    });
  });

  describe('isEmailAdmin', () => {
    it('should check if email is admin', async () => {
      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      const result = await service['isEmailAdmin']('admin@example.com');

      expect(result).toBe(true);
    });

    it('should return false for non-admin email', async () => {
      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: { is_admin: false },
        error: null
      });

      const result = await service['isEmailAdmin']('user@example.com');

      expect(result).toBe(false);
    });

    it('should handle errors when checking admin status', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseService.client.functions.invoke.mockResolvedValue({
        data: null,
        error: new Error('Check failed')
      });

      const result = await service['isEmailAdmin']('admin@example.com');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('checkAdminStatus', () => {
    it('should check admin status for user with email', async () => {
      const mockUser: any = {
        email: 'admin@example.com',
        id: 'user-123'
      };

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [{ is_admin: true }],
        error: null
      });

      await service['checkAdminStatus'](mockUser);

      service.isAdmin$.subscribe(value => {
        expect(value).toBe(true);
      });
    });

    it('should handle user without email', async () => {
      const mockUser: any = {
        id: 'user-123'
      };

      await service['checkAdminStatus'](mockUser);

      service.isAdmin$.subscribe(value => {
        expect(value).toBe(false);
      });
    });

    it('should check for approval code session if no email', async () => {
      localStorage.setItem('approvalAdminEmail', 'admin@example.com');
      localStorage.setItem('approvalSessionValidated', 'true');

      const mockUser: any = {
        id: 'user-123'
      };

      await service['checkAdminStatus'](mockUser);

      service.isAdmin$.subscribe(value => {
        expect(value).toBe(true);
      });
    });

    it('should handle errors when checking admin status', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockUser: any = {
        email: 'admin@example.com',
        id: 'user-123'
      };

      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: new Error('Check failed')
      });

      await service['checkAdminStatus'](mockUser);

      service.isAdmin$.subscribe(value => {
        expect(value).toBe(false);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('session persistence', () => {
    it('should persist session start timestamp', () => {
      const timestamp = Date.now();
      service['persistSessionStart'](timestamp);

      expect(localStorage.getItem('adminSessionStart')).toBe(timestamp.toString());
    });

    it('should remove session start when set to null', () => {
      localStorage.setItem('adminSessionStart', '123456');
      
      service['persistSessionStart'](null);

      expect(localStorage.getItem('adminSessionStart')).toBeNull();
    });

    it('should get persisted session start', () => {
      const timestamp = Date.now();
      localStorage.setItem('adminSessionStart', timestamp.toString());

      const result = service['getPersistedSessionStart']();

      expect(result).toBe(timestamp);
    });

    it('should return null if no persisted session', () => {
      const result = service['getPersistedSessionStart']();

      expect(result).toBeNull();
    });

    it('should handle invalid persisted session data', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorage.setItem('adminSessionStart', 'invalid');

      const result = service['getPersistedSessionStart']();

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('trackUserActivity', () => {
    it('should track mouse activity', () => {
      const before = service['lastActivity'];
      
      vi.advanceTimersByTime(100);
      document.dispatchEvent(new Event('mousedown'));
      
      expect(service['lastActivity']).toBeGreaterThan(before);
    });

    it('should track keyboard activity', () => {
      const before = service['lastActivity'];
      
      vi.advanceTimersByTime(100);
      document.dispatchEvent(new Event('keydown'));
      
      expect(service['lastActivity']).toBeGreaterThan(before);
    });

    it('should track scroll activity', () => {
      const before = service['lastActivity'];
      
      vi.advanceTimersByTime(100);
      document.dispatchEvent(new Event('scroll'));
      
      expect(service['lastActivity']).toBeGreaterThan(before);
    });

    it('should track touch activity', () => {
      const before = service['lastActivity'];
      
      vi.advanceTimersByTime(100);
      document.dispatchEvent(new Event('touchstart'));
      
      expect(service['lastActivity']).toBeGreaterThan(before);
    });
  });
});
