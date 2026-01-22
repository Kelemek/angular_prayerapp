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
      addPrayer: vi.fn(),
      addPersonalPrayer: vi.fn(),
      getUniqueCategoriesForUser: vi.fn().mockImplementation(() => Promise.resolve([]))
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
        is_personal: false,
        category: ''
      });
      expect(component.isSubmitting).toBe(false);
      expect(component.showSuccessMessage).toBe(false);
    });

    it('should load user info from UserSessionService on init', () => {
      component.ngOnInit();
      vi.runAllTimers();
      expect(component.currentUserEmail).toBe('test@example.com');
    });

    it('should subscribe to isAdmin$ observable', () => {
      mockAdminAuthService.isAdmin$.next(true);
      component.ngOnInit();
      vi.runAllTimers();
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
      vi.runAllTimers();
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
      vi.runAllTimers();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges', () => {
    it('should reload user info when isOpen changes to true', () => {
      const loadUserInfoSpy = vi.spyOn(component as any, 'loadUserInfo');
      component.isOpen = true;
      component.ngOnChanges();
      vi.runAllTimers();
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
        is_personal: false,
        category: ''
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
      vi.runAllTimers();
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

  describe('Category Dropdown - onCategoryInput', () => {
    beforeEach(() => {
      mockPrayerService.getUniqueCategoriesForUser.mockImplementation(() => Promise.resolve(['Health', 'Family', 'Work']));
      component.ngOnInit();
      vi.runAllTimers();
    });

    it('should filter categories when user types', () => {
      component.formData.is_personal = true;
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'hea';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.formData.category).toBe('hea');
      expect(component.filteredCategories).toContain('Health');
    });

    it('should show dropdown when filtered categories exist', () => {
      component.formData.is_personal = true;
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'fam';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.showCategoryDropdown).toBe(true);
    });

    it('should not show dropdown when no matching categories', () => {
      component.formData.is_personal = true;
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'xyz';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should clear filtered categories when input is empty', () => {
      component.formData.is_personal = true;
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = '';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.filteredCategories).toEqual([]);
      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should reset selectedCategoryIndex when filtering', () => {
      component.formData.is_personal = true;
      component.selectedCategoryIndex = 2;
      component.ngOnInit();
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'health';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should handle case-insensitive filtering', () => {
      component.formData.is_personal = true;
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'HEALTH';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.filteredCategories).toContain('Health');
    });

    it('should filter categories with whitespace', () => {
      component.formData.is_personal = true;
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = '  work  ';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.filteredCategories).toContain('Work');
    });
  });

  describe('Category Dropdown - selectCategory', () => {
    it('should set selected category', () => {
      component.selectCategory('Health');

      expect(component.formData.category).toBe('Health');
    });

    it('should close dropdown after selection', () => {
      component.showCategoryDropdown = true;

      component.selectCategory('Health');

      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should clear filtered categories after selection', () => {
      component.filteredCategories = ['Health', 'Family'];

      component.selectCategory('Health');

      expect(component.filteredCategories).toEqual([]);
    });

    it('should reset selectedCategoryIndex after selection', () => {
      component.selectedCategoryIndex = 1;

      component.selectCategory('Health');

      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should call markForCheck after selection', () => {
      component.selectCategory('Health');

      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('Category Dropdown - onCategoryKeyDown', () => {
    beforeEach(() => {
      mockPrayerService.getUniqueCategoriesForUser.mockImplementation(() => Promise.resolve(['Health', 'Family', 'Work']));
      component.ngOnInit();
      vi.runAllTimers();
      component.filteredCategories = ['Health', 'Family', 'Work'];
      component.showCategoryDropdown = true;
    });

    it('should move selection down with ArrowDown key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.selectedCategoryIndex).toBe(0);
    });

    it('should move selection down multiple times', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

      component.onCategoryKeyDown(event);
      component.onCategoryKeyDown(event);

      expect(component.selectedCategoryIndex).toBe(1);
    });

    it('should not go beyond last item with ArrowDown', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

      component.selectedCategoryIndex = 2;
      component.onCategoryKeyDown(event);

      expect(component.selectedCategoryIndex).toBe(2);
    });

    it('should move selection up with ArrowUp key', () => {
      component.selectedCategoryIndex = 1;
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.selectedCategoryIndex).toBe(0);
    });

    it('should not go below -1 with ArrowUp', () => {
      component.selectedCategoryIndex = 0;
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });

      component.onCategoryKeyDown(event);

      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should select category with Enter key when item is selected', () => {
      component.selectedCategoryIndex = 0;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');
      vi.spyOn(component, 'selectCategory');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.selectCategory).toHaveBeenCalledWith('Health');
    });

    it('should not select anything with Enter if no item is selected', () => {
      component.selectedCategoryIndex = -1;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(component, 'selectCategory');

      component.onCategoryKeyDown(event);

      expect(component.selectCategory).not.toHaveBeenCalled();
    });

    it('should close dropdown with Escape key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.showCategoryDropdown).toBe(false);
      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should do nothing when dropdown is closed', () => {
      component.showCategoryDropdown = false;
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should do nothing when no filtered categories', () => {
      component.filteredCategories = [];
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should prevent Enter key default when dropdown is open but empty', () => {
      component.filteredCategories = [];
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should call markForCheck after keyboard navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      mockChangeDetectorRef.markForCheck.mockClear();

      component.onCategoryKeyDown(event);

      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('Category Dropdown - onDocumentClick', () => {
    it('should close dropdown when clicking outside', () => {
      component.showCategoryDropdown = true;
      const button = document.createElement('button');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: button });

      component.onDocumentClick(event as any);

      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should not close dropdown when clicking inside dropdown', () => {
      component.showCategoryDropdown = true;
      const dropdownItem = document.createElement('div');
      dropdownItem.className = 'dropdown-item';
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: dropdownItem });

      component.onDocumentClick(event as any);

      expect(component.showCategoryDropdown).toBe(true);
    });

    it('should not close dropdown when clicking on category input', () => {
      component.showCategoryDropdown = true;
      const categoryInput = document.createElement('input');
      categoryInput.id = 'category';
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: categoryInput });

      component.onDocumentClick(event as any);

      expect(component.showCategoryDropdown).toBe(true);
    });

    it('should do nothing when dropdown is already closed', () => {
      component.showCategoryDropdown = false;
      const button = document.createElement('button');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: button });

      component.onDocumentClick(event as any);

      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should call markForCheck when closing dropdown', () => {
      component.showCategoryDropdown = true;
      const button = document.createElement('button');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: button });
      mockChangeDetectorRef.markForCheck.mockClear();

      component.onDocumentClick(event as any);

      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('cancel - dropdown state', () => {
    it('should reset showCategoryDropdown', () => {
      component.showCategoryDropdown = true;

      component.cancel();

      expect(component.showCategoryDropdown).toBe(false);
    });
  });

  describe('Personal prayer category loading', () => {
    it('should load available categories when opening personal prayer form', () => {
      component.isOpen = true;
      component.formData.is_personal = true;
      component.ngOnChanges();
      vi.runAllTimers();

      expect(component.availableCategories).toEqual([]);
    });

    it('should initialize filteredCategories as empty', () => {
      expect(component.filteredCategories).toEqual([]);
    });

    it('should initialize showCategoryDropdown as false', () => {
      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should initialize selectedCategoryIndex as -1', () => {
      expect(component.selectedCategoryIndex).toBe(-1);
    });
  });

  describe('onBackdropClick', () => {
    it('should call cancel when clicking on backdrop', () => {
      vi.spyOn(component, 'cancel');
      const mockElement = document.createElement('div');
      mockElement.classList.add('fixed');
      
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: mockElement });

      component.onBackdropClick(event);

      expect(component.cancel).toHaveBeenCalled();
    });

    it('should not call cancel when clicking on modal content', () => {
      vi.spyOn(component, 'cancel');
      const mockElement = document.createElement('div');
      
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: mockElement });

      component.onBackdropClick(event);

      expect(component.cancel).not.toHaveBeenCalled();
    });
  });

  describe('onDocumentClick', () => {
    it('should call markForCheck after event handling', () => {
      component.showCategoryDropdown = true;
      const button = document.createElement('button');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: button });
      mockChangeDetectorRef.markForCheck.mockClear();

      component.onDocumentClick(event as any);

      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

});

