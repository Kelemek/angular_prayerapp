import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { PrayerFormComponent } from './prayer-form.component';
import { PrayerService } from '../../services/prayer.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { UserSessionService } from '../../services/user-session.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { BehaviorSubject } from 'rxjs';
import type { User } from '@supabase/supabase-js';

describe('PrayerFormComponent', () => {
  let component: PrayerFormComponent;
  let mockPrayerService: any;
  let mockAdminAuthService: any;
  let mockUserSessionService: any;
  let mockChangeDetectorRef: any;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockUser: User | null;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.setItem('userFirstName', 'John');
    localStorage.setItem('userLastName', 'Doe');
    localStorage.setItem('prayerapp_user_first_name', 'John');
    localStorage.setItem('prayerapp_user_last_name', 'Doe');

    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: '2024-01-01T00:00:00Z'
    };

    mockPrayerService = {
      addPrayer: vi.fn()
    };

    mockAdminAuthService = {
      user$: new BehaviorSubject<User | null>(mockUser),
      isAdmin$: new BehaviorSubject<boolean>(false)
    };

    mockUserSessionService = {
      userSession$: new BehaviorSubject({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        isActive: true
      }),
      getCurrentSession: vi.fn(() => ({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        isActive: true
      }))
    };

    mockChangeDetectorRef = {
      detectChanges: vi.fn(),
      markForCheck: vi.fn()
    };

    // Set up default mock that returns no data (triggers fallback to localStorage)
    const defaultMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null
    });

    const defaultEq = vi.fn().mockReturnValue({
      maybeSingle: defaultMaybeSingle
    });

    const defaultSelect = vi.fn().mockReturnValue({
      eq: defaultEq
    });

    const defaultFrom = vi.fn().mockReturnValue({
      select: defaultSelect
    });

    mockSupabaseService = {
      client: {
        from: defaultFrom
      }
    };

    mockToastService = {
      error: vi.fn(),
      success: vi.fn()
    };

    component = new PrayerFormComponent(
      mockPrayerService,
      mockAdminAuthService,
      mockUserSessionService,
      mockSupabaseService,
      mockToastService as any as ToastService,
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

  describe('component initialization', () => {
    it('should initialize with default values', () => {
      expect(component.formData).toEqual({
        title: '',
        description: '',
        prayer_for: '',
        is_anonymous: false,
        is_personal: false
      });
      expect(component.isSubmitting).toBe(false);
      expect(component.showSuccessMessage).toBe(false);
    });

    it('should load user info from UserSessionService on init', () => {
      component.ngOnInit();
      expect(component.currentUserEmail).toBe('test@example.com');
    });

    it('should subscribe to isAdmin$ observable', () => {
      mockAdminAuthService.isAdmin$.next(true);
      component.ngOnInit();
      expect(component.isAdmin).toBe(true);
    });

    it('should use userSessionService for email when userSession is available', () => {
      mockUserSessionService.userSession$.next({
        email: 'session@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        isActive: true
      });
      component.ngOnInit();
      expect(component.currentUserEmail).toBe('session@example.com');
    });

    it('should handle error when loading user info', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUserSessionService.userSession$ = {
        subscribe: vi.fn(() => {
          throw new Error('Subscription error');
        })
      } as any;
      
      component.ngOnInit();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges', () => {
    it('should reload user info when isOpen changes to true', () => {
      const loadUserInfoSpy = vi.spyOn(component as any, 'loadUserInfo');
      component.isOpen = true;
      component.ngOnChanges();
      expect(loadUserInfoSpy).toHaveBeenCalled();
    });

    it('should not reload when isOpen is false', () => {
      const loadUserInfoSpy = vi.spyOn(component as any, 'loadUserInfo');
      component.isOpen = false;
      component.ngOnChanges();
      expect(loadUserInfoSpy).not.toHaveBeenCalled();
    });
  });

  describe('form validation', () => {
    it('should return false when email is empty', () => {
      component.currentUserEmail = '';
      component.formData.prayer_for = 'Someone';
      component.formData.description = 'Test description';
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when prayer_for is empty', () => {
      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = '';
      component.formData.description = 'Test description';
      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when description is empty', () => {
      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'Someone';
      component.formData.description = '';
      expect(component.isFormValid()).toBe(false);
    });

    it('should return true when all fields are filled', () => {
      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'Someone';
      component.formData.description = 'Test description';
      expect(component.isFormValid()).toBe(true);
    });

    it('should trim whitespace when validating', () => {
      component.currentUserEmail = '  test@example.com  ';
      component.formData.prayer_for = '  Someone  ';
      component.formData.description = '  Test description  ';
      expect(component.isFormValid()).toBe(true);
    });
  });

  describe('form submission', () => {
    it('should not submit when form is invalid', async () => {
      component.currentUserEmail = '';
      component.formData.prayer_for = '';
      component.formData.description = '';
      await component.handleSubmit();
      expect(mockPrayerService.addPrayer).not.toHaveBeenCalled();
    });

    it('should not submit when already submitting', async () => {
      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'Someone';
      component.formData.description = 'Test description';
      component.isSubmitting = true;
      await component.handleSubmit();
      expect(mockPrayerService.addPrayer).not.toHaveBeenCalled();
    });

    it('should call addPrayer with correct data when form is valid', async () => {
      mockPrayerService.addPrayer.mockResolvedValue(true);
      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';
      component.formData.is_anonymous = false;

      await component.handleSubmit();

      expect(mockPrayerService.addPrayer).toHaveBeenCalledWith({
        title: 'Prayer for My Friend',
        description: 'Please pray for healing',
        requester: 'John Doe',
        prayer_for: 'My Friend',
        email: 'test@example.com',
        is_anonymous: false,
        status: 'current'
      });
    });

    it('should include anonymous flag when checked', async () => {
      mockPrayerService.addPrayer.mockResolvedValue(true);
      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';
      component.formData.is_anonymous = true;

      await component.handleSubmit();

      expect(mockPrayerService.addPrayer).toHaveBeenCalledWith(
        expect.objectContaining({
          is_anonymous: true
        })
      );
    });

    it('should show success message on successful submission', async () => {
      mockPrayerService.addPrayer.mockResolvedValue(true);
      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';

      await component.handleSubmit();

      expect(component.showSuccessMessage).toBe(true);
      expect(component.isSubmitting).toBe(false);
    });

    it('should reset form data after successful submission', async () => {
      mockPrayerService.addPrayer.mockResolvedValue(true);
      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';
      component.formData.is_anonymous = true;

      await component.handleSubmit();

      expect(component.formData).toEqual({
        title: '',
        description: '',
        prayer_for: '',
        is_anonymous: false,
        is_personal: false
      });
    });

    it('should auto-close after 5 seconds on success', async () => {
      mockPrayerService.addPrayer.mockResolvedValue(true);
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';

      await component.handleSubmit();

      // Close is emitted immediately
      expect(closeSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalledWith({ isPersonal: false });
      
      // Check success message is shown
      expect(component.showSuccessMessage).toBe(true);

      vi.advanceTimersByTime(5000);

      // After 5 seconds, success message is hidden
      expect(component.showSuccessMessage).toBe(false);
    });

    it('should handle submission errors gracefully', async () => {
      mockPrayerService.addPrayer.mockRejectedValue(new Error('Network error'));

      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';

      await component.handleSubmit();

      expect(component.isSubmitting).toBe(false);
      expect(mockToastService.error).toHaveBeenCalledWith('Failed to submit prayer request. Please try again.');
    });

    it('should set isSubmitting to false after submission completes', async () => {
      mockPrayerService.addPrayer.mockResolvedValue(true);

      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';

      expect(component.isSubmitting).toBe(false);

      await component.handleSubmit();
      
      expect(component.isSubmitting).toBe(false);
      expect(component.showSuccessMessage).toBe(true);
    });
  });

  describe('cancel functionality', () => {
    it('should emit close event when cancel is called', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);
      component.cancel();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('backdrop click', () => {
    it('should call cancel when backdrop is clicked', () => {
      const cancelSpy = vi.spyOn(component, 'cancel');
      const mockEvent = {
        target: {
          classList: {
            contains: (className: string) => className === 'fixed'
          }
        }
      } as any;

      component.onBackdropClick(mockEvent);
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should not call cancel when content area is clicked', () => {
      const cancelSpy = vi.spyOn(component, 'cancel');
      const mockEvent = {
        target: {
          classList: {
            contains: (className: string) => false
          }
        }
      } as any;

      component.onBackdropClick(mockEvent);
      expect(cancelSpy).not.toHaveBeenCalled();
    });
  });

  describe('user name handling', () => {
    it('should get user name from localStorage', async () => {
      localStorage.setItem('prayerapp_user_first_name', 'Jane');
      localStorage.setItem('prayerapp_user_last_name', 'Smith');
      mockUserSessionService.getCurrentSession.mockReturnValue(null);
      mockPrayerService.addPrayer.mockResolvedValue(true);

      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';

      await component.handleSubmit();

      expect(mockPrayerService.addPrayer).toHaveBeenCalledWith(
        expect.objectContaining({
          requester: 'Jane Smith'
        })
      );
    });

    it('should handle empty name gracefully', async () => {
      localStorage.removeItem('prayerapp_user_first_name');
      localStorage.removeItem('prayerapp_user_last_name');
      mockUserSessionService.getCurrentSession.mockReturnValue(null);
      mockPrayerService.addPrayer.mockResolvedValue(true);

      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';

      await component.handleSubmit();

      expect(mockPrayerService.addPrayer).toHaveBeenCalledWith(
        expect.objectContaining({
          requester: ''
        })
      );
    });

    it('should handle only first name', async () => {
      localStorage.setItem('prayerapp_user_first_name', 'Jane');
      localStorage.removeItem('prayerapp_user_last_name');
      mockUserSessionService.getCurrentSession.mockReturnValue(null);
      mockPrayerService.addPrayer.mockResolvedValue(true);

      component.currentUserEmail = 'test@example.com';
      component.formData.prayer_for = 'My Friend';
      component.formData.description = 'Please pray for healing';

      await component.handleSubmit();

      expect(mockPrayerService.addPrayer).toHaveBeenCalledWith(
        expect.objectContaining({
          requester: 'Jane'
        })
      );
    });
  });

  describe('property getters and setters', () => {
    it('should have user$ observable from adminAuthService', () => {
      component.ngOnInit();
      expect(component.user$).toBe(mockAdminAuthService.user$);
    });

    it('should update isOpen property', () => {
      component.isOpen = true;
      expect(component.isOpen).toBe(true);
      component.isOpen = false;
      expect(component.isOpen).toBe(false);
    });

    it('should emit close event', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);
      component.close.emit();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

});

