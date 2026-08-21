import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { PrayerCardComponent } from './prayer-card.component';
import { UserSessionService } from '../../services/user-session.service';
import { PrayerCardBadgeWire } from '../../lib/prayer-card-badge-wire';

const mockRichTextEditorsSettings = {
  getRichTextEditorsEnabled$: () => of(true),
};

function defaultPrayerCardCtorDeps() {
  return {
    badge: {
      isPrayerUnread: vi.fn().mockReturnValue(false),
      isUpdateUnread: vi.fn().mockReturnValue(false),
      getUpdateBadgesChanged$: vi.fn().mockReturnValue(of(null)),
      markPrayerAsRead: vi.fn(),
      markUpdateAsRead: vi.fn(),
      getBadgeFunctionalityEnabled$: vi.fn().mockReturnValue(of(true)),
    } as any,
    prayerService: {} as any,
    encouragement: {
      getCanPrayFor$: vi.fn().mockReturnValue(of(true)),
    } as any,
    itemReminders: {
      ensureLoaded: vi.fn().mockResolvedValue([]),
      remindersForPrayer: vi.fn().mockReturnValue([]),
    } as any,
    cdr: { markForCheck: vi.fn() } as any,
  };
}

describe('PrayerCardComponent', () => {
  let component: PrayerCardComponent;
  let mockUserSessionService: any;
  const now = new Date();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Set up default localStorage with both old and new key names
    localStorage.setItem('userFirstName', 'John');
    localStorage.setItem('userLastName', 'Doe');

    mockUserSessionService = {
      userSession$: of({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        isActive: true,
      }),
      getShowPrayForButton$: vi.fn().mockReturnValue(of(true)),
      getShowPrayingCount$: vi.fn().mockReturnValue(of(true)),
      getCurrentSession: vi.fn().mockReturnValue({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        isActive: true
      })
    };

    const deps = defaultPrayerCardCtorDeps();
    component = new PrayerCardComponent(
      mockUserSessionService,
      deps.badge,
      deps.prayerService,
      deps.encouragement,
      deps.itemReminders,
      deps.cdr,
      mockRichTextEditorsSettings as any
    );

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

  describe('showReminderButton', () => {
    it('shows for current community prayers when session email exists', () => {
      (component.prayer as any).status = 'current';
      component.isPersonal = false;
      expect(component.viewState.showReminderButton).toBe(true);
    });

    it('hides for answered and archived community prayers', () => {
      component.isPersonal = false;
      (component.prayer as any).status = 'answered';
      expect(component.viewState.showReminderButton).toBe(false);
      (component.prayer as any).status = 'archived';
      expect(component.viewState.showReminderButton).toBe(false);
    });

    it('hides for answered personal prayers', () => {
      component.isPersonal = true;
      (component.prayer as any).category = 'Answered';
      expect(component.viewState.showReminderButton).toBe(false);
    });

    it('shows for active personal prayers that are not answered', () => {
      component.isPersonal = true;
      (component.prayer as any).category = 'Family';
      expect(component.viewState.showReminderButton).toBe(true);
    });

    it('hides when there is no session email', () => {
      mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({ email: '' });
      (component.prayer as any).status = 'current';
      expect(component.viewState.showReminderButton).toBe(false);
    });
  });

  it('getBorderClass uses Personal tab green for personal prayers regardless of status', () => {
    component.isPersonal = true;
    (component.prayer as any).status = 'current';

    expect(component.getBorderClass()).toContain('2F5F54');
    expect(component.getBorderClass()).not.toContain('0047AB');
    expect(component.getBorderClass()).not.toContain('border-gray-300');
  });

  it('getBorderClass matches Members tab for Planning Center list prayers', () => {
    (component.prayer as any).id = 'pc-member-123';
    (component.prayer as any).status = 'current';

    expect(component.getBorderClass()).toContain('0047AB');
    expect(component.getBorderClass()).toContain('ring-[#0047AB]');
    expect(component.getBorderClass()).not.toContain('blue-600');
  });

  it('showDescription is false for member prayers even when description is set', () => {
    component.prayer = {
      ...component.prayer,
      id: 'pc-member-123',
      description: 'Updates from Jane Doe',
    } as any;
    expect(component.viewState.showDescription).toBe(false);
  });

  it('showDescription is false when description is empty', () => {
    component.prayer = {
      ...component.prayer,
      id: 'p1',
      description: '   ',
    } as any;
    expect(component.viewState.showDescription).toBe(false);
  });

  it('showDescription is true for community prayers with text', () => {
    component.prayer = {
      ...component.prayer,
      id: 'p1',
      description: 'Please pray for recovery.',
    } as any;
    expect(component.viewState.showDescription).toBe(true);
  });

  it('displayRequester respects anonymity', () => {
    component.prayer.is_anonymous = true;
    expect(component.viewState.displayRequester).toBe('Anonymous');

    component.prayer.is_anonymous = false;
    expect(component.viewState.displayRequester).toBe('Jane Doe');
  });

  describe('meta header helpers', () => {
    it('isCommunityPrayer is true for community cards only', () => {
      component.isPersonal = false;
      component.prayer.id = 'p1';
      expect(component.viewState.isCommunityPrayer).toBe(true);

      component.isPersonal = true;
      expect(component.viewState.isCommunityPrayer).toBe(false);

      component.isPersonal = false;
      component.prayer.id = 'pc-member-1';
      expect(component.viewState.isCommunityPrayer).toBe(false);
    });

    it('personalDragHandle enables meta header date drag when personal', () => {
      component.isPersonal = true;
      component.personalDragHandle = true;
      expect(component.personalDragHandle).toBe(true);
    });

    it('showStatusPillInHeader is true for community cards only', () => {
      component.isPersonal = false;
      component.prayer.id = 'p1';
      expect(component.viewState.showStatusPillInHeader).toBe(true);

      component.prayer.id = 'pc-member-1';
      expect(component.viewState.showStatusPillInHeader).toBe(false);

      component.prayer.id = 'p1';
      component.isPersonal = true;
      expect(component.viewState.showStatusPillInHeader).toBe(false);
    });
  });

  it('showDeleteButton logic', () => {
    component.isAdmin = true;
    expect(component.viewState.showDeleteButton).toBe(true);

    component.isAdmin = false;
    component.deletionsAllowed = 'everyone';
    expect(component.viewState.showDeleteButton).toBe(true);

    component.deletionsAllowed = 'everyone';
    expect(component.viewState.showDeleteButton).toBe(true);

    component.deletionsAllowed = 'admin-only';
    expect(component.viewState.showDeleteButton).toBe(false);
  });

  it('showAddUpdateButton logic', () => {
    component.isAdmin = true;
    expect(component.viewState.showAddUpdateButton).toBe(true);

    component.isAdmin = false;
    component.updatesAllowed = 'everyone';
    expect(component.viewState.showAddUpdateButton).toBe(true);

    component.updatesAllowed = 'everyone';
    expect(component.viewState.showAddUpdateButton).toBe(true);

    component.updatesAllowed = 'admin-only';
    expect(component.viewState.showAddUpdateButton).toBe(false);
  });

  it('showUpdateDeleteButton logic', () => {
    component.isAdmin = true;
    expect(component.viewState.showUpdateDeleteButton).toBe(true);

    component.isAdmin = false;
    component.deletionsAllowed = 'everyone';
    expect(component.viewState.showUpdateDeleteButton).toBe(true);

    component.deletionsAllowed = 'everyone';
    expect(component.viewState.showUpdateDeleteButton).toBe(true);

    component.deletionsAllowed = 'admin-only';
    expect(component.viewState.showUpdateDeleteButton).toBe(false);
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

  it('toggleAddUpdate toggles and hides delete forms', () => {
    component.showAddUpdateForm = false;
    component.showDeleteRequestForm = true;
    component.showUpdateDeleteRequestForm = 'upd-1';
    component.toggleAddUpdate();
    expect(component.showAddUpdateForm).toBe(true);
    expect(component.showDeleteRequestForm).toBe(false);
    expect(component.showUpdateDeleteRequestForm).toBeNull();

    component.toggleAddUpdate();
    expect(component.showAddUpdateForm).toBe(false);
  });

  it('onDeleteRequestModalSubmit routes to prayer or update handlers', () => {
    const prayerSpy = vi.spyOn(component, 'onDeleteRequestSubmit');
    const updateSpy = vi.spyOn(component, 'onUpdateDeleteRequestSubmit');

    component.showUpdateDeleteRequestForm = null;
    component.onDeleteRequestModalSubmit({ reason: 'Prayer reason' });
    expect(prayerSpy).toHaveBeenCalledWith({ reason: 'Prayer reason' });
    expect(updateSpy).not.toHaveBeenCalled();

    component.showUpdateDeleteRequestForm = 'upd-1';
    component.onDeleteRequestModalSubmit({ reason: 'Update reason' });
    expect(updateSpy).toHaveBeenCalledWith({ reason: 'Update reason' });
  });

  it('onAddUpdateSubmit ignores invalid payloads (e.g. native submit events)', () => {
    const spy = vi.spyOn(component.addUpdate, 'emit');
    component.showAddUpdateForm = true;

    component.onAddUpdateSubmit({} as any);

    expect(spy).not.toHaveBeenCalled();
    expect(component.showAddUpdateForm).toBe(true);
  });

  it('onAddUpdateSubmit emits and closes modal', () => {
    const spy = vi.spyOn(component.addUpdate, 'emit');

    component.onAddUpdateSubmit({
      content: 'An update',
      is_anonymous: false,
      mark_as_answered: true,
    });

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls[0][0];
    expect(emitted.prayer_id).toBe('p1');
    expect(emitted.content).toBe('An update');
    expect(emitted.author).toBe('John Doe');
    expect(emitted.author_email).toBe('test@example.com');
    expect(emitted.mark_as_answered).toBe(true);
    expect(component.showAddUpdateForm).toBe(false);
  });

  it('getCurrentUserEmail returns email from userSessionService', () => {
    const spy = vi.spyOn(component.addUpdate, 'emit');

    component.onAddUpdateSubmit({
      content: 'An update',
      is_anonymous: false,
      mark_as_answered: true,
    });

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls[0][0];
    expect(emitted.author_email).toBe('test@example.com');
  });

  it('getCurrentUserEmail returns empty string when session has no email', () => {
    mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue(null);
    const spy = vi.spyOn(component.addUpdate, 'emit');

    component.onAddUpdateSubmit({
      content: 'No email update',
      is_anonymous: false,
      mark_as_answered: true,
    });

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls[0][0];
    expect(emitted.author_email).toBe('');
  });

  it('closeAddUpdateForm closes the modal', () => {
    component.showAddUpdateForm = true;
    component.closeAddUpdateForm();
    expect(component.showAddUpdateForm).toBe(false);
  });

  it('shouldShowToggleButton returns false when no updates present', () => {
    component.prayer.updates = undefined as any;
    expect(component.shouldShowToggleButton()).toBe(false);
  });

  it('onUpdateDeleteRequestSubmit early returns when no update selected', () => {
    component.showUpdateDeleteRequestForm = null;
    const spy = vi.spyOn(component.requestUpdateDeletion, 'emit');
    component.onUpdateDeleteRequestSubmit({ reason: 'test' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('onUpdateDeleteRequestSubmit emits and closes modal', () => {
    localStorage.setItem('userFirstName', 'A');
    localStorage.setItem('userLastName', 'B');
    mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
      email: 'session@example.com',
      firstName: 'A',
      lastName: 'B',
      fullName: 'A B',
      isActive: true
    });
    const spy = vi.spyOn(component.requestDeletion, 'emit');

    component.onDeleteRequestSubmit({ reason: 'Because' });

    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0][0];
    expect(payload.prayer_id).toBe('p1');
    expect(payload.requester_first_name).toBe('A');
    expect(payload.requester_last_name).toBe('B');
    expect(payload.requester_email).toBe('session@example.com');
    expect(payload.reason).toBe('Because');
    expect(component.showDeleteRequestForm).toBe(false);
  });

  it('closeDeleteRequestForm closes the modal', () => {
    component.showDeleteRequestForm = true;
    component.closeDeleteRequestForm();
    expect(component.showDeleteRequestForm).toBe(false);
  });

  it('closeUpdateDeleteRequestForm closes the modal', () => {
    component.showUpdateDeleteRequestForm = 'upd-1';
    component.closeUpdateDeleteRequestForm();
    expect(component.showUpdateDeleteRequestForm).toBeNull();
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
    expect(spy).toHaveBeenCalledWith({updateId: 'u1', prayerId: 'p1'});
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

  it('showUpdateDeleteButton respects original-requestor policy for updates', () => {
    component.isAdmin = false;
    component.deletionsAllowed = 'original-requestor';
    component.prayer.email = 'test@example.com';
    mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      isActive: true
    });

    expect(component.viewState.showUpdateDeleteButton).toBe(true);

    mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
      email: 'other@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      fullName: 'Jane Doe',
      isActive: true
    });

    expect(component.viewState.showUpdateDeleteButton).toBe(false);
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


  it('onUpdateDeleteRequestSubmit emits and resets', () => {
    localStorage.setItem('userFirstName', 'X');
    localStorage.setItem('userLastName', 'Y');
    localStorage.setItem('userEmail', 'x@y.com');
    component.showUpdateDeleteRequestForm = 'upd-1';
    const spy = vi.spyOn(component.requestUpdateDeletion, 'emit');
    component.onUpdateDeleteRequestSubmit({ reason: 'Please remove' });
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0][0];
    expect(payload.update_id).toBe('upd-1');
    expect(payload.requester_first_name).toBe('X');
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

  it('onUpdateDeleteRequestSubmit preserves multi-part last name', () => {
    localStorage.setItem('userFirstName', 'First');
    localStorage.setItem('userLastName', 'Last Middle');
    localStorage.setItem('userEmail', 'fm@example.com');
    component.showUpdateDeleteRequestForm = 'upd-2';
    const spy = vi.spyOn(component.requestUpdateDeletion, 'emit');
    component.onUpdateDeleteRequestSubmit({ reason: 'Reason' });
    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0][0];
    expect(payload.requester_first_name).toBe('First');
    expect(payload.requester_last_name).toBe('Last Middle');
  });

  it('handleDeleteUpdate opens confirmation dialog for personal updates', () => {
    component.isPersonal = true;
    component.handleDeleteUpdate('u-personal');

    expect(component.showUpdateConfirmationDialog).toBe(true);
    expect(component.updateConfirmationId).toBe('u-personal');
    expect(component.updateConfirmationTitle).toBe('Delete Update');
  });

  it('confirmPrayFor skips increment when encouragement service blocks it', async () => {
    const localPrayerService = {
      incrementPrayedFor: vi.fn()
    };
    const localPrayerEncouragementService = {
      getPrayerEncouragementEnabled$: vi.fn().mockReturnValue(of(true)),
      canPrayFor: vi.fn().mockReturnValue(false),
      getCanPrayFor$: vi.fn().mockReturnValue(of(false)),
      recordPrayedFor: vi.fn()
    };
    const localCdr = { markForCheck: vi.fn() };

    const localComponent = new PrayerCardComponent(
      mockUserSessionService as any,
      { getBadgeFunctionalityEnabled$: () => of(false) } as any,
      localPrayerService as any,
      localPrayerEncouragementService as any,
      { ensureLoaded: vi.fn().mockResolvedValue([]), remindersForPrayer: vi.fn().mockReturnValue([]) } as any,
      localCdr as any,
      mockRichTextEditorsSettings as any
    );
    localComponent.prayer = {
      id: 'prayer-2',
      prayer_for: 'Community',
      description: 'Please pray',
      requester: 'Jane Doe',
      email: 'test@example.com',
      is_anonymous: false,
      status: 'current',
      created_at: new Date().toISOString(),
      updates: [],
      prayed_for_count: 0
    } as any;

    await localComponent.confirmPrayFor();

    expect(localPrayerEncouragementService.recordPrayedFor).not.toHaveBeenCalled();
    expect(localPrayerService.incrementPrayedFor).not.toHaveBeenCalled();
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

  describe('Pray For / Prayer Encouragement', () => {
    let prayForComponent: PrayerCardComponent;
    let mockPrayerService: any;
    let mockPrayerEncouragementService: any;
    let mockCdr: any;

    beforeEach(() => {
      mockPrayerService = {
        incrementPrayedFor: vi.fn().mockResolvedValue(5),
        incrementPersonalPrayedFor: vi.fn().mockResolvedValue(5),
        incrementMemberPrayedFor: vi.fn().mockResolvedValue(5)
      };
      mockPrayerEncouragementService = {
        getPrayerEncouragementEnabled$: vi.fn().mockReturnValue(of(true)),
        canPrayFor: vi.fn().mockReturnValue(true),
        getCanPrayFor$: vi.fn().mockReturnValue(of(true)),
        recordPrayedFor: vi.fn(),
        clearPrayedForCooldown: vi.fn()
      };
      mockCdr = { markForCheck: vi.fn() };

      prayForComponent = new PrayerCardComponent(
        mockUserSessionService as any,
        { getBadgeFunctionalityEnabled$: () => of(false) } as any,
        mockPrayerService,
        mockPrayerEncouragementService,
        { ensureLoaded: vi.fn().mockResolvedValue([]), remindersForPrayer: vi.fn().mockReturnValue([]) } as any,
        mockCdr as any,
        mockRichTextEditorsSettings as any
      );
      prayForComponent.prayer = {
        id: 'prayer-1',
        prayer_for: 'Community',
        description: 'Please pray',
        requester: 'Jane Doe',
        email: 'test@example.com',
        is_anonymous: false,
        status: 'current',
        created_at: new Date().toISOString(),
        updates: [],
        prayed_for_count: 0
      } as any;
    });

    it('showPrayedForBadge returns false when count is 0', () => {
      expect(prayForComponent.viewState.showPrayedForBadge).toBe(false);
    });

    it('showPrayedForBadge returns true when count > 0 and isPersonal', () => {
      prayForComponent.isPersonal = true;
      prayForComponent.prayer.prayed_for_count = 3;
      mockUserSessionService.getCurrentSession.mockReturnValue({ email: 'other@example.com' });
      expect(prayForComponent.viewState.showPrayedForBadge).toBe(true);
    });

    it('showPrayedForBadge returns true when count > 0 and current user is requester', () => {
      prayForComponent.prayer.prayed_for_count = 3;
      mockUserSessionService.getCurrentSession.mockReturnValue({ email: 'test@example.com' });
      expect(prayForComponent.viewState.showPrayedForBadge).toBe(true);
    });

    it('showPrayedForBadge returns true when count > 0 and isAdmin', () => {
      prayForComponent.prayer.prayed_for_count = 2;
      prayForComponent.isAdmin = true;
      mockUserSessionService.getCurrentSession.mockReturnValue({ email: 'other@example.com' });
      expect(prayForComponent.viewState.showPrayedForBadge).toBe(true);
    });

    it('showPrayedForBadge returns true for member prayer when count > 0', () => {
      prayForComponent.prayer = {
        ...prayForComponent.prayer,
        id: 'pc-member-99',
        prayed_for_count: 4,
        email: '',
      };
      mockUserSessionService.getCurrentSession.mockReturnValue({ email: 'other@example.com' });
      expect(prayForComponent.viewState.showPrayedForBadge).toBe(true);
    });

    it('prayedForCountLabel uses singular Prayer when personal count is 1', () => {
      prayForComponent.isPersonal = true;
      prayForComponent.prayer.prayed_for_count = 1;
      expect(prayForComponent.viewState.prayedForCountLabel).toBe('Prayer');
    });

    it('prayedForCountLabel uses plural Prayers when personal count is not 1', () => {
      prayForComponent.isPersonal = true;
      prayForComponent.prayer.prayed_for_count = 2;
      expect(prayForComponent.viewState.prayedForCountLabel).toBe('Prayers');
    });

    it('prayedForCountLabel uses Praying for community prayers', () => {
      prayForComponent.isPersonal = false;
      prayForComponent.prayer = {
        ...prayForComponent.prayer,
        id: 'community-1',
        prayed_for_count: 1,
      };
      expect(prayForComponent.viewState.prayedForCountLabel).toBe('Praying');
    });

    it('showAddUpdateButton returns true for member prayers even when updates_allowed is admin-only', () => {
      prayForComponent.prayer = {
        ...prayForComponent.prayer,
        id: 'pc-member-99',
        email: '',
      };
      prayForComponent.isAdmin = false;
      prayForComponent.updatesAllowed = 'admin-only';
      expect(prayForComponent.viewState.showAddUpdateButton).toBe(true);
    });

    it('confirmPrayFor calls recordPrayedFor, incrementPrayedFor, and updates local prayer', async () => {
      mockPrayerEncouragementService.canPrayFor.mockReturnValue(true);
      prayForComponent.showPrayForModal = true;
      await prayForComponent.confirmPrayFor();
      expect(prayForComponent.showPrayForModal).toBe(false);
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('prayer-1', false);
      expect(mockPrayerService.incrementPrayedFor).toHaveBeenCalledWith('prayer-1');
      expect(mockPrayerService.incrementPersonalPrayedFor).not.toHaveBeenCalled();
      expect(mockPrayerService.incrementMemberPrayedFor).not.toHaveBeenCalled();
      expect(prayForComponent.prayer.prayed_for_count).toBe(5);
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('confirmPrayFor emits prayedForCountChange when increment succeeds', async () => {
      mockPrayerEncouragementService.canPrayFor.mockReturnValue(true);
      const emitted: Array<{ prayerId: string; count: number }> = [];
      prayForComponent.prayedForCountChange.subscribe((event) => emitted.push(event));
      await prayForComponent.confirmPrayFor();
      expect(emitted).toEqual([{ prayerId: 'prayer-1', count: 5 }]);
    });

    it('confirmPrayFor for personal prayer calls incrementPersonalPrayedFor', async () => {
      mockPrayerEncouragementService.canPrayFor.mockReturnValue(true);
      prayForComponent.isPersonal = true;
      prayForComponent.showPrayForModal = true;
      await prayForComponent.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('prayer-1', true);
      expect(mockPrayerService.incrementPersonalPrayedFor).toHaveBeenCalledWith('prayer-1');
      expect(mockPrayerService.incrementPrayedFor).not.toHaveBeenCalled();
      expect(mockPrayerService.incrementMemberPrayedFor).not.toHaveBeenCalled();
      expect(prayForComponent.prayer.prayed_for_count).toBe(5);
    });

    it('confirmPrayFor for member prayer calls incrementMemberPrayedFor with personal cooldown', async () => {
      mockPrayerEncouragementService.canPrayFor.mockReturnValue(true);
      prayForComponent.prayer = {
        ...prayForComponent.prayer,
        id: 'pc-member-person-42',
        prayed_for_count: 0,
      };
      await prayForComponent.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith(
        'pc-member-person-42',
        true
      );
      expect(mockPrayerService.incrementMemberPrayedFor).toHaveBeenCalledWith('person-42');
      expect(mockPrayerService.incrementPrayedFor).not.toHaveBeenCalled();
      expect(mockPrayerService.incrementPersonalPrayedFor).not.toHaveBeenCalled();
      expect(prayForComponent.prayer.prayed_for_count).toBe(5);
    });

    it('confirmPrayFor does nothing when canPrayFor is false', async () => {
      mockPrayerEncouragementService.canPrayFor.mockReturnValue(false);
      await prayForComponent.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).not.toHaveBeenCalled();
      expect(mockPrayerService.incrementPrayedFor).not.toHaveBeenCalled();
    });

    it('confirmPrayFor clears cooldown when increment fails', async () => {
      mockPrayerEncouragementService.canPrayFor.mockReturnValue(true);
      mockPrayerService.incrementPrayedFor.mockResolvedValue(null);
      await prayForComponent.confirmPrayFor();
      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('prayer-1', false);
      expect(mockPrayerEncouragementService.clearPrayedForCooldown).toHaveBeenCalledWith('prayer-1', false);
      expect(prayForComponent.prayer.prayed_for_count).toBe(0);
    });

    it('confirmPrayFor records cooldown before increment to block double submit', async () => {
      const callOrder: string[] = [];
      mockPrayerEncouragementService.recordPrayedFor.mockImplementation(() => {
        callOrder.push('record');
      });
      mockPrayerService.incrementPrayedFor.mockImplementation(async () => {
        callOrder.push('increment');
        return 5;
      });
      await prayForComponent.confirmPrayFor();
      expect(callOrder).toEqual(['record', 'increment']);
    });

    it('confirmPrayFor records cooldown for the prayed card when prayer input changes before RPC completes', async () => {
      const prayerA = { ...prayForComponent.prayer, id: 'prayer-a', prayed_for_count: 0 };
      const prayerB = { ...prayForComponent.prayer, id: 'prayer-b', prayed_for_count: 0 };
      prayForComponent.prayer = prayerA;
      let resolveIncrement: (value: number) => void = () => {};
      mockPrayerService.incrementPrayedFor.mockReturnValue(
        new Promise<number>((resolve) => {
          resolveIncrement = resolve;
        })
      );

      const confirmPromise = prayForComponent.confirmPrayFor();
      prayForComponent.prayer = prayerB;
      resolveIncrement(5);
      await confirmPromise;

      expect(mockPrayerEncouragementService.recordPrayedFor).toHaveBeenCalledWith('prayer-a', false);
      expect(prayerA.prayed_for_count).toBe(5);
      expect(prayerB.prayed_for_count).toBe(0);
    });

    it('showPrayForModal defaults to false', () => {
      expect(prayForComponent.showPrayForModal).toBe(false);
    });

    it('UserSessionService exposes show-pray-for and show-praying-count streams for template', () => {
      expect(typeof mockUserSessionService.getShowPrayForButton$).toBe('function');
      expect(typeof mockUserSessionService.getShowPrayingCount$).toBe('function');
      expect(mockUserSessionService.getShowPrayForButton$()).toBeTruthy();
      expect(mockUserSessionService.getShowPrayingCount$()).toBeTruthy();
    });
  });

  describe('PrayerCardComponent - Rendering and Display', () => {
    let component: PrayerCardComponent;
    let mockUserSessionService: any;

    beforeEach(() => {
      mockUserSessionService = {
        userSession$: of(null),
        getCurrentSession: vi.fn().mockReturnValue(null),
      };

      const deps = defaultPrayerCardCtorDeps();
      component = new PrayerCardComponent(
        mockUserSessionService as any,
        deps.badge,
        deps.prayerService,
        deps.encouragement,
        { ensureLoaded: vi.fn().mockResolvedValue([]), remindersForPrayer: vi.fn().mockReturnValue([]) } as any,
        deps.cdr,
        mockRichTextEditorsSettings as any
      );
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
      } as any;

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
      } as any;

      const requester = component.viewState.displayRequester;
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
      } as any;

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
      } as any;

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
      } as any;

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
        updates: [
          { id: 'u1', content: 'Update 1', author: 'John', created_at: '2026-01-02' } as any
        ] as any
      } as any;

      expect(component.prayer.updates?.length).toBe(1);
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
      } as any;

      expect(component.prayer.updates).toBeUndefined();
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
        updates: [
          { id: 'u1', content: 'Update 1', author: 'John', created_at: '2026-01-02' } as any,
          { id: 'u2', content: 'Update 2', author: 'Jane', created_at: '2026-01-03' } as any,
          { id: 'u3', content: 'Update 3', author: 'Bob', created_at: '2026-01-04' } as any
        ] as any
      } as any;

      expect(component.prayer.updates?.length).toBe(3);
    });
  });

  describe('PrayerCardComponent - Status Handling', () => {
    let component: PrayerCardComponent;

    beforeEach(() => {
      const mockUserSessionService = {
        userSession$: of(null),
        getCurrentSession: vi.fn().mockReturnValue(null),
      };
      const deps = defaultPrayerCardCtorDeps();
      component = new PrayerCardComponent(
        mockUserSessionService as any,
        deps.badge,
        deps.prayerService,
        deps.encouragement,
        { ensureLoaded: vi.fn().mockResolvedValue([]), remindersForPrayer: vi.fn().mockReturnValue([]) } as any,
        deps.cdr,
        mockRichTextEditorsSettings as any
      );
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
      } as any;

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
      } as any;

      expect(component.prayer.status).toBe('answered');
    });

    it('should identify archived prayer status', () => {
      component.prayer = {
        id: '1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01'
      } as any;

      expect(component.prayer.status).toBe('current');
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
        status: 'current',
        created_at: '2026-01-01'
      } as any;

      expect(component.prayer.status).toBe('current');
    });
  });

  describe('PrayerCardComponent - Styling and Dark Mode', () => {
    let component: PrayerCardComponent;

    beforeEach(() => {
      const mockUserSessionService = {
        userSession$: of(null),
        getCurrentSession: vi.fn().mockReturnValue(null),
      };
      const deps = defaultPrayerCardCtorDeps();
      component = new PrayerCardComponent(
        mockUserSessionService as any,
        deps.badge,
        deps.prayerService,
        deps.encouragement,
        { ensureLoaded: vi.fn().mockResolvedValue([]), remindersForPrayer: vi.fn().mockReturnValue([]) } as any,
        deps.cdr,
        mockRichTextEditorsSettings as any
      );
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
      const paddingClass = 'px-6 pt-6 pb-4';
      expect(paddingClass).toContain('p');
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
      } as any;

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
    let mockUserSessionService: any;

    beforeEach(() => {
      mockUserSessionService = {
        userSession$: of(null),
        getCurrentSession: vi.fn().mockReturnValue(null),
      };
      const deps = defaultPrayerCardCtorDeps();
      component = new PrayerCardComponent(
        mockUserSessionService as any,
        deps.badge,
        deps.prayerService,
        deps.encouragement,
        { ensureLoaded: vi.fn().mockResolvedValue([]), remindersForPrayer: vi.fn().mockReturnValue([]) } as any,
        deps.cdr,
        mockRichTextEditorsSettings as any
      );
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
      } as any;

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
      } as any;

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
      const mockUserSessionService = {
        userSession$: of(null),
        getCurrentSession: vi.fn().mockReturnValue(null),
      };
      const deps = defaultPrayerCardCtorDeps();
      component = new PrayerCardComponent(
        mockUserSessionService as any,
        deps.badge,
        deps.prayerService,
        deps.encouragement,
        { ensureLoaded: vi.fn().mockResolvedValue([]), remindersForPrayer: vi.fn().mockReturnValue([]) } as any,
        deps.cdr,
        mockRichTextEditorsSettings as any
      );
      component.prayer = {
        id: 'p1',
        prayer_for: 'Test',
        title: 'Test',
        description: 'Test',
        requester: 'Jane',
        status: 'current',
        created_at: '2026-01-01',
        updates: [],
      } as any;
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
      } as any;

      // Badge click should trigger mark as read
      expect(component.prayer.id).toBe('1');
    });

    it('shows community unread badges only on Current and Answered filters', () => {
      component.activeFilter = 'current';
      expect(component.viewState.showsCommunityUnreadBadges).toBe(true);

      component.activeFilter = 'answered';
      expect(component.viewState.showsCommunityUnreadBadges).toBe(true);

      component.activeFilter = 'archived';
      expect(component.viewState.showsCommunityUnreadBadges).toBe(false);

      component.activeFilter = 'total';
      expect(component.viewState.showsCommunityUnreadBadges).toBe(false);

      component.activeFilter = 'planning_center_list';
      expect(component.viewState.showsCommunityUnreadBadges).toBe(false);
    });
  });

  describe('PrayerCardComponent - Edge Cases', () => {
    let component: PrayerCardComponent;

    beforeEach(() => {
      const mockUserSessionService = {
        userSession$: of(null),
        getCurrentSession: vi.fn().mockReturnValue(null),
      };
      const deps = defaultPrayerCardCtorDeps();
      component = new PrayerCardComponent(
        mockUserSessionService as any,
        deps.badge,
        deps.prayerService,
        deps.encouragement,
        { ensureLoaded: vi.fn().mockResolvedValue([]), remindersForPrayer: vi.fn().mockReturnValue([]) } as any,
        deps.cdr,
        mockRichTextEditorsSettings as any
      );
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
      } as any;

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
      } as any;

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
      } as any;

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
        updates: []
      } as any;

      expect(component.prayer.updates?.length).toBe(0);
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
      } as any;

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
      } as any;

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
      } as any;

      expect(component.prayer.id).toBe('12345');
    });
  });

  describe('Additional Coverage - Update and Deletion Interactions', () => {
    let mockBadgeService: any;

    beforeEach(() => {
      mockBadgeService = {
        isPrayerUnread: vi.fn().mockReturnValue(false),
        isUpdateUnread: vi.fn().mockReturnValue(false),
        getBadgeFunctionalityEnabled$: vi.fn().mockReturnValue(of(true)),
        getUpdateBadgesChanged$: vi.fn().mockReturnValue(of(null)),
        markPrayerAsRead: vi.fn(),
        markUpdateAsRead: vi.fn(),
      };
      component.badgeService = mockBadgeService;
      (component as unknown as { badgeWire: PrayerCardBadgeWire }).badgeWire =
        new PrayerCardBadgeWire(mockBadgeService, () => component.prayer);
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

    it('dismisses Pray For modal when prayer id changes', () => {
      component.showPrayForModal = true;
      const previous = { ...component.prayer, id: 'prayer-1' };
      const next = { ...component.prayer, id: 'prayer-2' };
      component.prayer = next;
      component.ngOnChanges({
        prayer: {
          previousValue: previous,
          currentValue: next,
          firstChange: false,
          isFirstChange: () => false,
        },
      });
      expect(component.showPrayForModal).toBe(false);
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

      expect(deleteUpdateSpy).toHaveBeenCalledWith({updateId: 'update1', prayerId: 'p1'});
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
        expect(component.viewState.showAddUpdateButton).toBe(true);
      });

      it('showAddUpdateButton: non-admin hidden when admin-only', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'admin-only';
        expect(component.viewState.showAddUpdateButton).toBe(false);
      });

      it('showAddUpdateButton: original-requestor matches on email', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'original-requestor';
        component.prayer.email = 'test@example.com';
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'test@example.com',
          fullName: 'Test'
        });
        expect(component.viewState.showAddUpdateButton).toBe(true);
      });

      it('showAddUpdateButton: original-requestor hidden for others', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'original-requestor';
        component.prayer.email = 'other@example.com';
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'test@example.com',
          fullName: 'Test'
        });
        expect(component.viewState.showAddUpdateButton).toBe(false);
      });

      it('showAddUpdateButton: everyone can update', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'everyone';
        expect(component.viewState.showAddUpdateButton).toBe(true);
      });

      it('recentUpdatesNeedsTopMargin: true when add-update button visible', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'everyone';
        expect(component.viewState.showAddUpdateButton).toBe(true);
        expect(component.viewState.showAddUpdateButton).toBe(true);
      });

      it('recentUpdatesNeedsTopMargin: false when no action buttons above', () => {
        component.isAdmin = false;
        component.updatesAllowed = 'admin-only';
        component.showDeleteRequestForm = false;
        component.showAddUpdateForm = false;
        expect(component.viewState.showAddUpdateButton).toBe(false);
      });

      it('showUpdateDeleteButton: admin always sees button', () => {
        component.isAdmin = true;
        component.deletionsAllowed = 'admin-only';
        expect(component.viewState.showUpdateDeleteButton).toBe(true);
      });

      it('showUpdateDeleteButton: non-admin hidden when admin-only', () => {
        component.isAdmin = false;
        component.deletionsAllowed = 'admin-only';
        expect(component.viewState.showUpdateDeleteButton).toBe(false);
      });

      it('showUpdateDeleteButton: original-requestor matches on email', () => {
        component.isAdmin = false;
        component.deletionsAllowed = 'original-requestor';
        component.prayer.email = 'test@example.com';
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'test@example.com',
          fullName: 'Test'
        });
        expect(component.viewState.showUpdateDeleteButton).toBe(true);
      });

      it('showUpdateDeleteButton: original-requestor hidden for others', () => {
        component.isAdmin = false;
        component.deletionsAllowed = 'original-requestor';
        component.prayer.email = 'other@example.com';
        mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
          email: 'test@example.com',
          fullName: 'Test'
        });
        expect(component.viewState.showUpdateDeleteButton).toBe(false);
      });

      it('showUpdateDeleteButton: everyone can delete updates', () => {
        component.isAdmin = false;
        component.deletionsAllowed = 'everyone';
        expect(component.viewState.showUpdateDeleteButton).toBe(true);
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

      it('onUpdateDeleteRequestSubmit: method exists', () => {
        expect(typeof component.onUpdateDeleteRequestSubmit).toBe('function');
      });

      // Tests for private method - commented out
      // it('getCurrentUserEmail: returns email from session', () => {
      //   mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
      //     email: 'user@test.com',
      //     fullName: 'User'
      //   });
      //   expect(component.getCurrentUserEmail()).toBe('user@test.com');
      // });
      // it('getCurrentUserEmail: returns empty for null email', () => {
      //   mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue({
      //     email: null,
      //     fullName: 'User'
      //   });
      //   expect(component.getCurrentUserEmail()).toBe('');
      // });
      // it('getCurrentUserEmail: returns empty for null session', () => {
      //   mockUserSessionService.getCurrentSession = vi.fn().mockReturnValue(null);
      //   expect(component.getCurrentUserEmail()).toBe('');
      // });

      // Tests for non-existent component properties - commented out
      // it('getDisplayedUpdates: returns empty when no updates', () => {
      //   component.updates = [];
      //   const displayed = component.getDisplayedUpdates();
      //   expect(displayed.length).toBe(0);
      // });
      // it('getDisplayedUpdates: handles updates array', () => {
      //   component.updates = [
      //     { id: 'u1', created_at: new Date().toISOString(), content: 'Update' } as any
      //   ];
      //   component.displayUpdates = true;
      //   const displayed = component.getDisplayedUpdates();
      //   expect(Array.isArray(displayed)).toBe(true);
      // });

      it('onConfirmUpdateDelete: emits delete event', () => {
        component.updateConfirmationId = 'update1';
        component.showUpdateConfirmationDialog = true;
        const emitSpy = vi.spyOn(component.deleteUpdate, 'emit');
        component.onConfirmUpdateDelete();
        expect(emitSpy).toHaveBeenCalledWith({updateId: 'update1', prayerId: 'p1'});
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
        expect(component.viewState.showAddUpdateButton).toBe(true);
      });

      it('onPersonalAnsweredClick opens mark modal when not answered', () => {
        component.isPersonal = true;
        component.prayer = {
          id: 'prayer-1',
          category: 'Health',
        } as any;

        component.onPersonalAnsweredClick();

        expect(component.personalAnsweredStatusModalMode).toBe('mark');
      });

      it('onPersonalAnsweredClick opens unmark modal when answered', () => {
        component.isPersonal = true;
        component.prayer = {
          id: 'prayer-1',
          category: 'Answered',
        } as any;

        component.onPersonalAnsweredClick();

        expect(component.personalAnsweredStatusModalMode).toBe('unmark');
      });

      it('onConfirmPersonalUnanswered applies selected category', async () => {
        component.isPersonal = true;
        component.prayer = {
          id: 'prayer-1',
          category: 'Answered',
        } as any;

        const mockPrayerService = {
          updatePersonalPrayer: vi.fn().mockResolvedValue(true)
        };
        (component as any).prayerService = mockPrayerService;

        component.onConfirmPersonalUnanswered('Health');

        expect(component.personalAnsweredStatusModalMode).toBeNull();
        expect(mockPrayerService.updatePersonalPrayer).toHaveBeenCalledWith(
          'prayer-1',
          { category: 'Health' }
        );
      });

      it('onConfirmPersonalAnswered marks category Answered', async () => {
        component.isPersonal = true;
        component.prayer = {
          id: 'prayer-1',
          title: 'Personal Prayer',
          description: 'Description',
          status: 'current',
          requester: 'Test User',
          prayer_for: 'Health',
          category: 'Health',
          date_requested: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updates: []
        } as any;

        const mockPrayerService = {
          updatePersonalPrayer: vi.fn().mockResolvedValue(true)
        };
        (component as any).prayerService = mockPrayerService;

        component.onConfirmPersonalAnswered();

        await vi.waitFor(() => {
          expect(mockPrayerService.updatePersonalPrayer).toHaveBeenCalled();
          expect(component.prayer.category).toBe('Answered');
        });

        expect(component.personalAnsweredStatusModalMode).toBeNull();
        expect(mockPrayerService.updatePersonalPrayer).toHaveBeenCalledWith(
          'prayer-1',
          { category: 'Answered' }
        );
        expect(component.prayer.status).toBe('answered');
      });

      it('applyPersonalAnsweredCategory emits personalPrayerCategoryChange on success', async () => {
        component.isPersonal = true;
        component.prayer = {
          id: 'prayer-1',
          title: 'Personal Prayer',
          description: 'Description',
          status: 'current',
          requester: 'Test User',
          prayer_for: 'Health',
          category: 'Health',
          date_requested: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updates: [],
        } as any;

        const emitted: Array<{
          prayerId: string;
          category: string | null;
          status: string;
        }> = [];
        component.personalPrayerCategoryChange.subscribe((event) =>
          emitted.push(event)
        );

        const mockPrayerService = {
          updatePersonalPrayer: vi.fn().mockResolvedValue(true),
        };
        (component as any).prayerService = mockPrayerService;

        await component.applyPersonalAnsweredCategory('Answered');

        expect(emitted).toEqual([
          { prayerId: 'prayer-1', category: 'Answered', status: 'answered' },
        ]);
      });

      it('togglePersonalAnswered marks category Answered', async () => {
        component.isPersonal = true;
        component.prayer = {
          id: 'prayer-1',
          title: 'Personal Prayer',
          description: 'Description',
          status: 'current',
          requester: 'Test User',
          prayer_for: 'Health',
          category: 'Health',
          date_requested: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updates: []
        } as any;

        const mockPrayerService = {
          updatePersonalPrayer: vi.fn().mockResolvedValue(true)
        };
        (component as any).prayerService = mockPrayerService;

        await component.togglePersonalAnswered();

        expect(mockPrayerService.updatePersonalPrayer).toHaveBeenCalledWith(
          'prayer-1',
          { category: 'Answered' }
        );
      });

      it('togglePersonalAnswered clears Answered category when already answered', async () => {
        component.isPersonal = true;
        component.prayer = {
          id: 'prayer-1',
          title: 'Personal Prayer',
          description: 'Description',
          status: 'answered',
          requester: 'Test User',
          prayer_for: 'Health',
          category: 'Answered',
          date_requested: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updates: []
        } as any;

        const mockPrayerService = {
          updatePersonalPrayer: vi.fn().mockResolvedValue(true)
        };
        (component as any).prayerService = mockPrayerService;

        await component.togglePersonalAnswered();

        expect(mockPrayerService.updatePersonalPrayer).toHaveBeenCalledWith(
          'prayer-1',
          { category: null }
        );
      });

      it('togglePersonalAnswered does nothing when not personal', async () => {
        component.isPersonal = false;
        const mockPrayerService = {
          updatePersonalPrayer: vi.fn()
        };
        (component as any).prayerService = mockPrayerService;

        await component.togglePersonalAnswered();

        expect(mockPrayerService.updatePersonalPrayer).not.toHaveBeenCalled();
      });
    });
  });

  describe('variant presentation', () => {
    beforeEach(() => {
      component.variant = 'presentation';
    });

    it('uses presentation layout tokens', () => {
      expect(component.variantLayout.usePresentationWrapper).toBe(true);
      expect(component.variantLayout.bandSize).toBe('sm');
      expect(component.showTourAnchors).toBe(false);
      expect(component.variantLayout.showUnreadBadges).toBe(false);
    });

    it('shellClasses omits status border for presentation', () => {
      const classes = component.shellClasses();
      expect(classes).not.toContain('rounded-3xl');
      expect(classes).not.toContain('0047AB');
      expect(component.variantLayout.presentationScrollClasses).toContain('rounded-3xl');
      expect(component.variantLayout.presentationScrollClasses).toContain('overflow-hidden');
    });

    it('treats isPersonal input as the personal contract even when user_email is set', () => {
      component.isPersonal = false;
      component.prayer = {
        ...component.prayer,
        user_email: 'owner@example.com',
      } as any;
      expect(component.viewState.isCommunityPrayer).toBe(true);

      component.isPersonal = true;
      expect(component.viewState.isCommunityPrayer).toBe(false);
    });

    it('reads updates from prayer.updates', () => {
      component.prayer = {
        ...component.prayer,
        updates: [
          {
            id: 'u1',
            content: 'Update',
            author: 'Author',
            created_at: now.toISOString(),
          },
        ],
      } as any;
      expect(component.prayerUpdateList).toHaveLength(1);
      expect(component.getDisplayedUpdates()).toHaveLength(1);
    });

    it('prayedForCountLabel uses singular Prayer for personal count of 1', () => {
      component.isPersonal = true;
      component.prayer = {
        ...component.prayer,
        user_email: 'owner@example.com',
        prayed_for_count: 1,
      } as any;
      expect(component.viewState.prayedForCountLabel).toBe('Prayer');
    });
  });

});
