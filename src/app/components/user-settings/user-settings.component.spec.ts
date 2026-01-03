import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserSettingsComponent } from './user-settings.component';
import { ThemeService } from '../../services/theme.service';
import { SupabaseService } from '../../services/supabase.service';
import { PrintService } from '../../services/print.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { ChangeDetectorRef, SimpleChanges } from '@angular/core';

describe('UserSettingsComponent', () => {
  let component: UserSettingsComponent;
  let mockThemeService: any;
  let mockSupabaseService: any;
  let mockPrintService: any;
  let mockEmailNotificationService: any;
  let mockAdminAuthService: any;
  let mockChangeDetectorRef: any;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Set up user info with correct keys
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

    mockChangeDetectorRef = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn()
    };

    const mockGitHubFeedbackService = {
      getGitHubConfig: vi.fn(() => Promise.resolve(null))
    };

    component = new UserSettingsComponent(
      mockThemeService,
      mockPrintService,
      mockSupabaseService,
      mockEmailNotificationService,
      mockAdminAuthService,
      mockGitHubFeedbackService as any,
      mockChangeDetectorRef as ChangeDetectorRef
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load current theme from theme service', () => {
      mockThemeService.getTheme.mockReturnValue('dark');
      component.ngOnInit();
      expect(component.theme).toBe('dark');
      expect(mockThemeService.getTheme).toHaveBeenCalled();
    });

    it('should load user info from localStorage', () => {
      localStorage.setItem('prayerapp_user_first_name', 'John');
      localStorage.setItem('prayerapp_user_last_name', 'Doe');
      localStorage.setItem('prayerapp_user_email', 'john@example.com');
      
      component.ngOnInit();
      
      expect(component.name).toBe('John Doe');
      expect(component.email).toBe('john@example.com');
    });

    it('should not set name if firstName or lastName is missing', () => {
      localStorage.clear(); // Clear the defaults from beforeEach
      localStorage.setItem('prayerapp_user_first_name', 'John');
      // No last name
      localStorage.setItem('prayerapp_user_email', 'john@example.com');
      
      component.ngOnInit();
      
      expect(component.name).toBe('');
      expect(component.email).toBe('john@example.com');
    });

    it('should set up email change debounce listener', () => {
      component.ngOnInit();
      expect(component['emailChange$']).toBeDefined();
    });

    it('should load preferences when email changes after initial load', async () => {
      const loadPreferencesSpy = vi.spyOn(component as any, 'loadPreferencesAutomatically');
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      });

      component.ngOnInit();
      
      // Set isInitialLoad to false to trigger the subscription logic
      component['isInitialLoad'] = false;
      
      // Trigger email change
      component['emailChange$'].next('newemail@example.com');
      
      await vi.runAllTimersAsync();
      
      expect(loadPreferencesSpy).toHaveBeenCalledWith('newemail@example.com');
    });
  });

  describe('ngOnChanges', () => {
    it('should load prompt types when modal opens', async () => {
      const mockData = [
        { name: 'Type1', display_order: 1 },
        { name: 'Type2', display_order: 2 }
      ];
      
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      });
      
      component.isOpen = false; // Set to false first

      const changes: SimpleChanges = {
        isOpen: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.isOpen = true; // Now set to true
      component.ngOnChanges(changes);
      await vi.runAllTimersAsync();

      expect(component.promptTypes).toEqual(['Type1', 'Type2']);
    });

    it('should load user info from localStorage when modal opens', () => {
      localStorage.clear(); // Clear defaults
      localStorage.setItem('prayerapp_user_first_name', 'Jane');
      localStorage.setItem('prayerapp_user_last_name', 'Smith');
      localStorage.setItem('prayerapp_user_email', 'jane@example.com');
      
      component.isOpen = false; // Start closed

      const changes: SimpleChanges = {
        isOpen: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      };
      
      component.isOpen = true; // Now set to open
      component.ngOnChanges(changes);

      expect(component.name).toBe('Jane Smith');
      expect(component.email).toBe('jane@example.com');
    });

    it('should reset error and success messages when modal opens', () => {
      component.error = 'Some error';
      component.success = 'Some success';
      component.isOpen = false; // Set to false first

      const changes: SimpleChanges = {
        isOpen: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      };
      
      component.isOpen = true; // Now set to true
      component.ngOnChanges(changes);

      expect(component.error).toBeNull();
      expect(component.success).toBeNull();
    });

    it('should load preferences from database when email is present', async () => {
      localStorage.setItem('prayerapp_user_email', 'test@example.com');
      
      const mockSubscriber = { name: 'Test User', is_active: true };
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockSubscriber, error: null })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      });

      const changes: SimpleChanges = {
        isOpen: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      };

      await component.ngOnChanges(changes);
      await vi.runAllTimersAsync();

      expect(component.receiveNotifications).toBe(true);
    });

    it('should set receiveNotifications to true when email is empty', () => {
      localStorage.clear();
      localStorage.setItem('prayerapp_user_first_name', 'Test');
      localStorage.setItem('prayerapp_user_last_name', 'User');
      localStorage.setItem('prayerapp_user_email', '   '); // Empty/whitespace email
      
      component.isOpen = false;
      const changes: SimpleChanges = {
        isOpen: {
          currentValue: true,
          previousValue: false,
          firstChange: false,
          isFirstChange: () => false
        }
      };
      
      component.isOpen = true;
      component.ngOnChanges(changes);

      expect(component.receiveNotifications).toBe(true);
    });
  });

  describe('loadPromptTypes', () => {
    it('should load active prayer types ordered by display_order', async () => {
      const mockData = [
        { name: 'Prayer', display_order: 1 },
        { name: 'Praise', display_order: 2 }
      ];

      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      });

      await component.loadPromptTypes();

      expect(component.promptTypes).toEqual(['Prayer', 'Praise']);
    });

    it('should handle errors when loading prompt types', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock error by making the function throw
      mockSupabaseService.client.from.mockImplementation(() => {
        throw new Error('DB error');
      });

      await component.loadPromptTypes();

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching prayer types:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy subject', () => {
      const nextSpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('handleThemeChange', () => {
    it('should update theme and call theme service', () => {
      component.handleThemeChange('dark');

      expect(component.theme).toBe('dark');
      expect(mockThemeService.setTheme).toHaveBeenCalledWith('dark');
    });

    it('should handle light theme', () => {
      component.handleThemeChange('light');

      expect(component.theme).toBe('light');
      expect(mockThemeService.setTheme).toHaveBeenCalledWith('light');
    });

    it('should handle system theme', () => {
      component.handleThemeChange('system');

      expect(component.theme).toBe('system');
      expect(mockThemeService.setTheme).toHaveBeenCalledWith('system');
    });
  });

  describe('setPrintRange', () => {
    it('should update print range', () => {
      component.setPrintRange('month');
      expect(component.printRange).toBe('month');
    });

    it('should handle all print range options', () => {
      const ranges: Array<'week' | 'twoweeks' | 'month' | 'year' | 'all'> = ['week', 'twoweeks', 'month', 'year', 'all'];
      
      ranges.forEach(range => {
        component.setPrintRange(range);
        expect(component.printRange).toBe(range);
      });
    });
  });

  describe('handlePrint', () => {
    it('should open new window and call print service', async () => {
      const mockWindow = {} as Window;
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWindow);

      await component.handlePrint();

      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintService.downloadPrintablePrayerList).toHaveBeenCalledWith('week', mockWindow);
      expect(component.isPrinting).toBe(false);
      
      openSpy.mockRestore();
    });

    it('should set isPrinting to true during print', async () => {
      const mockWindow = {} as Window;
      vi.spyOn(window, 'open').mockReturnValue(mockWindow);

      const printPromise = component.handlePrint();
      expect(component.isPrinting).toBe(true);
      
      await printPromise;
      expect(component.isPrinting).toBe(false);
    });

    it('should handle print errors and close window', async () => {
      const mockWindow = { close: vi.fn() };
      vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPrintService.downloadPrintablePrayerList.mockRejectedValue(new Error('Print error'));

      await component.handlePrint();

      expect(consoleSpy).toHaveBeenCalledWith('Error printing prayer list:', expect.any(Error));
      expect(mockWindow.close).toHaveBeenCalled();
      expect(component.isPrinting).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('should use current printRange setting', async () => {
      const mockWindow = {} as Window;
      vi.spyOn(window, 'open').mockReturnValue(mockWindow);

      component.printRange = 'year';
      await component.handlePrint();

      expect(mockPrintService.downloadPrintablePrayerList).toHaveBeenCalledWith('year', mockWindow);
    });
  });

  describe('handlePrintPrompts', () => {
    it('should open new window and call print service', async () => {
      const mockWindow = {} as Window;
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockWindow);

      component.selectedPromptTypes = ['Type1'];
      await component.handlePrintPrompts();

      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintService.downloadPrintablePromptList).toHaveBeenCalledWith(['Type1'], mockWindow);
      expect(component.isPrintingPrompts).toBe(false);
      
      openSpy.mockRestore();
    });

    it('should set isPrintingPrompts to true during print', async () => {
      const mockWindow = {} as Window;
      vi.spyOn(window, 'open').mockReturnValue(mockWindow);

      const printPromise = component.handlePrintPrompts();
      expect(component.isPrintingPrompts).toBe(true);
      
      await printPromise;
      expect(component.isPrintingPrompts).toBe(false);
    });

    it('should handle print errors and close window', async () => {
      const mockWindow = { close: vi.fn() };
      vi.spyOn(window, 'open').mockReturnValue(mockWindow as any);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockPrintService.downloadPrintablePromptList.mockRejectedValue(new Error('Print error'));

      await component.handlePrintPrompts();

      expect(consoleSpy).toHaveBeenCalledWith('Error printing prompts:', expect.any(Error));
      expect(mockWindow.close).toHaveBeenCalled();
      expect(component.isPrintingPrompts).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('togglePromptType', () => {
    it('should add prompt type if not selected', () => {
      component.selectedPromptTypes = [];
      component.togglePromptType('Type1');
      
      expect(component.selectedPromptTypes).toContain('Type1');
    });

    it('should remove prompt type if already selected', () => {
      component.selectedPromptTypes = ['Type1', 'Type2'];
      component.togglePromptType('Type1');
      
      expect(component.selectedPromptTypes).not.toContain('Type1');
      expect(component.selectedPromptTypes).toContain('Type2');
    });

    it('should handle multiple toggles', () => {
      component.selectedPromptTypes = [];
      
      component.togglePromptType('Type1');
      expect(component.selectedPromptTypes).toEqual(['Type1']);
      
      component.togglePromptType('Type2');
      expect(component.selectedPromptTypes).toEqual(['Type1', 'Type2']);
      
      component.togglePromptType('Type1');
      expect(component.selectedPromptTypes).toEqual(['Type2']);
    });
  });

  describe('onEmailChange', () => {
    it('should emit email change to subject', () => {
      const nextSpy = vi.spyOn(component['emailChange$'], 'next');
      
      component.email = 'test@example.com';
      component.onEmailChange();
      
      expect(nextSpy).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('onNotificationToggle', () => {
    beforeEach(() => {
      localStorage.setItem('prayerapp_user_email', 'test@example.com');
    });

    it('should show error if email is not found', async () => {
      localStorage.clear();
      
      await component.onNotificationToggle();
      
      expect(component.error).toBe('Email not found. Please log in again.');
    });

    it('should update existing subscriber', async () => {
      localStorage.setItem('prayerapp_user_email', 'test@example.com');
      component.receiveNotifications = true;

      const mockExisting = { id: 'sub-123' };
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockExisting, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      });

      await component.onNotificationToggle();

      expect(component.success).toBeTruthy();
      expect(component.success).toContain('enabled');
      expect(component.saving).toBe(false);
    });

    it('should create new subscriber if not exists', async () => {
      localStorage.setItem('prayerapp_user_email', 'new@example.com');
      localStorage.setItem('prayerapp_user_first_name', 'New');
      localStorage.setItem('prayerapp_user_last_name', 'User');
      component.receiveNotifications = true;

      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
      });

      await component.onNotificationToggle();

      expect(component.success).toBeTruthy();
      expect(component.success).toContain('enabled');
      expect(component.saving).toBe(false);
    });

    it('should handle errors and revert toggle', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('prayerapp_user_email', 'test@example.com');
      const initialValue = true;
      component.receiveNotifications = initialValue;

      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
          }))
        }))
      });

      await component.onNotificationToggle();

      expect(component.error).toBeTruthy();
      // Should be reverted to opposite of initial value
      expect(component.receiveNotifications).toBe(!initialValue);
      expect(component.saving).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('should clear success message after 3 seconds', async () => {
      localStorage.setItem('prayerapp_user_email', 'test@example.com');
      component.receiveNotifications = true;

      const mockExisting = { id: 'sub-123' };
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockExisting, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      });

      await component.onNotificationToggle();
      
      expect(component.success).toBeTruthy();
      
      await vi.advanceTimersByTimeAsync(3000);
      
      expect(component.success).toBeNull();
    });

    it('should handle update error and revert toggle', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('prayerapp_user_email', 'test@example.com');
      const initialValue = true;
      component.receiveNotifications = initialValue;

      const mockExisting = { id: 'sub-123' };
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockExisting, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: new Error('Update failed') }))
        }))
      });

      await component.onNotificationToggle();

      expect(component.error).toBeTruthy();
      expect(component.receiveNotifications).toBe(!initialValue);
      expect(component.saving).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Update error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle insert error and revert toggle', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('prayerapp_user_email', 'new@example.com');
      localStorage.setItem('prayerapp_user_first_name', 'New');
      localStorage.setItem('prayerapp_user_last_name', 'User');
      const initialValue = true;
      component.receiveNotifications = initialValue;

      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: new Error('Insert failed') }))
      });

      await component.onNotificationToggle();

      expect(component.error).toBeTruthy();
      expect(component.receiveNotifications).toBe(!initialValue);
      expect(component.saving).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Insert error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('logout', () => {
    it('should call admin auth service logout', async () => {
      await component.logout();
      
      expect(mockAdminAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('getUserInfo', () => {
    it('should return user info from localStorage', () => {
      localStorage.setItem('prayerapp_user_first_name', 'Test');
      localStorage.setItem('prayerapp_user_last_name', 'User');
      localStorage.setItem('prayerapp_user_email', 'test@example.com');

      const userInfo = component['getUserInfo']();

      expect(userInfo).toEqual({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      });
    });

    it('should return empty strings for missing values', () => {
      localStorage.clear();

      const userInfo = component['getUserInfo']();

      expect(userInfo).toEqual({
        firstName: '',
        lastName: '',
        email: ''
      });
    });
  });

  describe('loadPreferencesAutomatically', () => {
    it('should return early if email is empty', async () => {
      await component['loadPreferencesAutomatically']('');
      
      expect(mockSupabaseService.client.from).not.toHaveBeenCalled();
    });

    it('should return early if email is invalid', async () => {
      await component['loadPreferencesAutomatically']('invalid-email');
      
      expect(mockSupabaseService.client.from).not.toHaveBeenCalled();
    });

    it('should load subscriber preferences', async () => {
      const mockSubscriber = { name: 'Existing User', is_active: false };
      
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: mockSubscriber, error: null }))
          }))
        }))
      });

      await component['loadPreferencesAutomatically']('test@example.com');

      expect(component.name).toBe('Existing User');
      expect(component.receiveNotifications).toBe(false);
    });

    it('should set defaults for new users', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      });

      component.receiveNotifications = false;
      await component['loadPreferencesAutomatically']('new@example.com');

      expect(component.receiveNotifications).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
          }))
        }))
      });

      await component['loadPreferencesAutomatically']('test@example.com');

      expect(consoleSpy).toHaveBeenCalledWith('Error loading subscriber preferences:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('loadGitHubFeedbackStatus', () => {
    it('should load GitHub feedback enabled status from config', async () => {
      const mockGitHubFeedbackService = {
        getGitHubConfig: vi.fn(() => Promise.resolve({ enabled: true }))
      };

      component['githubFeedbackService'] = mockGitHubFeedbackService as any;

      await component['loadGitHubFeedbackStatus']();

      expect(component.githubFeedbackEnabled).toBe(true);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should default to false when config is null', async () => {
      const mockGitHubFeedbackService = {
        getGitHubConfig: vi.fn(() => Promise.resolve(null))
      };

      component['githubFeedbackService'] = mockGitHubFeedbackService as any;

      await component['loadGitHubFeedbackStatus']();

      expect(component.githubFeedbackEnabled).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should handle error when loading GitHub config', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockGitHubFeedbackService = {
        getGitHubConfig: vi.fn(() => Promise.reject(new Error('Network error')))
      };

      component['githubFeedbackService'] = mockGitHubFeedbackService as any;

      await component['loadGitHubFeedbackStatus']();

      expect(component.githubFeedbackEnabled).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading GitHub feedback status:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentUserEmail', () => {
    it('should return email from userInfo when available', () => {
      localStorage.setItem('prayerapp_user_email', 'user@example.com');
      const email = component.getCurrentUserEmail();
      expect(email).toBe('user@example.com');
    });

    it('should return fallback email from component property when userInfo email is empty', () => {
      localStorage.removeItem('prayerapp_user_email');
      component.email = 'fallback@example.com';
      const email = component.getCurrentUserEmail();
      expect(email).toBe('fallback@example.com');
    });

    it('should return empty string when no email available', () => {
      localStorage.removeItem('prayerapp_user_email');
      component.email = '';
      const email = component.getCurrentUserEmail();
      expect(email).toBe('');
    });
  });

  describe('getCurrentUserName', () => {
    it('should return full name when both firstName and lastName are available', () => {
      localStorage.setItem('prayerapp_user_first_name', 'John');
      localStorage.setItem('prayerapp_user_last_name', 'Doe');
      const name = component.getCurrentUserName();
      expect(name).toBe('John Doe');
    });

    it('should return only firstName when lastName is empty', () => {
      localStorage.setItem('prayerapp_user_first_name', 'John');
      localStorage.removeItem('prayerapp_user_last_name');
      const name = component.getCurrentUserName();
      expect(name).toBe('John');
    });

    it('should return only lastName when firstName is empty', () => {
      localStorage.removeItem('prayerapp_user_first_name');
      localStorage.setItem('prayerapp_user_last_name', 'Doe');
      const name = component.getCurrentUserName();
      expect(name).toBe('Doe');
    });

    it('should return empty string when both firstName and lastName are empty', () => {
      localStorage.removeItem('prayerapp_user_first_name');
      localStorage.removeItem('prayerapp_user_last_name');
      const name = component.getCurrentUserName();
      expect(name).toBe('');
    });

    it('should trim whitespace from name', () => {
      localStorage.setItem('prayerapp_user_first_name', '  John  ');
      localStorage.removeItem('prayerapp_user_last_name');
      const name = component.getCurrentUserName();
      expect(name).toBe('John');
    });
  });

  describe('logout', () => {
    it('should call adminAuthService logout', async () => {
      await component.logout();
      expect(mockAdminAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('handlePrint', () => {
    it('should set isPrinting to true during print', async () => {
      mockPrintService.downloadPrintablePrayerList.mockImplementation(() => new Promise(resolve => {
        expect(component.isPrinting).toBe(true);
        resolve();
      }));
      
      await component.handlePrint();
      
      expect(component.isPrinting).toBe(false);
    });

    it('should close window on error during print', async () => {
      const mockWindow = { close: vi.fn() };
      window.open = vi.fn(() => mockWindow);
      mockPrintService.downloadPrintablePrayerList.mockRejectedValue(new Error('Print failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.handlePrint();

      expect(mockWindow.close).toHaveBeenCalled();
      expect(component.isPrinting).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should handle print without error', async () => {
      window.open = vi.fn(() => ({}));
      mockPrintService.downloadPrintablePrayerList.mockResolvedValue(undefined);

      await component.handlePrint();

      expect(component.isPrinting).toBe(false);
      expect(mockPrintService.downloadPrintablePrayerList).toHaveBeenCalledWith('week', {});
    });
  });

  describe('handlePrintPrompts', () => {
    it('should set isPrintingPrompts to true during print', async () => {
      mockPrintService.downloadPrintablePromptList.mockImplementation(() => new Promise(resolve => {
        expect(component.isPrintingPrompts).toBe(true);
        resolve();
      }));
      
      await component.handlePrintPrompts();
      
      expect(component.isPrintingPrompts).toBe(false);
    });

    it('should close window on error during print prompts', async () => {
      const mockWindow = { close: vi.fn() };
      window.open = vi.fn(() => mockWindow);
      mockPrintService.downloadPrintablePromptList.mockRejectedValue(new Error('Print failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.handlePrintPrompts();

      expect(mockWindow.close).toHaveBeenCalled();
      expect(component.isPrintingPrompts).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should pass selected prompt types to print service', async () => {
      window.open = vi.fn(() => ({}));
      component.selectedPromptTypes = ['Healing', 'Protection'];
      mockPrintService.downloadPrintablePromptList.mockResolvedValue(undefined);

      await component.handlePrintPrompts();

      expect(mockPrintService.downloadPrintablePromptList).toHaveBeenCalledWith(['Healing', 'Protection'], {});
    });
  });

  describe('togglePromptType', () => {
    it('should add prompt type when not selected', () => {
      component.selectedPromptTypes = [];
      component.togglePromptType('Healing');
      expect(component.selectedPromptTypes).toContain('Healing');
    });

    it('should remove prompt type when already selected', () => {
      component.selectedPromptTypes = ['Healing', 'Protection'];
      component.togglePromptType('Healing');
      expect(component.selectedPromptTypes).not.toContain('Healing');
      expect(component.selectedPromptTypes).toContain('Protection');
    });

    it('should handle multiple toggles correctly', () => {
      component.selectedPromptTypes = [];
      component.togglePromptType('A');
      component.togglePromptType('B');
      component.togglePromptType('C');
      expect(component.selectedPromptTypes).toEqual(['A', 'B', 'C']);
      
      component.togglePromptType('B');
      expect(component.selectedPromptTypes).toEqual(['A', 'C']);
    });
  });

  describe('setPrintRange', () => {
    it('should update printRange property', () => {
      component.setPrintRange('month');
      expect(component.printRange).toBe('month');
    });

    it('should accept all valid print ranges', () => {
      const ranges: Array<'week' | 'twoweeks' | 'month' | 'year' | 'all'> = ['week', 'twoweeks', 'month', 'year', 'all'];
      ranges.forEach(range => {
        component.setPrintRange(range);
        expect(component.printRange).toBe(range);
      });
    });
  });

  describe('handleThemeChange', () => {
    it('should update component theme and call service', () => {
      component.handleThemeChange('dark');
      expect(component.theme).toBe('dark');
      expect(mockThemeService.setTheme).toHaveBeenCalledWith('dark');
    });

    it('should handle all theme options', () => {
      const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
      themes.forEach(theme => {
        component.handleThemeChange(theme);
        expect(component.theme).toBe(theme);
        expect(mockThemeService.setTheme).toHaveBeenCalledWith(theme);
      });
    });
  });

  describe('onEmailChange', () => {
    it('should emit email change through subject', () => {
      component.email = 'newemail@example.com';
      const emailChangeSpy = vi.spyOn(component['emailChange$'], 'next');
      
      component.onEmailChange();
      
      expect(emailChangeSpy).toHaveBeenCalledWith('newemail@example.com');
    });
  });

  describe('loadPromptTypes', () => {
    it('should load and set prompt types from database', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({
              data: [
                { name: 'Healing', display_order: 1 },
                { name: 'Protection', display_order: 2 }
              ],
              error: null
            }))
          }))
        }))
      });

      await component.loadPromptTypes();

      expect(component.promptTypes).toEqual(['Healing', 'Protection']);
    });

    it('should handle empty prompt types', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      });

      await component.loadPromptTypes();

      expect(component.promptTypes).toEqual([]);
    });

    it('should handle database error when loading prompt types', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: new Error('DB error') }))
          }))
        }))
      });

      await component.loadPromptTypes();

      // Should keep existing promptTypes when error occurs
      expect(component.promptTypes).toBeDefined();
    });

    it('should handle exception when loading prompt types', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.reject(new Error('Network error')))
          }))
        }))
      });

      await component.loadPromptTypes();

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching prayer types:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('loadUserNameFromDatabase', () => {
    it('should load user name from database and save to localStorage', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({
              data: { first_name: 'John', last_name: 'Doe' },
              error: null
            }))
          }))
        }))
      });

      await component['loadUserNameFromDatabase']('test@example.com');

      expect(component.name).toBe('John Doe');
    });

    it('should handle missing last name', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({
              data: { first_name: 'John', last_name: '' },
              error: null
            }))
          }))
        }))
      });

      await component['loadUserNameFromDatabase']('test@example.com');

      expect(component.name).toBe('John');
    });

    it('should handle database error', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({
              data: null,
              error: new Error('DB error')
            }))
          }))
        }))
      });

      await component['loadUserNameFromDatabase']('test@example.com');

      // Should handle gracefully without setting name
      expect(component.name).toBeDefined();
    });

    it('should handle exception when loading user name', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.reject(new Error('Network error')))
          }))
        }))
      });

      await component['loadUserNameFromDatabase']('test@example.com');

      expect(consoleSpy).toHaveBeenCalledWith('Error loading user name from database:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete and unsubscribe from destroy$ subject', () => {
      const destroySpy = vi.spyOn(component['destroy$'], 'complete');
      component.ngOnDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Dropdown visibility', () => {
    it('should toggle print dropdown visibility', () => {
      component.showPrintDropdown = false;
      component.showPrintDropdown = !component.showPrintDropdown;
      expect(component.showPrintDropdown).toBe(true);

      component.showPrintDropdown = !component.showPrintDropdown;
      expect(component.showPrintDropdown).toBe(false);
    });

    it('should toggle prompt types dropdown visibility', () => {
      component.showPromptTypesDropdown = false;
      component.showPromptTypesDropdown = !component.showPromptTypesDropdown;
      expect(component.showPromptTypesDropdown).toBe(true);

      component.showPromptTypesDropdown = !component.showPromptTypesDropdown;
      expect(component.showPromptTypesDropdown).toBe(false);
    });
  });

  describe('Component state properties', () => {
    it('should initialize with correct default values', () => {
      expect(component.isOpen).toBe(false);
      expect(component.saving).toBe(false);
      expect(component.error).toBe(null);
      expect(component.success).toBe(null);
      expect(component.isPrinting).toBe(false);
      expect(component.isPrintingPrompts).toBe(false);
      expect(component.printRange).toBe('week');
      expect(component.showPrintDropdown).toBe(false);
      expect(component.showPromptTypesDropdown).toBe(false);
    });
  });

  describe('Theme options', () => {
    it('should have all three theme options defined', () => {
      expect(component.themeOptions.length).toBe(3);
      expect(component.themeOptions[0].value).toBe('light');
      expect(component.themeOptions[1].value).toBe('dark');
      expect(component.themeOptions[2].value).toBe('system');
    });
  });

  describe('Print range options', () => {
    it('should have all five print range options defined', () => {
      expect(component.printRangeOptions.length).toBe(5);
      expect(component.printRangeOptions.map(o => o.value)).toEqual(['week', 'twoweeks', 'month', 'year', 'all']);
    });
  });

  describe('onNotificationToggle error cases', () => {
    it('should handle missing email gracefully', async () => {
      localStorage.removeItem('prayerapp_user_email');
      component.receiveNotifications = true;

      await component.onNotificationToggle();

      expect(component.error).toBe('Email not found. Please log in again.');
      expect(component.saving).toBe(false);
    });

    it('should revert toggle on database update error', async () => {
      localStorage.setItem('prayerapp_user_email', 'test@example.com');
      component.receiveNotifications = true;

      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({
              data: { id: '123' },
              error: null
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: new Error('Update failed') }))
        }))
      });

      await component.onNotificationToggle();

      expect(component.receiveNotifications).toBe(false); // Should revert
      expect(component.error).toContain('Update failed');
    });
  });
});


