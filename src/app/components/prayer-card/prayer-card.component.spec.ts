import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrayerCardComponent } from './prayer-card.component';
import { SupabaseService } from '../../services/supabase.service';

describe('PrayerCardComponent', () => {
  let component: PrayerCardComponent;
  let mockSupabaseService: any;
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

    component = new PrayerCardComponent();
    component.supabase = mockSupabaseService;

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
    component.prayer.status = 'current';
    expect(component.getBorderClass()).toContain('0047AB');

    component.prayer.status = 'answered';
    expect(component.getBorderClass()).toContain('39704D');

    component.prayer.status = 'other';
    expect(component.getBorderClass()).toContain('C9A961');
  });

  it('getStatusBadgeClasses varies by status', () => {
    component.prayer.status = 'current';
    expect(component.getStatusBadgeClasses()).toContain('0047AB');

    component.prayer.status = 'answered';
    expect(component.getStatusBadgeClasses()).toContain('39704D');

    component.prayer.status = 'foo';
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

  it('handleDeleteClick as admin confirms or cancels', () => {
    component.isAdmin = true;
    const delSpy = vi.spyOn(component.delete, 'emit');
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    component.handleDeleteClick();
    expect(delSpy).toHaveBeenCalledWith('p1');

    (confirm as any).mockReturnValue(false);
    delSpy.mockClear();
    component.handleDeleteClick();
    expect(delSpy).not.toHaveBeenCalled();
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
    // prepare localStorage-backed user info
    localStorage.setItem('userFirstName', 'John');
    localStorage.setItem('userLastName', 'Smith');
    localStorage.setItem('userEmail', 'john@example.com');

    component.updateContent = 'An update';
    component.updateIsAnonymous = false;
    component.updateMarkAsAnswered = true;
    const spy = vi.spyOn(component.addUpdate, 'emit');

    await component.handleAddUpdate();

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls[0][0];
    expect(emitted.prayer_id).toBe('p1');
    expect(emitted.content).toBe('An update');
    expect(emitted.author).toBe('John Smith');
    expect(emitted.author_email).toBe('john@example.com');
    expect(component.updateContent).toBe('');
    expect(component.showAddUpdateForm).toBe(false);
  });

  it('getCurrentUserEmail prefers prayerapp_user_email when present', async () => {
    // set the legacy key used by some flows
    localStorage.setItem('prayerapp_user_email', 'legacy@example.com');
    component.updateContent = 'Legacy email update';
    const spy = vi.spyOn(component.addUpdate, 'emit');

    await component.handleAddUpdate();

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls[0][0];
    expect(emitted.author_email).toBe('legacy@example.com');
  });

  it('getCurrentUserEmail returns empty string when no keys present', async () => {
    // ensure no keys exist at all
    localStorage.clear();
    component.updateContent = 'No email update';
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

  it('getCurrentUserEmail prefers approvalAdminEmail when present', async () => {
    localStorage.setItem('approvalAdminEmail', 'approval@example.com');
    component.updateContent = 'Approval email update';
    const spy = vi.spyOn(component.addUpdate, 'emit');

    await component.handleAddUpdate();

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls[0][0];
    expect(emitted.author_email).toBe('approval@example.com');
  });

  it('handleUpdateDeletionRequest early returns when no form shown', () => {
    component.showUpdateDeleteRequestForm = null;
    const spy = vi.spyOn(component.requestUpdateDeletion, 'emit');
    component.handleUpdateDeletionRequest();
    expect(spy).not.toHaveBeenCalled();
  });

  it('handleDeleteRequest emits and resets', () => {
    localStorage.setItem('userFirstName', 'A');
    localStorage.setItem('userLastName', 'B');
    localStorage.setItem('userEmail', 'a@b.com');
    component.deleteReason = 'Because';
    const spy = vi.spyOn(component.requestDeletion, 'emit');

    component.handleDeleteRequest();

    expect(spy).toHaveBeenCalled();
    const payload = spy.mock.calls[0][0];
    expect(payload.prayer_id).toBe('p1');
    expect(payload.requester_first_name).toBe('A');
    expect(payload.requester_last_name).toBe('B');
    expect(payload.requester_email).toBe('a@b.com');
    expect(payload.reason).toBe('Because');
    expect(component.deleteReason).toBe('');
    expect(component.showDeleteRequestForm).toBe(false);
  });

  it('handleDeleteUpdate as admin uses confirm', () => {
    component.isAdmin = true;
    const spy = vi.spyOn(component.deleteUpdate, 'emit');
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    component.handleDeleteUpdate('u1');
    expect(spy).toHaveBeenCalledWith('u1');
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

  describe('fetchUserNameFromDatabase', () => {
    it('should fetch user name from database successfully', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: { name: 'Jane Smith' },
        error: null
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      const result = await (component as any).fetchUserNameFromDatabase('test@example.com');

      expect(result).toBe('Jane Smith');
    });

    it('should trim and lowercase email when querying database', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: { name: 'Jane Smith' },
        error: null
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      const fromFn = vi.fn().mockReturnValue({
        select: selectFn
      });

      mockSupabaseService.client.from = fromFn;

      await (component as any).fetchUserNameFromDatabase('  TEST@EXAMPLE.COM  ');

      expect(eqFn).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('should fallback to localStorage when database returns no data', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.setItem('userFirstName', 'John');
      localStorage.setItem('userLastName', 'Doe');

      const result = await (component as any).fetchUserNameFromDatabase('test@example.com');

      expect(result).toBe('John Doe');
    });

    it('should fallback to localStorage when database has error', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.setItem('userFirstName', 'John');
      localStorage.setItem('userLastName', 'Doe');

      const result = await (component as any).fetchUserNameFromDatabase('test@example.com');

      expect(result).toBe('John Doe');
    });

    it('should handle database query exception and fallback to localStorage', async () => {
      const maybeSingleFn = vi.fn().mockRejectedValue(new Error('Network error'));

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.setItem('userFirstName', 'John');
      localStorage.setItem('userLastName', 'Doe');

      const result = await (component as any).fetchUserNameFromDatabase('test@example.com');

      expect(result).toBe('John Doe');
    });

    it('should return empty string when no database data and no localStorage', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.removeItem('userFirstName');
      localStorage.removeItem('userLastName');

      const result = await (component as any).fetchUserNameFromDatabase('test@example.com');

      expect(result).toBe('');
    });
  });

  describe('async handleAddUpdate with database name lookup', () => {
    it('should use database name for non-anonymous update', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: { name: 'Database User' },
        error: null
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.setItem('userEmail', 'user@example.com');

      component.updateContent = 'An update';
      component.updateIsAnonymous = false;
      component.updateMarkAsAnswered = false;

      const spy = vi.spyOn(component.addUpdate, 'emit');

      await component.handleAddUpdate();

      expect(spy).toHaveBeenCalled();
      const emitted = spy.mock.calls[0][0];
      expect(emitted.author).toBe('Database User');
      expect(emitted.prayer_id).toBe('p1');
      expect(emitted.content).toBe('An update');
    });

    it('should use Anonymous for anonymous update regardless of database', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: { name: 'Database User' },
        error: null
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.setItem('userEmail', 'user@example.com');

      component.updateContent = 'An anonymous update';
      component.updateIsAnonymous = true;
      component.updateMarkAsAnswered = false;

      const spy = vi.spyOn(component.addUpdate, 'emit');

      await component.handleAddUpdate();

      expect(spy).toHaveBeenCalled();
      const emitted = spy.mock.calls[0][0];
      expect(emitted.author).toBe('Anonymous');
      expect(emitted.is_anonymous).toBe(true);
    });

    it('should fallback to localStorage when database has no data', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.setItem('userEmail', 'user@example.com');
      localStorage.setItem('userFirstName', 'Local');
      localStorage.setItem('userLastName', 'User');

      component.updateContent = 'An update';
      component.updateIsAnonymous = false;

      const spy = vi.spyOn(component.addUpdate, 'emit');

      await component.handleAddUpdate();

      expect(spy).toHaveBeenCalled();
      const emitted = spy.mock.calls[0][0];
      expect(emitted.author).toBe('Local User');
    });

    it('should reset form after successful emission', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: { name: 'User' },
        error: null
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.setItem('userEmail', 'user@example.com');

      component.updateContent = 'Content';
      component.updateIsAnonymous = true;
      component.updateMarkAsAnswered = true;
      component.showAddUpdateForm = true;

      await component.handleAddUpdate();

      expect(component.updateContent).toBe('');
      expect(component.updateIsAnonymous).toBe(false);
      expect(component.updateMarkAsAnswered).toBe(false);
      expect(component.showAddUpdateForm).toBe(false);
    });

    it('should handle database error and use fallback', async () => {
      const maybeSingleFn = vi.fn().mockRejectedValue(new Error('Network error'));

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.setItem('userEmail', 'user@example.com');
      localStorage.setItem('userFirstName', 'Fallback');
      localStorage.setItem('userLastName', 'User');

      component.updateContent = 'An update';
      component.updateIsAnonymous = false;

      const spy = vi.spyOn(component.addUpdate, 'emit');

      await component.handleAddUpdate();

      expect(spy).toHaveBeenCalled();
      const emitted = spy.mock.calls[0][0];
      expect(emitted.author).toBe('Fallback User');
    });

    it('should pass all required data to emit', async () => {
      const maybeSingleFn = vi.fn().mockResolvedValue({
        data: { name: 'Test User' },
        error: null
      });

      const eqFn = vi.fn().mockReturnValue({
        maybeSingle: maybeSingleFn
      });

      const selectFn = vi.fn().mockReturnValue({
        eq: eqFn
      });

      mockSupabaseService.client.from = vi.fn().mockReturnValue({
        select: selectFn
      });

      localStorage.setItem('userEmail', 'user@example.com');

      component.updateContent = 'Test content';
      component.updateIsAnonymous = false;
      component.updateMarkAsAnswered = true;

      const spy = vi.spyOn(component.addUpdate, 'emit');

      await component.handleAddUpdate();

      expect(spy).toHaveBeenCalled();
      const emitted = spy.mock.calls[0][0];
      expect(emitted).toMatchObject({
        prayer_id: 'p1',
        content: 'Test content',
        author: 'Test User',
        author_email: 'user@example.com',
        is_anonymous: false,
        mark_as_answered: true
      });
    });
  });
});
