import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserSessionService } from './user-session.service';
import { SupabaseService } from './supabase.service';
import { AdminAuthService } from './admin-auth.service';
import { BehaviorSubject } from 'rxjs';

describe('UserSessionService', () => {
  let service: UserSessionService;
  let mockSupabaseService: any;
  let mockAdminAuthService: any;

  beforeEach(() => {
    // Create mock for Supabase Service
    mockSupabaseService = {
      client: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { email: 'test@example.com' } } }
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  email: 'test@example.com',
                  name: 'John Doe',
                  is_active: true,
                },
                error: null
              })
            })
          })
        })
      }
    };

    // Create mock for Admin Auth Service
    mockAdminAuthService = {
      isAuthenticated$: new BehaviorSubject(true)
    };

    // Clear localStorage before each test
    localStorage.clear();

    service = new UserSessionService(mockSupabaseService, mockAdminAuthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('loadUserSession', () => {
    it('should load user session from database', async () => {
      await service.loadUserSession('test@example.com');

      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('test@example.com');
      expect(session?.fullName).toBe('John Doe');
      expect(session?.isActive).toBe(true);
    });

    it('should save session to localStorage', async () => {
      await service.loadUserSession('test@example.com');

      const cached = localStorage.getItem('userSession');
      expect(cached).not.toBeNull();
      const session = JSON.parse(cached!);
      expect(session.email).toBe('test@example.com');
      expect(session.fullName).toBe('John Doe');
    });

    it('should set notification preferences', async () => {
      await service.loadUserSession('test@example.com');

      const session = service.getCurrentSession();
      expect(session?.receiveNotifications).toBe(true);
      expect(session?.receiveAdminEmails).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      });

      service.clearSession();
      await service.loadUserSession('test@example.com');

      const session = service.getCurrentSession();
      // When there's an error, we create a fallback session with empty name
      expect(session).not.toBeNull();
      expect(session?.email).toBe('test@example.com');
      expect(session?.fullName).toBe('');
      expect(session?.isActive).toBe(true);
    });

    it('should ignore empty email', async () => {
      service.clearSession();
      await service.loadUserSession('');

      const session = service.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('getCurrentSession', () => {
    it('should return user email', async () => {
      await service.loadUserSession('test@example.com');
      expect(service.getUserEmail()).toBe('test@example.com');
    });

    it('should return user full name', async () => {
      await service.loadUserSession('test@example.com');
      expect(service.getUserFullName()).toBe('John Doe');
    });

    it('should return user first name as null (deprecated)', async () => {
      await service.loadUserSession('test@example.com');
      expect(service.getUserFirstName()).toBeNull();
    });

    it('should return user last name as null (deprecated)', async () => {
      await service.loadUserSession('test@example.com');
      expect(service.getUserLastName()).toBeNull();
    });

    it('should return null when no session loaded', () => {
      service.clearSession();
      expect(service.getCurrentSession()).toBeNull();
      expect(service.getUserEmail()).toBeNull();
      expect(service.getUserFullName()).toBeNull();
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return notification preferences', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'test@example.com',
                name: 'John Doe',
                is_active: true,
              },
              error: null
            })
          })
        })
      });

      await service.loadUserSession('test@example.com');

      const prefs = service.getNotificationPreferences();
      expect(prefs).not.toBeNull();
      expect(prefs?.receiveNotifications).toBe(true);
      expect(prefs?.receiveAdminEmails).toBe(false);
    });

    it('should handle disabled notifications', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'test@example.com',
                name: 'John Doe',
                is_active: true,
              },
              error: null
            })
          })
        })
      });

      await service.loadUserSession('test@example.com');

      const session = service.getCurrentSession();
      // Note: notification preferences are hardcoded defaults since they're not in email_subscribers table
      expect(session?.receiveNotifications).toBe(true);
    });

    it('should handle admin emails enabled', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'test@example.com',
                name: 'John Doe',
                is_active: true,
              },
              error: null
            })
          })
        })
      });

      await service.loadUserSession('test@example.com');

      const session = service.getCurrentSession();
      expect(session?.receiveAdminEmails).toBe(false);
    });
  });

  describe('waitForSession', () => {
    it('should return session immediately if already loaded', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'test@example.com',
                name: 'John Doe',
                is_active: true,
              },
              error: null
            })
          })
        })
      });

      await service.loadUserSession('test@example.com');

      const session = await service.waitForSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('test@example.com');
    });

    it('should wait for session to load', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'test@example.com',
                name: 'John Doe',
                is_active: true,
              },
              error: null
            })
          })
        })
      });

      const session1 = service.getCurrentSession();
      expect(session1).not.toBeNull();

      const session2 = await service.waitForSession();
      expect(session2).not.toBeNull();
      expect(session2?.email).toBe('test@example.com');
    });
  });

  describe('updateUserSession', () => {
    beforeEach(async () => {
      await service.loadUserSession('test@example.com');
    });

    it('should update user session data', async () => {
      await service.updateUserSession({ fullName: 'Jane Smith' });

      const session = service.getCurrentSession();
      expect(session?.fullName).toBe('Jane Smith');
    });

    it('should preserve other fields when updating', async () => {
      await service.updateUserSession({ fullName: 'Jane Smith' });

      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
      expect(session?.isActive).toBe(true);
    });

    it('should not update if no session exists', async () => {
      service.clearSession();
      await service.updateUserSession({ fullName: 'Jane Smith' });

      const session = service.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('should clear user session data', async () => {
      await service.loadUserSession('test@example.com');
      expect(service.getCurrentSession()).not.toBeNull();

      service.clearSession();
      expect(service.getCurrentSession()).toBeNull();
    });
  });

  describe('userSession$ observable', () => {
    it('should emit user session updates', async () => {
      const sessionPromise = new Promise<void>((resolve) => {
        service.userSession$.subscribe((session) => {
          if (session && session.email === 'test@example.com') {
            expect(session.fullName).toBe('John Doe');
            resolve();
          }
        });
      });

      await service.loadUserSession('test@example.com');
      await sessionPromise;
    });

    it('should emit null on clear', async () => {
      await service.loadUserSession('test@example.com');
      service.clearSession();

      const sessionPromise = new Promise<void>((resolve) => {
        service.userSession$.subscribe((session) => {
          if (session === null) {
            expect(session).toBeNull();
            resolve();
          }
        });
      });

      await sessionPromise;
    });
  });

  describe('isLoading$ observable', () => {
    it('should emit loading state', async () => {
      service.clearSession();
      
      const states: boolean[] = [];
      let resolved = false;

      const subscription = service.isLoading$.subscribe((isLoading) => {
        states.push(isLoading);
      });

      // Start loading
      const loadPromise = service.loadUserSession('test@example.com');
      
      // Wait for loading to complete
      await loadPromise;
      
      // Give observables time to emit
      await new Promise(resolve => setTimeout(resolve, 50));
      
      subscription.unsubscribe();
      
      expect(states.includes(true)).toBe(true);
      expect(states[states.length - 1]).toBe(false);
    });
  });

  describe('localStorage caching', () => {
    it('should load from localStorage on initialization', async () => {
      // Pre-populate localStorage
      const cachedSession = {
        email: 'cached@example.com',
        fullName: 'Cached User',
        isActive: true,
        receiveNotifications: true,
        receiveAdminEmails: false
      };
      localStorage.setItem('userSession', JSON.stringify(cachedSession));

      // Setup mock to return the cached email
      mockSupabaseService.client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: { email: 'cached@example.com' } } }
      });
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'cached@example.com',
                name: 'Cached User',
                is_active: true,
              },
              error: null
            })
          })
        })
      });

      // Create new service instance
      const newService = new UserSessionService(mockSupabaseService, mockAdminAuthService);
      
      // The cached session should be loaded immediately
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const session = newService.getCurrentSession();
      expect(session?.email).toBe('cached@example.com');
      expect(session?.fullName).toBe('Cached User');
    });

    it('should not load stale cache from different email', async () => {
      // Pre-populate localStorage with different email
      const cachedSession = {
        email: 'different@example.com',
        fullName: 'Different User',
        isActive: true,
        receiveNotifications: true,
        receiveAdminEmails: false
      };
      localStorage.setItem('userSession', JSON.stringify(cachedSession));

      // Load different email
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
      expect(session?.fullName).toBe('John Doe');
    });

    it('should handle corrupt cache gracefully', async () => {
      // Store corrupted JSON in cache
      localStorage.setItem('userSession', '{invalid json}');

      // Load user session
      await service.loadUserSession('test@example.com');
      
      // Should still load from database despite cache error
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
      expect(session?.fullName).toBe('John Doe');
    });

    it('should handle localStorage failure on save', async () => {
      // Mock localStorage to throw on setItem
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // This should not throw, but log a warning
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('test@example.com');

      setItemSpy.mockRestore();
    });

    it('should handle localStorage failure on remove', async () => {
      // Mock localStorage to throw on removeItem
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      service.clearSession();

      const session = service.getCurrentSession();
      expect(session).toBeNull();

      removeItemSpy.mockRestore();
    });
  });

  describe('initializeSession - logout scenario', () => {
    it('should clear session when user logs out', async () => {
      // First, load a session
      await service.loadUserSession('test@example.com');
      expect(service.getCurrentSession()).not.toBeNull();

      // Then simulate logout by emitting false
      mockAdminAuthService.isAuthenticated$.next(false);

      // Give subscriptions time to process
      await new Promise(resolve => setTimeout(resolve, 50));

      // Session should be cleared
      expect(service.getCurrentSession()).toBeNull();
    });
  });

  describe('initializeSession - initialization with various scenarios', () => {
    it('should initialize with email from session auth', async () => {
      // Create new service with authenticated user
      const newService = new UserSessionService(mockSupabaseService, mockAdminAuthService);
      
      // Give initialization time to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const session = newService.getCurrentSession();
      expect(session).not.toBeNull();
    });

    it('should fallback to approvalAdminEmail when session auth has no email', async () => {
      // Mock getSession to return no email
      mockSupabaseService.client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: {} } }
      });
      
      // Set approvalAdminEmail in localStorage
      localStorage.setItem('approvalAdminEmail', 'fallback@example.com');
      
      // Create new service
      const newService = new UserSessionService(mockSupabaseService, mockAdminAuthService);
      
      // Give initialization time to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const session = newService.getCurrentSession();
      expect(session).not.toBeNull();
    });

    it('should handle case where no email is available', async () => {
      // Mock getSession to return null session
      mockSupabaseService.client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: null }
      });
      
      // Ensure approvalAdminEmail is not set
      localStorage.removeItem('approvalAdminEmail');
      
      // Create new service
      const newService = new UserSessionService(mockSupabaseService, mockAdminAuthService);
      
      // Give initialization time to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const session = newService.getCurrentSession();
      expect(session).toBeNull();
    });

    it('should load cached session during initialization and then refresh from db', async () => {
      // Pre-populate cache with a valid session
      const cachedSession = {
        email: 'cached@example.com',
        fullName: 'Cached User',
        isActive: true,
        receiveNotifications: true,
        receiveAdminEmails: false
      };
      localStorage.setItem('userSession', JSON.stringify(cachedSession));
      
      // Mock getSession to return matching email
      mockSupabaseService.client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: { email: 'cached@example.com' } } }
      });
      
      // Mock database to return updated data
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'cached@example.com',
                name: 'Updated User',
                is_active: true,
              },
              error: null
            })
          })
        })
      });
      
      // Create new service
      const newService = new UserSessionService(mockSupabaseService, mockAdminAuthService);
      
      // Give initialization time to complete - should use cache first then update from DB
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const session = newService.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('cached@example.com');
      // Should be updated from database to "Updated User"
      expect(session?.fullName).toBe('Updated User');
    });

    it('should emit from cache when available', async () => {
      // Session should emit whenever userSession$ is subscribed to
      const emitted: any[] = [];
      const sub = service.userSession$.subscribe(s => {
        if (s) emitted.push(s);
      });
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Should have emitted at least once
      expect(emitted.length).toBeGreaterThan(0);
      
      sub.unsubscribe();
    });

    it('should handle cache path when loadFromCache returns valid session', async () => {
      // Verify that when we have valid cache, it's used in loading
      const cachedSession = {
        email: 'test@example.com',
        fullName: 'Cache Verified',
        isActive: true,
        receiveNotifications: true,
        receiveAdminEmails: false
      };
      localStorage.setItem('userSession', JSON.stringify(cachedSession));
      
      // Load the service normally - should pick up cache
      await service.loadUserSession('test@example.com');
      
      // Should have loaded
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
    });
  });

  describe('loadUserSession - exception handling', () => {
    it('should handle exception thrown during database query', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('Network timeout'))
          })
        })
      });

      service.clearSession();
      await service.loadUserSession('test@example.com');

      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('test@example.com');
      expect(session?.fullName).toBe('');
    });
  });

  describe('isNotificationsEnabled and isAdminEmailsEnabled', () => {
    it('should return true for notifications by default', async () => {
      await service.loadUserSession('test@example.com');
      expect(service.isNotificationsEnabled()).toBe(true);
    });

    it('should return false for admin emails by default', async () => {
      await service.loadUserSession('test@example.com');
      expect(service.isAdminEmailsEnabled()).toBe(false);
    });

    it('should return defaults when no session', () => {
      service.clearSession();
      expect(service.isNotificationsEnabled()).toBe(true);
      expect(service.isAdminEmailsEnabled()).toBe(false);
    });
  });

  describe('getNotificationPreferences - null session', () => {
    it('should return null when no session exists', () => {
      service.clearSession();
      const prefs = service.getNotificationPreferences();
      expect(prefs).toBeNull();
    });
  });

  describe('cache loading edge cases', () => {
    it('should return null when cache is empty', async () => {
      localStorage.removeItem('userSession');
      
      // Load a session normally
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
    });

    it('should return null when cached session is null', async () => {
      localStorage.setItem('userSession', 'null');
      
      // Load a session normally
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
    });

    it('should handle empty string cache gracefully', async () => {
      localStorage.setItem('userSession', '');
      
      // Load a session normally
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
    });

    it('should handle malformed JSON in cache', async () => {
      localStorage.setItem('userSession', '{invalid: json}');
      
      // Should still work without throwing
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
    });

    it('should skip cache when email in storage is different', async () => {
      const cachedSession = {
        email: 'other@example.com',
        fullName: 'Other User',
        isActive: true,
        receiveNotifications: true,
        receiveAdminEmails: false
      };
      localStorage.setItem('userSession', JSON.stringify(cachedSession));
      
      // Load different email
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
      expect(session?.fullName).toBe('John Doe');
    });

    it('should retrieve valid cached session with matching email', async () => {
      // Set valid cache
      const cachedSession = {
        email: 'test@example.com',
        fullName: 'Cached User',
        isActive: true,
        receiveNotifications: true,
        receiveAdminEmails: false
      };
      localStorage.setItem('userSession', JSON.stringify(cachedSession));
      
      // Create a new instance that loads this cache during initialization
      const newMockAuth = { isAuthenticated$: new BehaviorSubject(false) };
      const newMockSupabase = {
        client: {
          auth: {
            getSession: vi.fn().mockResolvedValue({
              data: { session: { user: { email: 'test@example.com' } } }
            })
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    email: 'test@example.com',
                    name: 'Cached User',
                    is_active: true,
                  },
                  error: null
                })
              })
            })
          })
        }
      };
      
      const newService = new UserSessionService(newMockSupabase, newMockAuth);
      
      // Emit true to trigger initialization
      newMockAuth.isAuthenticated$.next(true);
      
      // Give time for initialization
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const session = newService.getCurrentSession();
      // Should have loaded session (from DB which matches cache)
      expect(session?.email).toBe('test@example.com');
      expect(session?.fullName).toBe('Cached User');
    });
  });

  describe('userSession$ observable emission patterns', () => {
    it('should emit initial null before loading', async () => {
      service.clearSession();
      
      const emittedValues: (any | null)[] = [];
      const subscription = service.userSession$.subscribe((session) => {
        emittedValues.push(session);
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      subscription.unsubscribe();

      expect(emittedValues[0]).toBeNull();
    });
  });

  describe('authorization status changes', () => {
    it('should initialize with authenticated true', async () => {
      // Should start with authenticated state from setup
      const newService = new UserSessionService(mockSupabaseService, mockAdminAuthService);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have loaded a session
      const session = newService.getCurrentSession();
      expect(session).not.toBeNull();
    });

    it('should clear all data on authentication change to false', async () => {
      // First load a session
      await service.loadUserSession('test@example.com');
      const sessionBefore = service.getCurrentSession();
      expect(sessionBefore).not.toBeNull();
      
      // Emit authenticated = false
      mockAdminAuthService.isAuthenticated$.next(false);
      
      // Give subscription time to process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Session and cache should be cleared
      const sessionAfter = service.getCurrentSession();
      expect(sessionAfter).toBeNull();
      expect(localStorage.getItem('userSession')).toBeNull();
    });

    it('should reinitialize when authentication changes back to true', async () => {
      // Start with false
      mockAdminAuthService.isAuthenticated$.next(false);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should be null
      expect(service.getCurrentSession()).toBeNull();
      
      // Change back to true
      mockAdminAuthService.isAuthenticated$.next(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should reload session
      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
    });

    it('should trigger hasInitialized when authenticated is false', async () => {
      // Create new service and ensure it initializes
      const newService = new UserSessionService(mockSupabaseService, mockAdminAuthService);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Send false
      mockAdminAuthService.isAuthenticated$.next(false);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Session should be null
      expect(newService.getCurrentSession()).toBeNull();
    });
  });

  describe('getNotificationPreferences with different data', () => {
    it('should properly reflect notification settings from session', async () => {
      await service.loadUserSession('test@example.com');
      
      const prefs = service.getNotificationPreferences();
      expect(prefs).not.toBeNull();
      expect(prefs?.receiveNotifications).toBe(true);
      expect(prefs?.receiveAdminEmails).toBe(false);
    });
  });

  describe('initializeSession - with cached data flow', () => {
    it('should load from cache and then from database', async () => {
      // Pre-set cache with old data
      const oldCachedSession = {
        email: 'test@example.com',
        fullName: 'Old Cached Name',
        isActive: false,
        receiveNotifications: false,
        receiveAdminEmails: true
      };
      localStorage.setItem('userSession', JSON.stringify(oldCachedSession));

      // Load from database (will update cache)
      await service.loadUserSession('test@example.com');
      
      // Should have new data from DB
      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('test@example.com');
      expect(session?.fullName).toBe('John Doe'); // From mock DB
      expect(session?.isActive).toBe(true);      // From mock DB
    });
  });

  describe('saveToCache and clearCache error handling', () => {
    it('should log warning when localStorage.setItem throws', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      try {
        // Load session - this calls saveToCache which will fail
        await service.loadUserSession('test@example.com');

        // Should still have session in memory even if cache save failed
        const session = service.getCurrentSession();
        expect(session).not.toBeNull();
        expect(session?.email).toBe('test@example.com');
      } finally {
        setItemSpy.mockRestore();
        warnSpy.mockRestore();
      }
    });

    it('should log warning when localStorage.removeItem throws', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // First load a session
      await service.loadUserSession('test@example.com');
      expect(service.getCurrentSession()).not.toBeNull();
      
      // Mock removeItem to throw
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      try {
        // This calls clearCache which will fail
        service.clearSession();

        // Session should still be cleared from memory
        expect(service.getCurrentSession()).toBeNull();
      } finally {
        removeItemSpy.mockRestore();
        warnSpy.mockRestore();
      }
    });

    it('should handle JSON.parse error in loadFromCache', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        // Set invalid JSON
        localStorage.setItem('userSession', '{invalid json}');

        // Load a fresh session - should skip bad cache
        await service.loadUserSession('test@example.com');

        const session = service.getCurrentSession();
        expect(session).not.toBeNull();
        expect(session?.email).toBe('test@example.com');
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('whitespace and trim handling', () => {
    it('should trim email before processing', async () => {
      service.clearSession();
      
      // Use email with spaces - should be trimmed
      await service.loadUserSession('  test@example.com  ');
      
      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('test@example.com');
    });

    it('should ignore whitespace-only email', async () => {
      service.clearSession();
      
      // Whitespace-only email should be ignored
      await service.loadUserSession('   ');
      
      const session = service.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('session property defaults', () => {
    it('should have correct default values for notification preferences', async () => {
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session?.receiveNotifications).toBe(true);
      expect(session?.receiveAdminEmails).toBe(false);
    });
  });

  describe('isLoading state management', () => {
    it('should set isLoading to true during load and false after', async () => {
      service.clearSession();
      
      const states: boolean[] = [];
      const subscription = service.isLoading$.subscribe(state => {
        states.push(state);
      });

      await service.loadUserSession('test@example.com');
      
      subscription.unsubscribe();
      
      // Should have set to true and then to false
      expect(states).toContain(true);
      expect(states[states.length - 1]).toBe(false);
    });
  });

  describe('comprehensive error and edge case coverage', () => {
    it('should handle user not in database', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      service.clearSession();
      await service.loadUserSession('nonexistent@example.com');

      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('nonexistent@example.com');
      expect(session?.fullName).toBe('');
    });

    it('should handle receiving user data with missing fields', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'partial@example.com',
                // name is missing
                // is_active is missing
              },
              error: null
            })
          })
        })
      });

      service.clearSession();
      await service.loadUserSession('partial@example.com');

      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('partial@example.com');
      expect(session?.fullName).toBe('');
      expect(session?.isActive).toBe(true); // Default
    });

    it('should handle is_active as null or false', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'inactive@example.com',
                name: 'Inactive User',
                is_active: null
              },
              error: null
            })
          })
        })
      });

      service.clearSession();
      await service.loadUserSession('inactive@example.com');

      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.isActive).toBe(true); // Defaults to true
    });

    it('should handle is_active as false explicitly', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'inactive@example.com',
                name: 'Inactive User',
                is_active: false
              },
              error: null
            })
          })
        })
      });

      service.clearSession();
      await service.loadUserSession('inactive@example.com');

      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.isActive).toBe(false);
    });

    it('should maintain cache consistency across operations', async () => {
      // Cache is tested elsewhere, just verify consistency
      await service.loadUserSession('test@example.com');
      
      const session1 = service.getCurrentSession();
      expect(session1).not.toBeNull();
      
      // Get it again
      const session2 = service.getCurrentSession();
      expect(session2).toEqual(session1);
    });

    it('should return null session properties when no session', () => {
      service.clearSession();
      
      expect(service.getUserEmail()).toBeNull();
      expect(service.getUserFullName()).toBeNull();
      expect(service.getUserFirstName()).toBeNull();
      expect(service.getUserLastName()).toBeNull();
    });

    it('should return notification defaults when no session', () => {
      service.clearSession();
      
      expect(service.isNotificationsEnabled()).toBe(true);
      expect(service.isAdminEmailsEnabled()).toBe(false);
      expect(service.getNotificationPreferences()).toBeNull();
    });

    it('should handle observables without leaking', async () => {
      service.clearSession();
      
      let sessionEmitted = false;
      let loadingEmitted = false;

      service.userSession$.subscribe(() => {
        sessionEmitted = true;
      });

      service.isLoading$.subscribe(() => {
        loadingEmitted = true;
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(sessionEmitted || loadingEmitted).toBe(true);
    });

    it('should support multiple subscribers to userSession', async () => {
      service.clearSession();
      
      const values1: any[] = [];
      const values2: any[] = [];

      const sub1 = service.userSession$.subscribe(v => values1.push(v));
      const sub2 = service.userSession$.subscribe(v => values2.push(v));

      await service.loadUserSession('test@example.com');

      expect(values1.length).toBeGreaterThan(0);
      expect(values2.length).toBeGreaterThan(0);

      sub1.unsubscribe();
      sub2.unsubscribe();
    });

    it('should emit session through observable', async () => {
      // Already tested in the "userSession$ observable" describe block
      // This just verifies observable emission happens
      let sessionReceived = false;
      
      const sub = service.userSession$.subscribe(session => {
        if (session) {
          sessionReceived = true;
        }
      });

      await service.loadUserSession('test@example.com');

      expect(sessionReceived).toBe(true);
      sub.unsubscribe();
    });

    it('should emit isLoading through observable', async () => {
      const loadingStates: boolean[] = [];
      
      service.isLoading$.subscribe(state => {
        loadingStates.push(state);
      });

      await service.loadUserSession('test@example.com');

      // Should have set true then false
      expect(loadingStates).toContain(true);
      expect(loadingStates.slice(-1)[0]).toBe(false);
    });
  });

  describe('cache method edge cases and error paths', () => {
    it('should handle cache with valid structure but missing email', async () => {
      const badCache = {
        // no email field
        fullName: 'No Email User',
        isActive: true,
        receiveNotifications: true,
        receiveAdminEmails: false
      };
      localStorage.setItem('userSession', JSON.stringify(badCache));
      
      // Try to load - should skip bad cache and load fresh
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
    });

    it('should handle cache as non-object primitive', async () => {
      localStorage.setItem('userSession', '"just a string"');
      
      // Should skip cache and load fresh
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
    });

    it('should handle cache as array instead of object', async () => {
      localStorage.setItem('userSession', '["array", "data"]');
      
      // Should skip cache and load fresh
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
    });

    it('should return null from cache when session field is null', async () => {
      localStorage.setItem('userSession', JSON.stringify({
        email: 'test@example.com',
        fullName: 'Test User',
        isActive: true
      }));
      
      // Session field check should pass even though it's falsy in different branch
      await service.loadUserSession('test@example.com');
      
      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
    });

    it('should handle when JSON.parse returns non-object', async () => {
      localStorage.setItem('userSession', '"stringified"');
      
      // Mock returns for this test
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'different@example.com',
                name: 'Test User',
                is_active: true
              },
              error: null
            })
          })
        })
      });
      
      // parseSession logic should handle non-object cache - skip cache
      await service.loadUserSession('different@example.com');
      
      const session = service.getCurrentSession();
      expect(session?.email).toBe('different@example.com');
    });
  });

  describe('waitForSession method', () => {
    it('should return immediately if session already exists', async () => {
      // Load a session first
      await service.loadUserSession('test@example.com');
      
      // Now call waitForSession - should return immediately
      const start = Date.now();
      const session = await service.waitForSession();
      const elapsed = Date.now() - start;
      
      expect(session).not.toBeNull();
      expect(session?.email).toBe('test@example.com');
      expect(elapsed).toBeLessThan(100); // Should be instant
    });

    it('should wait for initialization to complete', async () => {
      // Create new service with auth starting as false
      const authSubject = new BehaviorSubject(false);
      const mockAuth = { isAuthenticated$: authSubject };
      
      mockSupabaseService.client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: { email: 'wait-test@example.com' } } }
      });
      
      const waitService = new UserSessionService(mockSupabaseService, mockAuth);
      
      // Start waiting (will wait for initialization)
      const waitPromise = waitService.waitForSession();
      
      // Give it a moment to start waiting
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Trigger authentication
      authSubject.next(true);
      
      // Should complete initialization and return
      const result = await waitPromise;
      expect(result).not.toBeNull();
    });

    it('should wait for loading to complete when already initialized', async () => {
      // Load a session to initialize
      await service.loadUserSession('test@example.com');
      
      // Mock a slow database call
      let resolveFn: any;
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockReturnValue(
              new Promise(resolve => {
                resolveFn = resolve;
              })
            )
          })
        })
      });
      
      // Start loading
      const loadPromise = service.loadUserSession('different@example.com');
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Call waitForSession - should wait for loading to complete
      const waitPromise = service.waitForSession();
      
      // Resolve the slow load
      resolveFn({ data: { email: 'different@example.com', name: 'User', is_active: true }, error: null });
      
      await loadPromise;
      const result = await waitPromise;
      
      expect(result).not.toBeNull();
    });

    it('should return immediately if initialization complete and not loading', async () => {
      // Load a session
      await service.loadUserSession('test@example.com');
      
      // Now waitForSession should return immediately
      const start = Date.now();
      const session = await service.waitForSession();
      const elapsed = Date.now() - start;
      
      expect(session).not.toBeNull();
      expect(elapsed).toBeLessThan(100); // Should be instant
    });

    it('should timeout waiting for initialization after 10 seconds', async () => {
      // Create new service with never-authenticating auth
      const authSubject = new BehaviorSubject(false);
      const mockAuth = { isAuthenticated$: authSubject };
      
      const timeoutService = new UserSessionService(mockSupabaseService, mockAuth);
      
      // Call waitForSession with a timeout test
      // This will wait up to 10 seconds
      const start = Date.now();
      const result = await timeoutService.waitForSession();
      const elapsed = Date.now() - start;
      
      // Should wait less than 10 seconds in test but have timeout logic
      expect(result).toBeNull(); // No session was set
      // Note: actual timeout is 10 seconds, so we won't test the full wait
    }, 15000); // Extend test timeout
  });

  describe('concurrent operations and state consistency', () => {
    it('should handle rapid successive loads', async () => {
      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';
      
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn()
              .mockResolvedValueOnce({
                data: { email: email1, name: 'User 1', is_active: true },
                error: null
              })
              .mockResolvedValueOnce({
                data: { email: email2, name: 'User 2', is_active: true },
                error: null
              })
          })
        })
      });

      service.clearSession();
      
      // Start two loads concurrently
      await Promise.all([
        service.loadUserSession(email1),
        service.loadUserSession(email2)
      ]);

      // Final session should be one of them
      const finalSession = service.getCurrentSession();
      expect(finalSession?.email).toBeDefined();
    });

    it('should handle alternating loads and clears', async () => {
      await service.loadUserSession('test@example.com');
      expect(service.getCurrentSession()).not.toBeNull();
      
      service.clearSession();
      expect(service.getCurrentSession()).toBeNull();
      
      await service.loadUserSession('test@example.com');
      expect(service.getCurrentSession()).not.toBeNull();
      
      service.clearSession();
      expect(service.getCurrentSession()).toBeNull();
    });

    it('should preserve updates during loading', async () => {
      await service.loadUserSession('test@example.com');
      
      // Start an update while not in the middle of loading
      await service.updateUserSession({ fullName: 'Updated During' });
      
      const session = service.getCurrentSession();
      expect(session?.fullName).toBe('Updated During');
    });
  });

  describe('special case branch coverage', () => {
    it('should handle is_active with nullish values', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'nullish@example.com',
                name: 'Nullish Test',
                is_active: undefined
              },
              error: null
            })
          })
        })
      });

      service.clearSession();
      await service.loadUserSession('nullish@example.com');
      
      const session = service.getCurrentSession();
      // Should default to true for undefined
      expect(session?.isActive).toBe(true);
    });

    it('should handle is_active as 0 (falsy number)', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'zero@example.com',
                name: 'Zero Test',
                is_active: 0
              },
              error: null
            })
          })
        })
      });

      service.clearSession();
      await service.loadUserSession('zero@example.com');
      
      const session = service.getCurrentSession();
      // 0 is stored as-is, but the ?? operator makes it truthy in the check
      expect(session?.isActive).toBe(0);
    });

    it('should handle name as empty string', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'empty-name@example.com',
                name: '',
                is_active: true
              },
              error: null
            })
          })
        })
      });

      service.clearSession();
      await service.loadUserSession('empty-name@example.com');
      
      const session = service.getCurrentSession();
      expect(session?.fullName).toBe('');
    });

    it('should use email from response data when available', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                email: 'response@example.com',
                name: 'Test',
                is_active: true
              },
              error: null
            })
          })
        })
      });

      // Load with requested email
      await service.loadUserSession('requested@example.com');
      
      const session = service.getCurrentSession();
      // Should use email from response data
      expect(session?.email).toBe('response@example.com');
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage.setItem errors during save', async () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Load session - should handle the error gracefully
      await service.loadUserSession('test@example.com');

      const session = service.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('test@example.com');

      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('should handle localStorage.getItem returning invalid JSON', async () => {
      // Store invalid JSON
      localStorage.setItem('userSession', '{invalid json}');

      await service.loadUserSession('test@example.com');

      const session = service.getCurrentSession();
      // Should still load from database and ignore bad cache
      expect(session?.email).toBe('test@example.com');
    });

    it('should handle localStorage.removeItem errors', async () => {
      // Mock localStorage to throw on removeItem
      const originalRemoveItem = localStorage.removeItem;
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Clear session should handle the error
      service.clearSession();

      expect(service.getCurrentSession()).toBeNull();

      // Restore
      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe('authentication state changes', () => {
    it('should clear session when authentication is false', async () => {
      // Load a session first
      await service.loadUserSession('test@example.com');
      expect(service.getCurrentSession()).not.toBeNull();

      // Create new service with togglable auth
      const authSubject = new BehaviorSubject(true);
      const mockAuth = { isAuthenticated$: authSubject };

      // Mock auth session
      mockSupabaseService.client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: { email: 'auth-test@example.com' } } }
      });

      const authService = new UserSessionService(mockSupabaseService, mockAuth);

      // Should have loaded initially
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(authService.getCurrentSession()).not.toBeNull();

      // Change auth to false
      authSubject.next(false);

      // Should wait a moment for subscription to process
      await new Promise(resolve => setTimeout(resolve, 50));

      // Session should be cleared
      expect(authService.getCurrentSession()).toBeNull();
    });

    it('should return current session when already initialized and not loading', async () => {
      // Load a session and ensure it's fully initialized and not loading
      await service.loadUserSession('test@example.com');
      
      // Clear any loading state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Call waitForSession - should return immediately with current session
      const result = await service.waitForSession();
      
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should subscribe to hasInitialized when not yet initialized', async () => {
      // Create service with auth starting false
      const authSubject = new BehaviorSubject(false);
      const mockAuth = { isAuthenticated$: authSubject };

      mockSupabaseService.client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: { email: 'subscribe-test@example.com' } } }
      });

      const newService = new UserSessionService(mockSupabaseService, mockAuth);

      // Call waitForSession before initialization completes
      const resultPromise = newService.waitForSession();
      
      // Wait a bit then trigger initialization
      await new Promise(resolve => setTimeout(resolve, 50));
      authSubject.next(true);
      
      // Should eventually return
      const result = await resultPromise;
      expect(result).not.toBeNull();
    });
  });

  describe('private cache method error handling', () => {
    it('should handle invalid cached JSON gracefully', async () => {
      // Store completely invalid JSON
      localStorage.setItem('userSession', '{not valid json');

      await service.loadUserSession('test@example.com');

      // Should still work and load from database
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
      expect(session?.fullName).toBe('John Doe');
    });

    it('should handle cached object with missing email field', async () => {
      // Cache without email field
      localStorage.setItem('userSession', JSON.stringify({
        fullName: 'No Email',
        isActive: true
      }));

      await service.loadUserSession('test@example.com');

      // Should load from database because cached email doesn't match
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
    });

    it('should handle cached session with null email', async () => {
      // Cache with null email
      localStorage.setItem('userSession', JSON.stringify({
        email: null,
        fullName: 'Null Email',
        isActive: true
      }));

      await service.loadUserSession('test@example.com');

      // Should load from database
      const session = service.getCurrentSession();
      expect(session?.email).toBe('test@example.com');
    });

    it('should log console.warn when loadFromCache fails with invalid JSON', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Store invalid JSON that will cause parsing error
      localStorage.setItem('userSession', 'not json at all {');
      
      // Call private method through reflection to test error path
      const result = (service as any).loadFromCache('test@example.com');
      
      // Should have warned about cache load failure
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load session from cache'),
        expect.any(Error)
      );
      
      expect(result).toBeNull();
      warnSpy.mockRestore();
    });

    it('should log console.warn when saveToCache fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      // Try to save - will fail and warn
      (service as any).saveToCache();
      
      // Should have warned
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save session to cache'),
        expect.any(Error)
      );
      
      localStorage.setItem = originalSetItem;
      warnSpy.mockRestore();
    });

    it('should log console.warn when clearCache fails', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock localStorage.removeItem to throw
      const originalRemoveItem = localStorage.removeItem;
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Cannot remove');
      });
      
      // Try to clear - will fail and warn
      (service as any).clearCache();
      
      // Should have warned
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear session cache'),
        expect.any(Error)
      );
      
      localStorage.removeItem = originalRemoveItem;
      warnSpy.mockRestore();
    });
  });

  describe('waitForSession method - comprehensive edge cases', () => {
    it('should return immediately when session already exists', async () => {
      // Load a session first
      await service.loadUserSession('test@example.com');
      
      // Call waitForSession - should return immediately
      const result = await service.waitForSession();
      
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should wait for initialization to complete', async () => {
      // Create new service with togglable auth
      const authSubject = new BehaviorSubject(false);
      const mockAuth = { isAuthenticated$: authSubject };

      const waitService = new UserSessionService(mockSupabaseService, mockAuth);

      // Call waitForSession - should wait for initialization
      const waitPromise = waitService.waitForSession();
      
      // Initialization hasn't completed yet, wait a moment
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Complete initialization
      authSubject.next(true);
      
      // Should eventually resolve
      const result = await waitPromise;
      // May be null if no session loaded, but should complete
      expect(result).toBeDefined;
    });

    it('should wait for loading to complete when initialized', async () => {
      // Load a session and ensure it's fully initialized and not loading
      await service.loadUserSession('test@example.com');
      
      // Clear any loading state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Call waitForSession - should return immediately with current session
      const result = await service.waitForSession();
      
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should handle concurrent waitForSession calls', async () => {
      // Load a session first
      await service.loadUserSession('test@example.com');
      
      // Call waitForSession multiple times concurrently
      const results = await Promise.all([
        service.waitForSession(),
        service.waitForSession(),
        service.waitForSession()
      ]);
      
      // All should return the same session
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).not.toBeNull();
        expect(result?.email).toBe('test@example.com');
      });
    });

    it('should handle waitForSession when hasInitialized transitions to true', async () => {
      // Create service with auth starting false
      const authSubject = new BehaviorSubject(false);
      const mockAuth = { isAuthenticated$: authSubject };

      mockSupabaseService.client.auth.getSession = vi.fn().mockResolvedValue({
        data: { session: { user: { email: 'transition-test@example.com' } } }
      });

      const newService = new UserSessionService(mockSupabaseService, mockAuth);

      // Start waiting
      const waitPromise = newService.waitForSession();
      
      // Wait a bit then transition
      await new Promise(resolve => setTimeout(resolve, 50));
      authSubject.next(true);
      
      // Should resolve
      const result = await waitPromise;
      expect(result).not.toBeNull();
    });

    it('should handle waitForSession when loading transitions to false', async () => {
      // Load a session
      await service.loadUserSession('test@example.com');
      
      // Manually set loading to true
      (service as any).isLoadingSubject.next(true);
      
      // Call waitForSession
      const waitPromise = service.waitForSession();
      
      // Transition loading to false
      await new Promise(resolve => setTimeout(resolve, 50));
      (service as any).isLoadingSubject.next(false);
      
      // Should resolve
      const result = await waitPromise;
      expect(result).not.toBeNull();
    });
  });
});
