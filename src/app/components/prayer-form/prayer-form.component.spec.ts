import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { wireGatedSupabaseMock } from '../../testing/supabase-service-mock';
import {
  ChangeDetectorRef,
  DestroyRef,
  SimpleChanges,
  ɵresolveComponentResources as resolveComponentResources,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PrayerFormComponent } from './prayer-form.component';
import { PrayerGroupService } from '../../services/prayer-group.service';
import { PrayerService } from '../../services/prayer.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { UserSessionService } from '../../services/user-session.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import {
  GROUPS_WALKTHROUGH_DESCRIPTION,
  GROUPS_WALKTHROUGH_PRAYER_FOR,
  PERSONAL_PRAYER_WALKTHROUGH_CATEGORY,
  PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION,
  PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR,
  TOUR_PRAYER_DESCRIPTION_FIELD_ID,
} from '../../services/help-driver-tour.service';
import { BehaviorSubject, of } from 'rxjs';
import { RichTextEditorsSettingsService } from '../../services/rich-text-editors-settings.service';
import { PersonalCategoryColorService } from '../../services/personal-category-color.service';
import type { User } from '@supabase/supabase-js';
import type { PrayerFormLock } from '../../lib/prayer-form-lock';
import { modalShellOverlayText } from '../modal-shell/modal-shell-test-dom';
import { resetModalShellScrollLockForTests } from '../modal-shell/modal-shell-scroll-lock';

describe('PrayerFormComponent', () => {
  let component: PrayerFormComponent;
  let mockPrayerService: any;
  let mockAdminAuthService: any;
  let mockUserSessionService: any;
  let mockChangeDetectorRef: any;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockDestroyRef: DestroyRef;
  let mockRichTextEditorsSettings: RichTextEditorsSettingsService;
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
    wireGatedSupabaseMock(mockSupabaseService);

    mockToastService = {
      error: vi.fn(),
      success: vi.fn()
    };

    const mockPersonalCategoryColorService = {
      loadColors: vi.fn().mockResolvedValue({}),
      getColor: vi.fn().mockReturnValue('#2563EB'),
      setColor: vi.fn().mockResolvedValue(true),
    };

    mockDestroyRef = { onDestroy: vi.fn() } as unknown as DestroyRef;
    mockRichTextEditorsSettings = {
      getRichTextEditorsEnabled$: () => of(true),
    } as unknown as RichTextEditorsSettingsService;

    const mockPrayerGroupService = {
      listGroups: vi.fn().mockResolvedValue([]),
      addPrayer: vi.fn().mockResolvedValue(undefined),
      preferredGroupId: null as string | null,
    };

    component = new PrayerFormComponent(
      mockPrayerService,
      mockAdminAuthService,
      mockUserSessionService,
      mockSupabaseService,
      mockToastService as any as ToastService,
      mockPersonalCategoryColorService as any,
      mockChangeDetectorRef as ChangeDetectorRef,
      mockDestroyRef,
      mockRichTextEditorsSettings,
      mockPrayerGroupService as unknown as PrayerGroupService
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
      mockUserSessionService.getCurrentSession.mockReturnValue({
        email: 'session@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        isActive: true,
      });
      component.ngOnInit();
      vi.runAllTimers();
      expect(component.currentUserEmail).toBe('session@example.com');
    });
  });

  describe('ngOnChanges', () => {
    const isOpenToTrue: SimpleChanges = {
      isOpen: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false },
    };
    const isOpenToFalse: SimpleChanges = {
      isOpen: { currentValue: false, previousValue: true, firstChange: false, isFirstChange: () => false },
    };

    it('should reload user info when isOpen changes to true', () => {
      const loadUserInfoSpy = vi.spyOn(component as any, 'loadUserInfo');
      component.isOpen = true;
      component.ngOnChanges(isOpenToTrue);
      vi.runAllTimers();
      expect(loadUserInfoSpy).toHaveBeenCalled();
    });

    it('should not reload when isOpen is false', () => {
      const loadUserInfoSpy = vi.spyOn(component as any, 'loadUserInfo');
      component.isOpen = false;
      component.ngOnChanges(isOpenToFalse);
      expect(loadUserInfoSpy).not.toHaveBeenCalled();
    });

    it('should set is_personal from defaultPersonalPrayer when modal opens', () => {
      component.formData.is_personal = false;
      component.defaultPersonalPrayer = true;
      component.isOpen = true;
      component.ngOnChanges(isOpenToTrue);
      expect(component.formData.is_personal).toBe(true);
    });

    it('should clear is_personal on open when defaultPersonalPrayer is false', () => {
      component.formData.is_personal = true;
      component.defaultPersonalPrayer = false;
      component.isOpen = true;
      component.ngOnChanges(isOpenToTrue);
      expect(component.formData.is_personal).toBe(false);
    });

    it('offers Group Prayer and selects the group from the Groups tab', async () => {
      const groups = (
        component as unknown as {
          prayerGroupService: {
            listGroups: ReturnType<typeof vi.fn>;
            preferredGroupId: string | null;
          };
        }
      ).prayerGroupService;
      groups.listGroups.mockResolvedValue([
        {
          id: 'g1',
          name: 'Family',
          color: '#2563EB',
          role: 'owner',
          memberCount: 2,
        },
      ]);
      groups.preferredGroupId = 'g1';
      component.defaultGroupPrayer = true;
      component.isOpen = true;
      await component.loadGroupsForForm();
      expect(component.showGroupOption).toBe(true);
      expect(component.visibility).toBe('group');
      expect(component.selectedGroupId).toBe('g1');
    });

    it('hides Group Prayer when the person has no group', async () => {
      await component.loadGroupsForForm();
      expect(component.showGroupOption).toBe(false);
    });

    function formGroup(id: string, name: string) {
      return {
        id,
        name,
        color: '#2563EB',
        role: 'owner' as const,
        memberCount: 2,
        updatesRequesterOnly: false,
        answeredRequesterOnly: false,
        prayForDisabled: false,
      };
    }

    function groupsApi() {
      return (
        component as unknown as {
          prayerGroupService: {
            listGroups: ReturnType<typeof vi.fn>;
            preferredGroupId: string | null;
          };
        }
      ).prayerGroupService;
    }

    async function openAndLoad(): Promise<void> {
      const load = vi.spyOn(component, 'loadGroupsForForm');
      component.isOpen = true;
      component.ngOnChanges(isOpenToTrue);
      await load.mock.results.at(-1)?.value;
    }

    it('keeps a personal lock after groups load even when the tab would default to a group', async () => {
      const groups = groupsApi();
      groups.listGroups.mockResolvedValue([formGroup('g1', 'Family')]);
      groups.preferredGroupId = 'g1';
      component.lock = { scope: 'personal' };
      component.defaultGroupPrayer = true;
      await openAndLoad();
      expect(component.visibility).toBe('personal');
      expect(component.formData.is_personal).toBe(true);
      component.pickVisibility('public');
      expect(component.visibility).toBe('personal');
    });

    it('selects the locked group after groups load', async () => {
      const groups = groupsApi();
      groups.listGroups.mockResolvedValue([
        formGroup('g1', 'Family'),
        formGroup('g2', 'Work'),
      ]);
      groups.preferredGroupId = 'g2';
      component.lock = { scope: 'group', groupId: 'g1' };
      component.defaultPersonalPrayer = true;
      await openAndLoad();
      expect(component.visibility).toBe('group');
      expect(component.selectedGroupId).toBe('g1');
    });

    it('falls back to the preferred group when the locked id is not in the list', async () => {
      const groups = groupsApi();
      groups.listGroups.mockResolvedValue([
        formGroup('g1', 'Family'),
        formGroup('g2', 'Work'),
      ]);
      groups.preferredGroupId = 'g2';
      component.lock = { scope: 'group', groupId: 'missing' };
      await openAndLoad();
      expect(component.visibility).toBe('group');
      expect(component.selectedGroupId).toBe('g2');
    });

    it('falls back to the first group when the locked id and preferred id are both missing', async () => {
      const groups = groupsApi();
      groups.listGroups.mockResolvedValue([
        formGroup('g1', 'Family'),
        formGroup('g2', 'Work'),
      ]);
      groups.preferredGroupId = 'not-listed';
      component.lock = { scope: 'group', groupId: null };
      await openAndLoad();
      expect(component.selectedGroupId).toBe('g1');
      expect(component.visibility).toBe('group');
    });

    it('stays on group when a group lock has no groups to choose', async () => {
      groupsApi().listGroups.mockResolvedValue([]);
      component.lock = { scope: 'group', groupId: null };
      component.isChurchMember = true;
      await openAndLoad();
      component.formData.prayer_for = 'Someone';
      component.formData.description = 'Please pray';
      expect(component.visibility).toBe('group');
      expect(component.selectedGroupId).toBeNull();
      expect(component.isFormValid()).toBe(false);
    });
  });

  describe('hands-on help walkthrough helpers', () => {
    it('fillWalkthroughPrayerFor sets prayer_for', () => {
      component.fillWalkthroughPrayerFor();
      expect(component.formData.prayer_for).toBe(PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR);
    });

    it('fillWalkthroughDescription sets description', () => {
      component.fillWalkthroughDescription();
      expect(component.formData.description).toBe(PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION);
    });

    it('ensureWalkthroughPersonalSelected sets is_personal', () => {
      component.formData.is_personal = false;
      component.ensureWalkthroughPersonalSelected();
      expect(component.formData.is_personal).toBe(true);
    });

    it('fillWalkthroughCategory sets category and closes dropdown', () => {
      component.showCategoryDropdown = true;
      component.fillWalkthroughCategory();
      expect(component.formData.category).toBe(PERSONAL_PRAYER_WALKTHROUGH_CATEGORY);
      expect(component.showCategoryDropdown).toBe(false);
    });

    it('fillWalkthroughGroupPrayer fills the sample prayer and keeps the group lock', () => {
      component.lock = { scope: 'group', groupId: 'walk' };
      component.visibility = 'group';
      component.selectedGroupId = 'walk';
      component.fillWalkthroughGroupPrayer();
      expect(component.formData.prayer_for).toBe(GROUPS_WALKTHROUGH_PRAYER_FOR);
      expect(component.formData.description).toBe(GROUPS_WALKTHROUGH_DESCRIPTION);
      expect(component.lock).toEqual({ scope: 'group', groupId: 'walk' });
      expect(component.selectedGroupId).toBe('walk');
      expect(component.visibility).toBe('group');
    });

    it('submitWalkthroughPrayerForm does not submit into a different group', () => {
      const handleSubmitSpy = vi.spyOn(component as any, 'handleSubmit').mockImplementation(() => Promise.resolve());
      component.lock = { scope: 'group', groupId: 'walk' };
      component.visibility = 'group';
      component.selectedGroupId = 'real-group';
      component.currentUserEmail = 'u@example.com';
      component.formData.prayer_for = GROUPS_WALKTHROUGH_PRAYER_FOR;
      component.formData.description = GROUPS_WALKTHROUGH_DESCRIPTION;
      component.submitWalkthroughPrayerForm();
      expect(handleSubmitSpy).not.toHaveBeenCalled();
    });

    it('submitWalkthroughPrayerForm calls handleSubmit when valid', () => {
      const handleSubmitSpy = vi.spyOn(component as any, 'handleSubmit').mockImplementation(() => Promise.resolve());
      component.currentUserEmail = 'u@example.com';
      component.formData.prayer_for = 'x';
      component.formData.description = 'y';
      component.isSubmitting = false;
      component.submitWalkthroughPrayerForm();
      expect(handleSubmitSpy).toHaveBeenCalled();
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
      component.defaultPersonalPrayer = true;
      component.isOpen = true;
      component.ngOnChanges({
        isOpen: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false },
      });
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

describe('PrayerFormComponent visibility grid', () => {
  const componentDir = dirname(fileURLToPath(import.meta.url));

  beforeAll(async () => {
    await resolveComponentResources((url) => {
      const path = join(componentDir, url);
      if (!existsSync(path)) {
        throw new Error(`Component resource not found: ${url}`);
      }
      return Promise.resolve(readFileSync(path, 'utf-8'));
    });
  });

  afterEach(() => {
    resetModalShellScrollLockForTests();
    document.body.style.overflow = '';
  });

  function formGroup(id: string, name: string) {
    return {
      id,
      name,
      color: '#2563EB',
      role: 'owner' as const,
      memberCount: 2,
      updatesRequesterOnly: false,
      answeredRequesterOnly: false,
      prayForDisabled: false,
    };
  }

  async function openForm(options: {
    lock: PrayerFormLock | null;
    defaultGroupPrayer?: boolean;
    groups?: ReturnType<typeof formGroup>[];
    groupsPromise?: Promise<ReturnType<typeof formGroup>[]>;
    preferredGroupId?: string | null;
    richText?: boolean;
  }) {
    const listGroups = vi
      .fn()
      .mockReturnValue(options.groupsPromise ?? Promise.resolve(options.groups ?? []));
    const component = new PrayerFormComponent(
      {
        addPrayer: vi.fn(),
        addPersonalPrayer: vi.fn(),
        getUniqueCategoriesForUser: vi.fn().mockResolvedValue([]),
      } as unknown as PrayerService,
      {
        user$: new BehaviorSubject<User | null>(null),
        isAdmin$: new BehaviorSubject(false),
      } as unknown as AdminAuthService,
      {
        getCurrentSession: () => ({
          email: 'test@example.com',
          isChurchMember: true,
          isActive: true,
        }),
      } as unknown as UserSessionService,
      { client: { from: vi.fn() } } as unknown as SupabaseService,
      { error: vi.fn(), success: vi.fn() } as unknown as ToastService,
      {
        loadColors: vi.fn().mockResolvedValue({}),
        getColor: vi.fn().mockReturnValue('#2563EB'),
        setColor: vi.fn(),
      } as unknown as PersonalCategoryColorService,
      { markForCheck: vi.fn(), detectChanges: vi.fn() } as unknown as ChangeDetectorRef,
      { onDestroy: vi.fn() } as unknown as DestroyRef,
      {
        getRichTextEditorsEnabled$: () => of(options.richText ?? false),
      } as unknown as RichTextEditorsSettingsService,
      {
        listGroups,
        addPrayer: vi.fn(),
        preferredGroupId: options.preferredGroupId ?? null,
      } as unknown as PrayerGroupService,
    );
    const cmp = (
      PrayerFormComponent as unknown as {
        ɵcmp: { factory: () => PrayerFormComponent };
      }
    ).ɵcmp;
    const previousFactory = cmp.factory;
    // Vitest strips constructor tokens, so TestBed cannot inject this class.
    cmp.factory = () => component;
    let fixture: ReturnType<typeof TestBed.createComponent<PrayerFormComponent>>;
    try {
      TestBed.configureTestingModule({ imports: [PrayerFormComponent] });
      fixture = TestBed.createComponent(PrayerFormComponent);
    } finally {
      cmp.factory = previousFactory;
    }
    fixture.componentRef.setInput('lock', options.lock);
    fixture.componentRef.setInput('defaultGroupPrayer', options.defaultGroupPrayer ?? false);
    fixture.componentRef.setInput('isOpen', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('hides the visibility grid and stays church when church-locked, even if the tab defaults to group', async () => {
    const fixture = await openForm({
      lock: { scope: 'church' },
      defaultGroupPrayer: true,
      groups: [formGroup('g1', 'Family')],
      preferredGroupId: 'g1',
    });
    const text = modalShellOverlayText();
    expect(text).not.toContain('Prayer Visibility');
    expect(text).not.toContain('Church Prayer');
    expect(text).not.toContain('Group Prayer');
    expect(fixture.componentInstance.visibility).toBe('public');
    fixture.destroy();
  });

  it('hides the visibility grid and stays personal when locked, even if the tab defaults to group', async () => {
    const fixture = await openForm({
      lock: { scope: 'personal' },
      defaultGroupPrayer: true,
      groups: [formGroup('g1', 'Family')],
      preferredGroupId: 'g1',
    });
    const text = modalShellOverlayText();
    expect(text).not.toContain('Prayer Visibility');
    expect(text).not.toContain('Church Prayer');
    expect(text).not.toContain('Group Prayer');
    expect(fixture.componentInstance.visibility).toBe('personal');
    fixture.destroy();
  });

  it('hides the visibility grid and selects the locked group', async () => {
    const fixture = await openForm({
      lock: { scope: 'group', groupId: 'g1' },
      defaultGroupPrayer: false,
      groups: [formGroup('g1', 'Family'), formGroup('g2', 'Work')],
      preferredGroupId: 'g2',
    });
    const text = modalShellOverlayText();
    expect(text).not.toContain('Prayer Visibility');
    expect(text).not.toContain('Church Prayer');
    expect(text).toContain('Family');
    expect(text).not.toContain('Loading groups');
    expect(fixture.componentInstance.visibility).toBe('group');
    expect(fixture.componentInstance.selectedGroupId).toBe('g1');
    fixture.destroy();
  });

  it('explains that a group is needed when a group lock loads no groups', async () => {
    const fixture = await openForm({
      lock: { scope: 'group', groupId: null },
      groups: [],
    });
    const text = modalShellOverlayText();
    expect(text).toContain('Create a group first');
    expect(text).not.toContain('Loading groups');
    expect(text).not.toContain('Prayer Visibility');
    fixture.destroy();
  });

  it('shows a loading note while a group lock waits for groups', async () => {
    const fixture = await openForm({
      lock: { scope: 'group', groupId: 'g1' },
      groupsPromise: new Promise(() => undefined),
    });
    const text = modalShellOverlayText();
    expect(text).toContain('Loading groups');
    expect(text).not.toContain('Create a group first');
    fixture.destroy();
  });

  it.each([true, false])(
    'renders the details tour anchor around the description field (rich text %s)',
    async (richText) => {
      const fixture = await openForm({
        lock: { scope: 'group', groupId: 'g1' },
        groups: [formGroup('g1', 'Family')],
        richText,
      });
      const anchor = document.getElementById(TOUR_PRAYER_DESCRIPTION_FIELD_ID);
      expect(anchor).not.toBeNull();
      expect(anchor?.textContent).toContain('Prayer Request Details');
      fixture.destroy();
    },
  );

  it('still shows the visibility grid and defaults to group when Request opens with no lock', async () => {
    const fixture = await openForm({
      lock: null,
      defaultGroupPrayer: true,
      groups: [formGroup('g1', 'Family')],
      preferredGroupId: 'g1',
    });
    const text = modalShellOverlayText();
    expect(text).toContain('Prayer Visibility');
    expect(text).toContain('Group Prayer');
    expect(text).toContain('Church Prayer');
    expect(fixture.componentInstance.visibility).toBe('group');
    expect(fixture.componentInstance.selectedGroupId).toBe('g1');
    fixture.destroy();
  });
});

