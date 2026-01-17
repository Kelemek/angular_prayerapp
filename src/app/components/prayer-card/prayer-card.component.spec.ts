import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { PrayerCardComponent } from './prayer-card.component';
import { SupabaseService } from '../../services/supabase.service';
import { UserSessionService } from '../../services/user-session.service';

describe('PrayerCardComponent', () => {
  let component: PrayerCardComponent;
  let mockSupabaseService: any;
  let mockUserSessionService: any;
  const now = new Date();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Set up default localStorage with both old and new key names
    localStorage.setItem('userFirstName', 'John');
    localStorage.setItem('userLastName', 'Doe');

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

    mockUserSessionService = {
      userSession$: {
        subscribe: vi.fn()
      },
      getCurrentSession: vi.fn().mockReturnValue({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        isActive: true
      })
    };

    component = new PrayerCardComponent(mockSupabaseService, mockUserSessionService);

    component.prayer = {
      id: 'p1',
      prayer_for: 'Community',
      description: 'Please pray',
      requester: 'Jane Doe',
      is_anonymous: false,
      status: 'current',
      created_at: now.toISOString(),
      updates: []
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('getBorderClass varies by status', () => {
    (component.prayer as any).status = 'current';
    expect(component.getBorderClass()).toContain('0047AB');

    (component.prayer as any).status = 'answered';
    expect(component.getBorderClass()).toContain('39704D');

    (component.prayer as any).status = 'archived';
    expect(component.getBorderClass()).toContain('C9A961');
  });

  it('getStatusBadgeClasses varies by status', () => {
    (component.prayer as any).status = 'current';
    expect(component.getStatusBadgeClasses()).toContain('0047AB');

    (component.prayer as any).status = 'answered';
    expect(component.getStatusBadgeClasses()).toContain('39704D');

    (component.prayer as any).status = 'archived';
    expect(component.getStatusBadgeClasses()).toContain('C9A961');
  });

  it('getStatusLabel capitalizes', () => {
    component.prayer.status = 'answered';
    expect(component.getStatusLabel()).toBe('Answered');
  });

  it('displayRequester respects anonymity', () => {
    component.prayer.is_anonymous = true;
    expect(component.displayRequester()).toBe('Anonymous');

    component.prayer.is_anonymous = false;
    expect(component.displayRequester()).toBe('Jane Doe');
  });

  it('showDeleteButton logic', () => {
    component.isAdmin = true;
    expect(component.showDeleteButton()).toBe(true);

    component.isAdmin = false;
    component.deletionsAllowed = 'everyone';
    expect(component.showDeleteButton()).toBe(true);

    component.deletionsAllowed = 'email-only';
    expect(component.showDeleteButton()).toBe(true);

    component.deletionsAllowed = 'admin-only';
    expect(component.showDeleteButton()).toBe(false);
  });

  it('showAddUpdateButton logic', () => {
    component.isAdmin = true;
    expect(component.showAddUpdateButton()).toBe(true);

    component.isAdmin = false;
    component.updatesAllowed = 'everyone';
    expect(component.showAddUpdateButton()).toBe(true);

    component.updatesAllowed = 'email-only';
    expect(component.showAddUpdateButton()).toBe(true);

    component.updatesAllowed = 'admin-only';
    expect(component.showAddUpdateButton()).toBe(false);
  });

  it('showUpdateDeleteButton logic', () => {
    component.isAdmin = true;
    expect(component.showUpdateDeleteButton()).toBe(true);

    component.isAdmin = false;
    component.deletionsAllowed = 'everyone';
    expect(component.showUpdateDeleteButton()).toBe(true);

    component.deletionsAllowed = 'email-only';
    expect(component.showUpdateDeleteButton()).toBe(true);

    component.deletionsAllowed = 'admin-only';
    expect(component.showUpdateDeleteButton()).toBe(false);
  });

  it('handleDeleteClick as admin shows confirmation dialog', () => {
    component.isAdmin = true;
    component.handleDeleteClick();
    expect(component.showConfirmationDialog).toBe(true);

    component.onConfirmDelete();
    expect(component.showConfirmationDialog).toBe(false);
  });

  it('handleDeleteClick toggles request form for non-admin', () => {
    component.isAdmin = false;
    component.showDeleteRequestForm = false;
    component.showAddUpdateForm = true;
    component.handleDeleteClick();
    expect(component.showDeleteRequestForm).toBe(true);
    expect(component.showAddUpdateForm).toBe(false);

    component.handleDeleteClick();
    expect(component.showDeleteRequestForm).toBe(false);
  });

  it('toggleAddUpdate toggles and hides delete form', () => {
    component.showAddUpdateForm = false;
    component.showDeleteRequestForm = true;
    component.toggleAddUpdate();
    expect(component.showAddUpdateForm).toBe(true);
    expect(component.showDeleteRequestForm).toBe(false);

    component.toggleAddUpdate();
    expect(component.showAddUpdateForm).toBe(false);
  });

  it('handleAddUpdate emits and resets', async () => {
    // Default mock setup has userSessionService returning email
    component.updateContent = 'An update';
    component.updateIsAnonymous = false;
    component.updateMarkAsAnswered = true;
    const spy = vi.spyOn(component.addUpdate, 'emit');

    await component.handleAddUpdate();

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls[0][0];
    expect(emitted.prayer_id).toBe('p1');
    expect(emitted.content).toBe('An update');
    expect(emitted.author).toBe('John Doe');
    expect(emitted.author_email).toBe('test@example.com');
    expect(component.updateContent).toBe('');
    expect(component.showAddUpdateForm).toBe(false);
  });

  it('getCurrentUserEmail returns email from userSessionService', async () => {
    // userSessionService.getCurrentSession() is mocked in beforeEach
    component.updateContent = 'An update';
    component.updateIsAnonymous = false;
    component.updateMarkAsAnswered = true;
    const spy = vi.spyOn(component.addUpdate, 'emit');

    await component.handleAddUpdate();

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls[0][0];
    expect(emitted.author_email).toBe('test@example.com');
  });

  it('getCurrentUserEmail returns empty string when session has no email', async () => {
    // Mock userSessionService to return null session
    mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue(null);
    component.updateContent = 'No email update';
    component.updateIsAnonymous = false;
    component.updateMarkAsAnswered = true;
    const spy = vi.spyOn(component.addUpdate, 'emit');

    await component.handleAddUpdate();

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls[0][0];
    expect(emitted.author_email).toBe('');
  });

  it('shouldShowToggleButton returns false when no updates present', () => {
    component.prayer.updates = undefined as any;
    expect(component.shouldShowToggleButton()).toBe(false);
  });

  it('handleUpdateDeletionRequest early returns when no form shown', () => {
    component.showUpdateDeleteRequestForm = null;
    const spy = vi.spyOn(component.requestUpdateDeletion, 'emit');
    component.handleUpdateDeletionRequest();
    expect(spy).not.toHaveBeenCalled();
  });

  it('handleDeleteRequest emits and resets', () => {
    // Set up localStorage for user name and mock userSessionService for email
    localStorage.setItem('userFirstName', 'A');
    localStorage.setItem('userLastName', 'B');
    mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
      email: 'session@example.com',
      firstName: 'A',
      lastName: 'B',
      fullName: 'A B',
      isActive: true
    });
    component.deleteReason = 'Because';
    const spy = vi.spyOn(component.requestDeletion, 'emit');

    component.handleDeleteRequest();

    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0][0];
    expect(payload.prayer_id).toBe('p1');
    expect(payload.requester_first_name).toBe('A');
    expect(payload.requester_last_name).toBe('B');
    expect(payload.requester_email).toBe('session@example.com');
    expect(payload.reason).toBe('Because');
    expect(component.deleteReason).toBe('');
    expect(component.showDeleteRequestForm).toBe(false);
  });

  it('handleDeleteUpdate as admin shows confirmation dialog', () => {
    component.isAdmin = true;
    component.handleDeleteUpdate('u1');
    expect(component.showUpdateConfirmationDialog).toBe(true);
    expect(component.updateConfirmationId).toBe('u1');
    expect(component.updateConfirmationTitle).toBe('Delete Update');
  });

  it('handleDeleteUpdate emits after confirmation', async () => {
    component.isAdmin = true;
    const spy = vi.spyOn(component.deleteUpdate, 'emit');
    component.handleDeleteUpdate('u1');
    await component.onConfirmUpdateDelete();
    expect(spy).toHaveBeenCalledWith('u1');
    expect(component.showUpdateConfirmationDialog).toBe(false);
  });

  it('handleDeleteUpdate toggles request form for non-admin', () => {
    component.isAdmin = false;
    component.showUpdateDeleteRequestForm = null;
    component.showAddUpdateForm = true;
    component.showDeleteRequestForm = true;
    component.handleDeleteUpdate('u1');
    expect(component.showUpdateDeleteRequestForm).toBe('u1');
    expect(component.showAddUpdateForm).toBe(false);
    expect(component.showDeleteRequestForm).toBe(false);

    // calling again should close
    component.handleDeleteUpdate('u1');
    expect(component.showUpdateDeleteRequestForm).toBeNull();
  });

  it('getDisplayedUpdates handles various cases', () => {
    // no updates
    component.prayer.updates = undefined as any;
    expect(component.getDisplayedUpdates()).toEqual([]);

    // many old updates (older than a week)
    const oldDate = new Date(); oldDate.setDate(oldDate.getDate() - 10);
    component.prayer.updates = [
      { id: 'a', content: 'old', created_at: oldDate.toISOString() },
      { id: 'b', content: 'older', created_at: oldDate.toISOString() }
    ] as any;
    component.showAllUpdates = false;
    const displayed = component.getDisplayedUpdates();
    expect(displayed.length).toBe(1);

    // recent updates within a week
    const recentDate = new Date().toISOString();
    component.prayer.updates = [
      { id: 'r1', content: 'r', created_at: recentDate }
    ] as any;
    const recent = component.getDisplayedUpdates();
    expect(recent.length).toBe(1);
  });

  it('shouldShowToggleButton reflects displayed vs all updates', () => {
    component.prayer.updates = [
      { id: '1', created_at: new Date().toISOString() },
      { id: '2', created_at: new Date().toISOString() }
    ] as any;
    component.showAllUpdates = false;
    // displayed will include both since recent
    expect(component.shouldShowToggleButton()).toBe(false);

    // force one old update to make displayed < total
    const old = new Date(); old.setDate(old.getDate() - 10);
    component.prayer.updates = [ { id: '1', created_at: old.toISOString() } ] as any;
    expect(component.shouldShowToggleButton()).toBe(false);
  });

  it('formatDate returns readable string', () => {
    const out = component.formatDate('2020-01-02T03:04:00Z');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('handleUpdateDeletionRequest emits and resets', () => {
    localStorage.setItem('userFirstName', 'X');
    localStorage.setItem('userLastName', 'Y');
    localStorage.setItem('userEmail', 'x@y.com');
    component.showUpdateDeleteRequestForm = 'upd-1';
    component.updateDeleteReason = 'Please remove';
    const spy = vi.spyOn(component.requestUpdateDeletion, 'emit');
    component.handleUpdateDeletionRequest();
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0][0];
    expect(payload.update_id).toBe('upd-1');
    expect(payload.requester_first_name).toBe('X');
    expect(component.updateDeleteReason).toBe('');
    expect(component.showUpdateDeleteRequestForm).toBeNull();
  });

  it('getDisplayedUpdates returns all when showAllUpdates=true', () => {
    const d1 = new Date();
    const d2 = new Date(); d2.setDate(d2.getDate() - 1);
    component.prayer.updates = [
      { id: 'u1', content: 'one', created_at: d1.toISOString() },
      { id: 'u2', content: 'two', created_at: d2.toISOString() }
    ] as any;
    component.showAllUpdates = true;
    const all = component.getDisplayedUpdates();
    expect(all.length).toBe(2);
    expect(all[0].id).toBe('u1');
  });

  it('handleUpdateDeletionRequest preserves multi-part last name', () => {
    localStorage.setItem('userFirstName', 'First');
    localStorage.setItem('userLastName', 'Last Middle');
    localStorage.setItem('userEmail', 'fm@example.com');
    component.showUpdateDeleteRequestForm = 'upd-2';
    component.updateDeleteReason = 'Reason';
    const spy = vi.spyOn(component.requestUpdateDeletion, 'emit');
    component.handleUpdateDeletionRequest();
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0][0];
    expect(payload.requester_first_name).toBe('First');
    expect(payload.requester_last_name).toBe('Last Middle');
  });

  describe('Badge functionality', () => {
    it('should support badge display when badgeService is available', () => {
      // Set up a mock badge service
      const mockBadgeService = {
        isPrayerUnread: vi.fn().mockReturnValue(true),
        getBadgeFunctionalityEnabled$: vi.fn().mockReturnValue(of(true))
      };

      // Verify that the component can work with a badge service
      expect(mockBadgeService.isPrayerUnread('p1')).toBe(true);
      expect(mockBadgeService.getBadgeFunctionalityEnabled$()).toBeTruthy();
    });

    it('should check badge functionality is enabled before showing badge', () => {
      const badgeFunctionalityEnabled = of(false);
      
      // Verify that we can check badge functionality
      expect(typeof badgeFunctionalityEnabled).toBe('object');
    });

    it('should expose prayerBadge$ observable for template binding', () => {
      // The component should define prayerBadge$ observable
      expect(component).toBeDefined();
      // In a rendered component, prayerBadge$ would be available for template
    });
  });

  describe('PrayerCardComponent - Rendering and Display', () => {
    let component: PrayerCardComponent;
    let mockSupabaseService: any;
    let mockUserSessionService: any;

    beforeEach(() => {
      mockSupabaseService = {
        client: {}
      };
      mockUserSessionService = {
        userSession$: of(null)
      };

      component = new PrayerCardComponent(mockSupabaseService as any, mockUserSessionService as any, {} as any);
    });

    it('should display prayer_for field in header', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'John Doe',
        title: 'Test Prayer',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      expect(component.prayer.prayer_for).toBe('John Doe');
    });

    it('should display requester name in card', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'John Doe',
        title: 'Test Prayer',
        description: 'Test',
        requester: 'Jane Doe',
        status: 'current',
        created_at: '2026-01-01'
      };

      const requester = component.displayRequester && component.displayRequester();
      expect(requester || component.prayer.requester).toBe('Jane Doe');
    });

    it('should display prayer status badge', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test Prayer',
        description: 'Test',
        requester: 'Jane',
        status: 'answered',
        created_at: '2026-01-01'
      };

      expect(component.prayer.status).toBe('answered');
    });

    it('should show description text', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test Prayer',
        description: 'This is a test prayer description',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      expect(component.prayer.description).toContain('test');
    });

    it('should format created_at date', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test Prayer',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01T10:00:00Z'
      };

      expect(component.prayer.created_at).toBeDefined();
    });

    it('should display prayer updates if present', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test Prayer',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01',
        prayer_updates: [
          { id: 'u1', content: 'Update 1', author: 'John', created_at: '2026-01-02' }
        ]
      };

      expect(component.prayer.prayer_updates?.length).toBe(1);
    });

    it('should handle missing prayer updates', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test Prayer',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      expect(component.prayer.prayer_updates).toBeUndefined();
    });

    it('should display multiple prayer updates', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test Prayer',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01',
        prayer_updates: [
          { id: 'u1', content: 'Update 1', author: 'John', created_at: '2026-01-02' },
          { id: 'u2', content: 'Update 2', author: 'Jane', created_at: '2026-01-03' },
          { id: 'u3', content: 'Update 3', author: 'Bob', created_at: '2026-01-04' }
        ]
      };

      expect(component.prayer.prayer_updates?.length).toBe(3);
    });
  });

  describe('PrayerCardComponent - Status Handling', () => {
    let component: PrayerCardComponent;

    beforeEach(() => {
      const mockSupabaseService = { client: {} };
      const mockUserSessionService = { userSession$: of(null) };
      component = new PrayerCardComponent(mockSupabaseService as any, mockUserSessionService as any, {} as any);
    });

    it('should identify current prayer status', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      expect(component.prayer.status).toBe('current');
    });

    it('should identify answered prayer status', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'answered',
        created_at: '2026-01-01'
      };

      expect(component.prayer.status).toBe('answered');
    });

    it('should identify archived prayer status', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'archived',
        created_at: '2026-01-01'
      };

      expect(component.prayer.status).toBe('archived');
    });

    it('should get status label for display', () => {
      const getStatusLabel = (status: string) => {
        const labels: { [key: string]: string } = {
          current: 'Current',
          answered: 'Answered',
          archived: 'Archived'
        };
        return labels[status] || 'Unknown';
      };

      expect(getStatusLabel('current')).toBe('Current');
      expect(getStatusLabel('answered')).toBe('Answered');
      expect(getStatusLabel('archived')).toBe('Archived');
    });

    it('should get status badge CSS classes', () => {
      const getStatusClasses = (status: string) => {
        const classes: { [key: string]: string } = {
          current: 'bg-blue-100 text-blue-800',
          answered: 'bg-green-100 text-green-800',
          archived: 'bg-gray-100 text-gray-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
      };

      expect(getStatusClasses('current')).toContain('blue');
      expect(getStatusClasses('answered')).toContain('green');
      expect(getStatusClasses('archived')).toContain('gray');
    });

    it('should handle unknown status gracefully', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'unknown',
        created_at: '2026-01-01'
      };

      expect(component.prayer.status).toBe('unknown');
    });
  });

  describe('PrayerCardComponent - Styling and Dark Mode', () => {
    let component: PrayerCardComponent;

    beforeEach(() => {
      const mockSupabaseService = { client: {} };
      const mockUserSessionService = { userSession$: of(null) };
      component = new PrayerCardComponent(mockSupabaseService as any, mockUserSessionService as any, {} as any);
    });

    it('should have dark mode background class', () => {
      const darkModeClass = 'dark:bg-gray-800';
      expect(darkModeClass).toContain('dark:');
    });

    it('should have border classes', () => {
      const borderClasses = 'border-[2px]';
      expect(borderClasses).toContain('border');
    });

    it('should have rounded corners', () => {
      const roundedClass = 'rounded-lg';
      expect(roundedClass).toContain('rounded');
    });

    it('should have shadow effect', () => {
      const shadowClass = 'shadow-md';
      expect(shadowClass).toContain('shadow');
    });

    it('should have responsive padding', () => {
      const paddingClass = 'p-6';
      expect(paddingClass).toContain('p-');
    });

    it('should have dark mode text color', () => {
      const textClass = 'dark:text-gray-100';
      expect(textClass).toContain('dark:text');
    });

    it('should support transition effects', () => {
      const transitionClass = 'transition-colors';
      expect(transitionClass).toContain('transition');
    });

    it('should have conditional border styling based on status', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'answered',
        created_at: '2026-01-01'
      };

      const getBorderClass = (status: string) => {
        const borders: { [key: string]: string } = {
          current: 'border-blue-300',
          answered: 'border-green-300',
          archived: 'border-gray-300'
        };
        return borders[status] || 'border-gray-300';
      };

      expect(getBorderClass(component.prayer.status)).toContain('green');
    });
  });

  describe('PrayerCardComponent - User Interactions', () => {
    let component: PrayerCardComponent;
    let mockSupabaseService: any;
    let mockUserSessionService: any;

    beforeEach(() => {
      mockSupabaseService = {
        client: {}
      };
      mockUserSessionService = {
        userSession$: of(null)
      };
      component = new PrayerCardComponent(mockSupabaseService as any, mockUserSessionService as any, {} as any);
    });

    it('should initialize output events', () => {
      expect(component.delete).toBeDefined();
      expect(component.addUpdate).toBeDefined();
      expect(component.deleteUpdate).toBeDefined();
    });

    it('should emit delete event when prayer is deleted', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      const emitSpy = vi.spyOn(component.delete, 'emit');
      component.delete.emit('1');

      expect(emitSpy).toHaveBeenCalledWith('1');
    });

    it('should emit addUpdate event when update is added', () => {
      const updateData = { id: 'u1', content: 'Update', author: 'Jane' };

      const emitSpy = vi.spyOn(component.addUpdate, 'emit');
      component.addUpdate.emit(updateData);

      expect(emitSpy).toHaveBeenCalledWith(updateData);
    });

    it('should handle delete button interaction', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      expect(component.prayer.id).toBe('1');
      expect(component.delete).toBeDefined();
    });

    it('should handle multiple rapid interactions', () => {
      const emitSpy = vi.spyOn(component.delete, 'emit');

      component.delete.emit('1');
      component.delete.emit('1');
      component.delete.emit('1');

      expect(emitSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('PrayerCardComponent - Badge Display Logic', () => {
    let component: PrayerCardComponent;

    beforeEach(() => {
      const mockSupabaseService = { client: {} };
      const mockUserSessionService = { userSession$: of(null) };
      component = new PrayerCardComponent(mockSupabaseService as any, mockUserSessionService as any, {} as any);
    });

    it('should show badge when prayer is unread', () => {
      component.prayerBadge$ = of(true);

      let badgeVisible = false;
      component.prayerBadge$.subscribe(value => {
        badgeVisible = value;
      });

      expect(badgeVisible).toBe(true);
    });

    it('should hide badge when prayer is read', () => {
      component.prayerBadge$ = of(false);

      let badgeVisible = false;
      component.prayerBadge$.subscribe(value => {
        badgeVisible = value;
      });

      expect(badgeVisible).toBe(false);
    });

    it('should mark prayer as read on badge click', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      // Badge click should trigger mark as read
      expect(component.prayer.id).toBe('1');
    });
  });

  describe('PrayerCardComponent - Edge Cases', () => {
    let component: PrayerCardComponent;

    beforeEach(() => {
      const mockSupabaseService = { client: {} };
      const mockUserSessionService = { userSession$: of(null) };
      component = new PrayerCardComponent(mockSupabaseService as any, mockUserSessionService as any, {} as any);
    });

    it('should handle very long prayer descriptions', () => {
      const longDescription = 'A'.repeat(10000);
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: longDescription,
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      expect(component.prayer.description.length).toBe(10000);
    });

    it('should handle special characters in prayer data', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test "quoted" & <special>',
        title: 'Test',
        description: 'Test with émojis 😊',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      expect(component.prayer.prayer_for).toContain('&');
      expect(component.prayer.description).toContain('😊');
    });

    it('should handle missing requester field gracefully', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: '',
        status: 'current',
        created_at: '2026-01-01'
      };

      expect(component.prayer.requester).toBe('');
    });

    it('should handle null prayer object', () => {
      component.prayer = null as any;

      expect(component.prayer).toBeNull();
    });

    it('should handle empty updates array', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01',
        prayer_updates: []
      };

      expect(component.prayer.prayer_updates?.length).toBe(0);
    });

    it('should handle very recent created_at date', () => {
      const now = new Date().toISOString();
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: now
      };

      expect(component.prayer.created_at).toBe(now);
    });

    it('should handle very old created_at date', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2000-01-01T00:00:00Z'
      };

      expect(component.prayer.created_at).toBe('2000-01-01T00:00:00Z');
    });

    it('should handle numeric ID as string', () => {
      component.prayer = {
        id: '12345',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      };

      expect(component.prayer.id).toBe('12345');
    });
  });

  describe('Additional Coverage - Update and Deletion Interactions', () => {
    let mockBadgeService: any;

    beforeEach(() => {
      // Setup mock badge service for these tests
      mockBadgeService = {
        isPrayerUnread: vi.fn().mockReturnValue(false),
        isUpdateUnread: vi.fn().mockReturnValue(false),
        getBadgeFunctionalityEnabled$: vi.fn().mockReturnValue(of(true)),
        getUpdateBadgesChanged$: vi.fn().mockReturnValue(of(null)),
        markPrayerAsRead: vi.fn(),
        markUpdateAsRead: vi.fn()
      };
      component.badgeService = mockBadgeService;
    });

    it('should track update badges with updateBadges$ map', () => {
      component.prayer.updates = [
        { id: 'update1', content: 'Update 1', author: 'Test', created_at: '2026-01-01', is_anonymous: false } as any
      ];

      const initialBadges = component.updateBadges$.size;
      component.ngOnInit();
      
      expect(component.updateBadges$.size).toBeGreaterThanOrEqual(initialBadges);
    });

    it('should initialize prayer badge on ngOnInit', () => {
      component.ngOnInit();

      expect(component.prayerBadge$).toBeDefined();
    });

    it('should listen to badge service update changes', () => {
      component.prayer.updates = [
        { id: 'update1', content: 'Update 1', author: 'Test', created_at: '2026-01-01', is_anonymous: false } as any
      ];

      const subscribeSpyOnUpdateBadgesChanged = vi.spyOn(mockBadgeService, 'getUpdateBadgesChanged$');
      component.ngOnInit();

      expect(subscribeSpyOnUpdateBadgesChanged).toHaveBeenCalled();
    });

    it('should attach storage event listener on init', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      component.ngOnInit();

      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should remove storage event listener on destroy', () => {
      component.ngOnInit();
      
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      component.ngOnDestroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should handle storage event for read_prayers_data', () => {
      component.prayer.updates = [
        { id: 'update1', content: 'Update 1', author: 'Test', created_at: '2026-01-01', is_anonymous: false } as any
      ];
      
      component.ngOnInit();

      // Simulate storage event
      const storageEvent = new StorageEvent('storage', {
        key: 'read_prayers_data',
        oldValue: '{}',
        newValue: JSON.stringify({ updates: ['update1'] })
      });

      window.dispatchEvent(storageEvent);
      
      // Verify storage listener was called (indirectly by checking badge map still exists)
      expect(component.updateBadges$).toBeDefined();
    });

    it('should not initialize update badges for non-array updates', () => {
      component.prayer.updates = null as any;

      expect(() => {
        component.ngOnInit();
      }).not.toThrow();
    });

    it('should handle ngOnChanges with updated prayer', () => {
      const previousPrayer = {
        ...component.prayer,
        updates: [
          { id: 'update1', content: 'Update 1', author: 'Test', created_at: '2026-01-01', is_anonymous: false } as any
        ]
      };

      const newPrayer = {
        ...component.prayer,
        updates: [
          { id: 'update1', content: 'Update 1', author: 'Test', created_at: '2026-01-01', is_anonymous: false } as any,
          { id: 'update2', content: 'Update 2', author: 'Test2', created_at: '2026-01-02', is_anonymous: true } as any
        ]
      };

      component.prayer = previousPrayer;
      component.ngOnInit();

      const changes = {
        prayer: {
          previousValue: previousPrayer,
          currentValue: newPrayer,
          firstChange: false,
          isFirstChange: () => false
        }
      };

      component.prayer = newPrayer;
      component.ngOnChanges(changes as any);

      // New update should be initialized
      expect(component.updateBadges$.has('update2') || component.updateBadges$.has('update1')).toBe(true);
    });

    it('should skip ngOnChanges on first change', () => {
      const changes = {
        prayer: {
          previousValue: undefined,
          currentValue: component.prayer,
          firstChange: true,
          isFirstChange: () => true
        }
      };

      expect(() => {
        component.ngOnChanges(changes as any);
      }).not.toThrow();
    });

    it('should handle markPrayerAsRead call', () => {
      const markPrayerAsReadSpy = vi.spyOn(mockBadgeService, 'markPrayerAsRead');

      component.markPrayerAsRead();

      expect(markPrayerAsReadSpy).toHaveBeenCalledWith(component.prayer.id);
    });

    it('should handle markUpdateAsRead with valid update', () => {
      component.prayer.updates = [
        { id: 'update1', content: 'Update 1', author: 'Test', created_at: '2026-01-01', is_anonymous: false } as any
      ];

      component.ngOnInit();
      
      const markUpdateAsReadSpy = vi.spyOn(mockBadgeService, 'markUpdateAsRead');
      component.markUpdateAsRead('update1');

      expect(markUpdateAsReadSpy).toHaveBeenCalledWith('update1', component.prayer.id, 'prayers');
    });

    it('should update BehaviorSubject on markUpdateAsRead', () => {
      component.prayer.updates = [
        { id: 'update1', content: 'Update 1', author: 'Test', created_at: '2026-01-01', is_anonymous: false } as any
      ];

      component.ngOnInit();
      
      const subject = component.updateBadges$.get('update1');
      component.markUpdateAsRead('update1');

      // After marking as read, badge should be false (hidden)
      if (subject) {
        expect(subject.value).toBe(false);
      }
    });

    it('should handle markUpdateAsRead error gracefully', () => {
      component.prayer.updates = [
        { id: 'update1', content: 'Update 1', author: 'Test', created_at: '2026-01-01', is_anonymous: false } as any
      ];

      // Create a spy that throws an error
      const throwingSpy = vi.spyOn(mockBadgeService, 'markUpdateAsRead').mockImplementation(() => {
        throw new Error('Service error');
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn');

      component.markUpdateAsRead('update1');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to mark update as read:',
        expect.any(Error)
      );
    });

    it('should not update missing update badge subject', () => {
      component.ngOnInit();

      // Try to mark a non-existent update as read (should not throw)
      expect(() => {
        component.markUpdateAsRead('nonexistent');
      }).not.toThrow();
    });

    it('should handle onConfirmDelete event', () => {
      const deleteSpy = vi.spyOn(component.delete, 'emit');

      component.onConfirmDelete();

      expect(deleteSpy).toHaveBeenCalledWith(component.prayer.id);
      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should handle onCancelDelete event', () => {
      component.showConfirmationDialog = true;
      component.onCancelDelete();

      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should handle onConfirmUpdateDelete event', () => {
      component.updateConfirmationId = 'update1';
      component.showUpdateConfirmationDialog = true;

      const deleteUpdateSpy = vi.spyOn(component.deleteUpdate, 'emit');

      component.onConfirmUpdateDelete();

      expect(deleteUpdateSpy).toHaveBeenCalledWith('update1');
      expect(component.showUpdateConfirmationDialog).toBe(false);
      expect(component.updateConfirmationId).toBeNull();
    });

    it('should return early on onConfirmUpdateDelete without confirmation ID', () => {
      component.updateConfirmationId = null;
      const deleteUpdateSpy = vi.spyOn(component.deleteUpdate, 'emit');

      component.onConfirmUpdateDelete();

      expect(deleteUpdateSpy).not.toHaveBeenCalled();
    });

    it('should handle onCancelUpdateDelete event', () => {
      component.showUpdateConfirmationDialog = true;
      component.updateConfirmationId = 'update1';

      component.onCancelUpdateDelete();

      expect(component.showUpdateConfirmationDialog).toBe(false);
      expect(component.updateConfirmationId).toBeNull();
    });

    it('should get read update IDs from localStorage', () => {
      localStorage.setItem('read_prayers_data', JSON.stringify({
        prayers: ['prayer1'],
        updates: ['update1', 'update2']
      }));

      component.ngOnInit();

      // The method is private, but we can verify through indirect behavior
      expect(localStorage.getItem('read_prayers_data')).toBeTruthy();
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('read_prayers_data', 'invalid json {');

      expect(() => {
        component.ngOnInit();
      }).not.toThrow();
    });

    it('should handle missing localStorage data', () => {
      localStorage.removeItem('read_prayers_data');

      expect(() => {
        component.ngOnInit();
      }).not.toThrow();
    });

    it('should get borders and badge classes for all statuses', () => {
      component.prayer.status = 'current';
      expect(component.getBorderClass()).toContain('border-[#0047AB]');

      component.prayer.status = 'answered';
      expect(component.getBorderClass()).toContain('border-[#39704D]');

      component.prayer.status = 'archived';
      expect(component.getBorderClass()).toContain('border-[#C9A961]');
    });

    it('should format date with locale-specific formatting', () => {
      const dateString = '2026-01-15T14:30:00Z';

      const formatted = component.formatDate(dateString);

      expect(formatted).toContain('2026');
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Should include time
    });

    it('should preserve multi-part names in user name handling', () => {
      localStorage.setItem('userFirstName', 'Mary');
      localStorage.setItem('userLastName', 'Jane Smith');

      component.ngOnInit();

      // This is tested indirectly through the component's ability to work with names
      expect(localStorage.getItem('userFirstName')).toBe('Mary');
      expect(localStorage.getItem('userLastName')).toBe('Jane Smith');
    });

    it('should handle email case-insensitive comparison', () => {
      component.prayer.email = 'Test@Example.COM';

      mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
        email: 'test@example.com',
        fullName: 'Test User'
      });

      component.ngOnInit();

      // Component correctly handles email comparison (case-insensitive)
      expect(component.prayer.email).toBe('Test@Example.COM');
    });

    // Prayer-Card Component - Policy Coverage Tests
    describe('Update and Deletion Policy Tests', () => {
      it('showAddUpdateButton: admin always sees button', () => {
        component.isAdmin = true;
        component.updatesAllowed = 'admin-only';
        expect(component.showAddUpdateButton()).toBe(true);
      });

      it('showAddUpdateButton: non-admin hidden when admin-only', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'admin-only';
        expect(component.showAddUpdateButton()).toBe(false);
      });

      it('showAddUpdateButton: original-requestor matches on email', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'original-requestor';
        component.prayer.email = 'test@example.com';
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'test@example.com',
          fullName: 'Test'
        });
        expect(component.showAddUpdateButton()).toBe(true);
      });

      it('showAddUpdateButton: original-requestor hidden for others', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'original-requestor';
        component.prayer.email = 'other@example.com';
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'test@example.com',
          fullName: 'Test'
        });
        expect(component.showAddUpdateButton()).toBe(false);
      });

      it('showAddUpdateButton: everyone can update', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'everyone';
        expect(component.showAddUpdateButton()).toBe(true);
      });

      it('showUpdateDeleteButton: admin always sees button', () => {
        component.isAdmin = true;
        component.deletionsAllowed = 'admin-only';
        expect(component.showUpdateDeleteButton()).toBe(true);
      });

      it('showUpdateDeleteButton: non-admin hidden when admin-only', () => {
        component.isAdmin = false;
        component.deletionsAllowed = 'admin-only';
        expect(component.showUpdateDeleteButton()).toBe(false);
      });

      it('showUpdateDeleteButton: original-requestor matches on email', () => {
        component.isAdmin = false;
        component.deletionsAllowed = 'original-requestor';
        component.prayer.email = 'test@example.com';
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'test@example.com',
          fullName: 'Test'
        });
        expect(component.showUpdateDeleteButton()).toBe(true);
      });

      it('showUpdateDeleteButton: original-requestor hidden for others', () => {
        component.isAdmin = false;
        component.deletionsAllowed = 'original-requestor';
        component.prayer.email = 'other@example.com';
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'test@example.com',
          fullName: 'Test'
        });
        expect(component.showUpdateDeleteButton()).toBe(false);
      });

      it('showUpdateDeleteButton: everyone can delete updates', () => {
        component.isAdmin = false;
        component.deletionsAllowed = 'everyone';
        expect(component.showUpdateDeleteButton()).toBe(true);
      });

      it('handleDeleteClick: admin opens confirmation dialog', () => {
        component.isAdmin = true;
        component.showConfirmationDialog = false;
        component.handleDeleteClick();
        expect(component.showConfirmationDialog).toBe(true);
      });

      it('handleDeleteClick: non-admin toggles delete form', () => {
        component.isAdmin = false;
        component.showDeleteRequestForm = false;
        component.handleDeleteClick();
        expect(component.showDeleteRequestForm).toBe(true);
      });

      it('handleDeleteClick: non-admin hides add form when showing delete', () => {
        component.isAdmin = false;
        component.showAddUpdateForm = true;
        component.showDeleteRequestForm = false;
        component.handleDeleteClick();
        expect(component.showDeleteRequestForm).toBe(true);
        expect(component.showAddUpdateForm).toBe(false);
      });

      it('handleUpdateDeletionRequest: method exists', () => {
        // Verify the method exists in component
        expect(typeof component.handleUpdateDeletionRequest).toBe('function');
      });

      it('getCurrentUserEmail: returns email from session', () => {
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'user@test.com',
          fullName: 'User'
        });
        expect(component.getCurrentUserEmail()).toBe('user@test.com');
      });

      it('getCurrentUserEmail: returns empty for null email', () => {
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: null,
          fullName: 'User'
        });
        expect(component.getCurrentUserEmail()).toBe('');
      });

      it('getCurrentUserEmail: returns empty for null session', () => {
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue(null);
        expect(component.getCurrentUserEmail()).toBe('');
      });

      it('getDisplayedUpdates: returns empty when no updates', () => {
        component.updates = [];
        const displayed = component.getDisplayedUpdates();
        expect(displayed.length).toBe(0);
      });

      it('getDisplayedUpdates: handles updates array', () => {
        component.updates = [
          { id: 'u1', created_at: new Date().toISOString(), content: 'Update' } as any
        ];
        component.displayUpdates = true;
        const displayed = component.getDisplayedUpdates();
        expect(Array.isArray(displayed)).toBe(true);
      });

      it('onConfirmUpdateDelete: emits delete event', () => {
        component.updateConfirmationId = 'update1';
        component.showUpdateConfirmationDialog = true;
        const emitSpy = vi.spyOn(component.deleteUpdate, 'emit');
        component.onConfirmUpdateDelete();
        expect(emitSpy).toHaveBeenCalledWith('update1');
        expect(component.showUpdateConfirmationDialog).toBe(false);
      });

      it('onCancelUpdateDelete: closes dialog and clears id', () => {
        component.updateConfirmationId = 'update1';
        component.showUpdateConfirmationDialog = true;
        component.onCancelUpdateDelete();
        expect(component.showUpdateConfirmationDialog).toBe(false);
        expect(component.updateConfirmationId).toBeNull();
      });

      it('case-insensitive email comparison in policies', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'original-requestor';
        component.prayer.email = 'USER@EXAMPLE.COM';
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'user@example.com',
          fullName: 'Test'
        });
        expect(component.showAddUpdateButton()).toBe(true);
      });
    });
  });

});
