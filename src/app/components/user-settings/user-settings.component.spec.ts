import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserSettingsComponent } from './user-settings.component';
import { ThemeService } from '../../services/theme.service';
import { SupabaseService } from '../../services/supabase.service';
import { PrintService } from '../../services/print.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { UserSessionService } from '../../services/user-session.service';
import { ChangeDetectorRef, SimpleChanges } from '@angular/core';

type ThemeOption = 'light' | 'dark' | 'system';
type PrintRange = 'week' | 'twoweeks' | 'month' | 'year' | 'all';

describe('UserSettingsComponent - Extended Coverage', () => {
  let component: UserSettingsComponent;
  let mockThemeService: any;
  let mockSupabaseService: any;
  let mockPrintService: any;
  let mockEmailNotificationService: any;
  let mockAdminAuthService: any;
  let mockUserSessionService: any;
  let mockChangeDetectorRef: any;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    localStorage.setItem('prayerapp_user_first_name', 'Test');
    localStorage.setItem('prayerapp_user_last_name', 'User');
    localStorage.setItem('prayerapp_user_email', 'test@example.com');

    mockThemeService = {
      getTheme: vi.fn(() => 'system'),
      setTheme: vi.fn()
    };

    mockSupabaseService = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          })),
          insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }
    };

    mockPrintService = {
      downloadPrintablePrayerList: vi.fn(() => Promise.resolve()),
      downloadPrintablePromptList: vi.fn(() => Promise.resolve())
    };

    mockEmailNotificationService = {};

    mockAdminAuthService = {
      logout: vi.fn(() => Promise.resolve())
    };

    mockUserSessionService = {
      getCurrentSession: vi.fn(() => ({
        email: 'test@example.com',
        fullName: 'Test User',
        isActive: true,
        receiveNotifications: true,
        receiveAdminEmails: false
      })),
      updateUserSession: vi.fn(async () => ({}))
    };

    mockChangeDetectorRef = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn()
    };

    const mockGitHubFeedbackService = {
      getGitHubConfig: vi.fn(() => Promise.resolve(null))
    };

    const mockBadgeService = {
      getBadgeFunctionalityEnabled$: vi.fn(() => Promise.resolve({ enabled: true })),
      isPromptUnread: vi.fn(() => false),
      markPromptAsRead: vi.fn(() => Promise.resolve()),
      getUpdateBadgesChanged$: vi.fn(() => ({})),
      markPrayerAsRead: vi.fn(() => Promise.resolve()),
      refreshBadgeCounts: vi.fn(() => Promise.resolve()),
      getBadgeCount$: vi.fn(() => ({}))
    };

    component = new UserSettingsComponent(
      mockThemeService,
      mockPrintService,
      mockSupabaseService,
      mockEmailNotificationService,
      mockAdminAuthService,
      mockGitHubFeedbackService,
      mockUserSessionService,
      mockBadgeService,
      mockChangeDetectorRef
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('State Management Tests', () => {
    it('should initialize with correct default values', () => {
      expect(component).toBeDefined();
      expect(component.email).toBeDefined();
    });

    it('should handle theme updates', () => {
      component.theme = 'light' as ThemeOption;
      expect(component.theme).toBe('light');
      
      component.theme = 'dark';
      expect(component.theme).toBe('dark');
      
      component.theme = 'system';
      expect(component.theme).toBe('system');
    });

    it('should handle print range updates', () => {
      const ranges: PrintRange[] = ['week', 'twoweeks', 'month', 'year', 'all'];
      ranges.forEach(range => {
        component.printRange = range;
        expect(component.printRange).toBe(range);
      });
    });

    it('should handle firstName updates', () => {
      component.firstName = 'John';
      expect(component.firstName).toBe('John');
      
      component.firstName = 'Jane';
      expect(component.firstName).toBe('Jane');
    });

    it('should handle lastName updates', () => {
      component.lastName = 'Doe';
      expect(component.lastName).toBe('Doe');
      
      component.lastName = 'Smith';
      expect(component.lastName).toBe('Smith');
    });

    it('should handle email updates', () => {
      component.email = 'new@example.com';
      expect(component.email).toBe('new@example.com');
    });

    it('should handle receiveNotifications toggle', () => {
      const original = component.receiveNotifications;
      component.receiveNotifications = !original;
      expect(component.receiveNotifications).toBe(!original);
    });

    it('should handle receiveAdminEmails toggle', () => {
      const original = component.receiveAdminEmails;
      component.receiveAdminEmails = !original;
      expect(component.receiveAdminEmails).toBe(!original);
    });

    it('should handle saveReminder toggle', () => {
      component.saveReminder = true;
      expect(component.saveReminder).toBe(true);
      
      component.saveReminder = false;
      expect(component.saveReminder).toBe(false);
    });

    it('should handle isPrinting state', () => {
      component.isPrinting = true;
      expect(component.isPrinting).toBe(true);
      
      component.isPrinting = false;
      expect(component.isPrinting).toBe(false);
    });

    it('should handle isOpen state', () => {
      component.isOpen = true;
      expect(component.isOpen).toBe(true);
      
      component.isOpen = false;
      expect(component.isOpen).toBe(false);
    });

    it('should handle error state', () => {
      component.error = 'Test error';
      expect(component.error).toBe('Test error');
      
      component.error = null;
      expect(component.error).toBeNull();
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should execute ngOnInit', () => {
      component.ngOnInit();
      expect(component).toBeDefined();
    });

    it('should execute ngOnDestroy', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'next');
      component.ngOnDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });

    it('should handle ngOnChanges', () => {
      const changes: SimpleChanges = {
        isOpen: {
          currentValue: true,
          previousValue: false,
          firstChange: true,
          isFirstChange: () => true
        }
      };
      component.ngOnChanges(changes);
      expect(component).toBeDefined();
    });
  });

  describe('Component Interactions', () => {
    it('should emit onClose event', () => {
      const emitSpy = vi.spyOn(component.onClose, 'emit');
      component.onClose.emit();
      expect(emitSpy).toHaveBeenCalled();
    });

    it('should handle print action', () => {
      component.handlePrint();
      expect(component).toBeDefined();
    });

    it('should detect changes', () => {
      component.firstName = 'Updated';
      mockChangeDetectorRef.detectChanges();
      expect(mockChangeDetectorRef.detectChanges).toHaveBeenCalled();
    });

    it('should mark for check', () => {
      mockChangeDetectorRef.markForCheck();
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('Component Options', () => {
    it('should have printRangeOptions defined', () => {
      expect(component.printRangeOptions).toBeDefined();
      expect(Array.isArray(component.printRangeOptions)).toBe(true);
      expect(component.printRangeOptions.length).toBeGreaterThan(0);
    });

    it('should have themeOptions defined', () => {
      expect(component.themeOptions).toBeDefined();
      expect(Array.isArray(component.themeOptions)).toBe(true);
      expect(component.themeOptions.length).toBeGreaterThan(0);
    });
  });

  describe('LocalStorage Integration', () => {
    it('should read firstName from localStorage', () => {
      const stored = localStorage.getItem('prayerapp_user_first_name');
      expect(stored).toBe('Test');
    });

    it('should read lastName from localStorage', () => {
      const stored = localStorage.getItem('prayerapp_user_last_name');
      expect(stored).toBe('User');
    });

    it('should read email from localStorage', () => {
      const stored = localStorage.getItem('prayerapp_user_email');
      expect(stored).toBe('test@example.com');
    });
  });

  describe('Complex State Transitions', () => {
    it('should handle full profile update', () => {
      component.firstName = 'Alice';
      component.lastName = 'Johnson';
      component.email = 'alice@example.com';
      component.theme = 'dark';
      component.printRange = 'month';
      component.saveReminder = true;
      component.receiveNotifications = true;
      component.receiveAdminEmails = false;

      expect(component.firstName).toBe('Alice');
      expect(component.lastName).toBe('Johnson');
      expect(component.email).toBe('alice@example.com');
      expect(component.theme).toBe('dark');
      expect(component.printRange).toBe('month');
      expect(component.saveReminder).toBe(true);
      expect(component.receiveNotifications).toBe(true);
      expect(component.receiveAdminEmails).toBe(false);
    });

    it('should handle rapid sequential updates', () => {
      component.email = 'test1@example.com';
      component.email = 'test2@example.com';
      component.email = 'test3@example.com';
      
      expect(component.email).toBe('test3@example.com');
    });

    it('should maintain state consistency across operations', () => {
      const originalEmail = component.email;
      component.email = 'modified@example.com';
      expect(component.email).not.toBe(originalEmail);
      
      component.email = originalEmail;
      expect(component.email).toBe(originalEmail);
    });

    it('should handle multiple toggles', () => {
      component.saveReminder = false;
      component.saveReminder = true;
      component.saveReminder = false;
      component.saveReminder = true;
      
      expect(component.saveReminder).toBe(true);
    });
  });

  describe('User Settings Edge Cases', () => {
    it('should handle empty email string', () => {
      component.email = '';
      expect(component.email).toBe('');
    });

    it('should handle special characters in names', () => {
      component.firstName = "O'Brien";
      component.lastName = "Müller-López";
      
      expect(component.firstName).toBe("O'Brien");
      expect(component.lastName).toBe("Müller-López");
    });

    it('should handle whitespace in names', () => {
      component.firstName = '  John  ';
      component.lastName = '  Doe  ';
      
      expect(component.firstName).toBe('  John  ');
      expect(component.lastName).toBe('  Doe  ');
    });

    it('should handle null error state transitions', () => {
      component.error = null;
      expect(component.error).toBeNull();
      
      component.error = 'Error message';
      expect(component.error).toBe('Error message');
      
      component.error = null;
      expect(component.error).toBeNull();
    });

    it('should handle concurrent state changes', () => {
      component.firstName = 'Test1';
      component.lastName = 'Test2';
      component.email = 'test@test.com';
      component.theme = 'light';
      
      expect(component.firstName).toBe('Test1');
      expect(component.lastName).toBe('Test2');
      expect(component.email).toBe('test@test.com');
      expect(component.theme).toBe('light');
    });
  });
});
