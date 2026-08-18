import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { EmailSubscribersFacade } from './admin-email-subscribers-facade';
import { AdminEmailSubscribersDialogsComponent } from '../components/admin-email-subscribers-dialogs/admin-email-subscribers-dialogs.component';

const mockSubscriber = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  is_active: true,
  is_blocked: false,
  is_admin: false,
  created_at: '2024-01-15T10:30:00Z',
  last_activity_date: '2024-01-15T10:30:00Z',
  in_planning_center: false,
};

function createTestContext() {
  const markForCheck = vi.fn();
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };
  const mockAdminDataService = {
    sendSubscriberWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  };
  const mockCdr = {
    markForCheck: vi.fn(),
    detectChanges: vi.fn(),
  } as unknown as ChangeDetectorRef;

  const defaultTableMock = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      or: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }),
      order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  };

  const client = {
    from: vi.fn().mockReturnValue(defaultTableMock),
  };

  const facade = new EmailSubscribersFacade({
    supabase: { client } as never,
    toast: mockToast as never,
    adminDataService: mockAdminDataService as never,
    markForCheck,
  });

  const dialogs = new AdminEmailSubscribersDialogsComponent(mockCdr);
  (facade as { dialogsRef?: AdminEmailSubscribersDialogsComponent }).dialogsRef =
    dialogs;

  const panelRef = {
    resetAddForm: vi.fn(),
    resetCsvPanel: vi.fn(),
    showPlanningCenterTab: vi.fn(),
    runPlanningCenterSearchTourDemo: vi.fn().mockResolvedValue(undefined),
    selectTourPlanningCenterMatchFromDemoResults: vi.fn(),
    applyTourDemoPlanningCenterAdd: vi.fn(),
    clearTourDemoForm: vi.fn(),
  };
  (facade as { panelRef?: typeof panelRef }).panelRef = panelRef;

  return {
    facade,
    markForCheck,
    mockToast,
    mockAdminDataService,
    client,
    defaultTableMock,
    dialogs,
    panelRef,
  };
}

describe('EmailSubscribersFacade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default list state', () => {
    const { facade } = createTestContext();
    expect(facade.subscribers).toEqual([]);
    expect(facade.searchQuery).toBe('');
    expect(facade.currentPage).toBe(1);
    expect(facade.pageSize).toBe(10);
    expect(facade.allSubscribers).toEqual([]);
  });

  it('lazy-loads search on first section expand only', () => {
    const { facade } = createTestContext();
    const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue(undefined);

    facade.onSectionToggle();
    facade.onSectionToggle();
    facade.onSectionToggle();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(facade.sectionExpanded).toBe(true);
  });

  describe('pagination', () => {
    it('loads page slice and computes metadata', () => {
      const { facade } = createTestContext();
      facade.allSubscribers = Array.from({ length: 25 }, (_, i) => ({
        ...mockSubscriber,
        id: `sub-${i}`,
        email: `user${i}@example.com`,
      })) as never;
      facade.totalItems = 25;
      facade.pageSize = 10;
      facade.currentPage = 2;

      expect(facade.totalPages).toBe(3);
      facade.loadPageData();
      expect(facade.subscribers).toHaveLength(10);
      expect(facade.subscribers[0]?.id).toBe('sub-10');
    });

    it('navigates pages without crossing bounds', () => {
      const { facade } = createTestContext();
      facade.allSubscribers = Array.from({ length: 25 }, (_, i) => ({
        ...mockSubscriber,
        id: `sub-${i}`,
      })) as never;
      facade.totalItems = 25;
      facade.pageSize = 10;
      facade.currentPage = 1;

      facade.nextPage();
      expect(facade.currentPage).toBe(2);
      facade.previousPage();
      expect(facade.currentPage).toBe(1);
      facade.goToPage(99);
      expect(facade.currentPage).toBe(1);
    });

    it('computes pagination range near end of list', () => {
      const { facade } = createTestContext();
      facade.allSubscribers = Array.from({ length: 100 }, (_, i) => ({
        ...mockSubscriber,
        id: `sub-${i}`,
      })) as never;
      facade.totalItems = 100;
      facade.pageSize = 10;
      facade.currentPage = 10;
      facade.maxPaginationButtons = 5;

      const range = facade.paginationRange;
      expect(range.length).toBeLessThanOrEqual(5);
      expect(range[range.length - 1]).toBe(10);
    });
  });

  describe('handleSearch', () => {
    it('fetches subscribers successfully', async () => {
      const { facade, defaultTableMock } = createTestContext();
      defaultTableMock.select().order.mockResolvedValue({
        data: [mockSubscriber],
        error: null,
        count: 1,
      });

      await facade.handleSearch();

      expect(facade.allSubscribers).toEqual([mockSubscriber]);
      expect(facade.totalItems).toBe(1);
      expect(facade.hasSearched).toBe(true);
      expect(facade.searching).toBe(false);
    });

    it('searches with query string', async () => {
      const { facade } = createTestContext();
      facade.searchQuery = 'john@example.com';

      const queryWithOrMock = {
        or: vi.fn().mockResolvedValue({
          data: [mockSubscriber],
          error: null,
          count: 1,
        }),
      };
      const selectMock = {
        order: vi.fn().mockReturnValue(queryWithOrMock),
      };
      facade.supabase.client.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(selectMock),
      });

      await facade.handleSearch();

      expect(facade.hasSearched).toBe(true);
      expect(facade.currentPage).toBe(1);
      expect(queryWithOrMock.or).toHaveBeenCalled();
    });
  });

  describe('toggleAddForm and toggleCSVUpload', () => {
    it('toggles add form and hides CSV upload', () => {
      const { facade } = createTestContext();
      facade.showCSVUpload = true;
      facade.toggleAddForm();
      expect(facade.showAddForm).toBe(true);
      expect(facade.showCSVUpload).toBe(false);
    });

    it('resets add form when closing', () => {
      const { facade, panelRef } = createTestContext();
      facade.showAddForm = true;
      facade.toggleAddForm();
      expect(panelRef.resetAddForm).toHaveBeenCalled();
    });

    it('toggles CSV upload and hides add form', () => {
      const { facade } = createTestContext();
      facade.showAddForm = true;
      facade.toggleCSVUpload();
      expect(facade.showCSVUpload).toBe(true);
      expect(facade.showAddForm).toBe(false);
    });

    it('clears csvSuccess when toggling forms', () => {
      const { facade } = createTestContext();
      facade.csvSuccess = 'Imported';
      facade.toggleAddForm();
      expect(facade.csvSuccess).toBeNull();
      facade.csvSuccess = 'Imported';
      facade.toggleCSVUpload();
      expect(facade.csvSuccess).toBeNull();
    });
  });

  describe('list search debounce', () => {
    it('Enter runs search immediately', () => {
      const { facade } = createTestContext();
      const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue();
      const ev = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      facade.onListSearchKeydown(ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });

    it('clearListSearch resets query and reloads', () => {
      const { facade } = createTestContext();
      facade.searchQuery = 'test';
      const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue();
      facade.clearListSearch();
      expect(facade.searchQuery).toBe('');
      expect(spy).toHaveBeenCalled();
    });

    it('destroySearchDebouncer clears pending timers', () => {
      vi.useFakeTimers();
      const { facade } = createTestContext();
      const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue();
      facade.onListSearchQueryChange('ab');
      facade.destroySearchDebouncer();
      vi.advanceTimersByTime(500);
      expect(spy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('handleToggleActive', () => {
    it('opens confirmation and toggles active on confirm', async () => {
      const { facade, mockToast, client, dialogs } = createTestContext();
      facade.allSubscribers = [
        {
          ...mockSubscriber,
          email: 'test@example.com',
        },
      ] as never;

      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { email: 'test@example.com' },
            error: null,
          }),
        }),
      };
      client.from.mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await facade.handleToggleActive('123', true);

      expect(dialogs.showConfirmationDialog).toBe(true);
      expect(dialogs.confirmationTitle).toBe('Deactivate Subscriber');

      await facade.onConfirmationConfirmed({
        kind: 'toggleActive',
        id: '123',
        currentActive: true,
      });

      expect(mockToast.success).toHaveBeenCalled();
      expect(facade.allSubscribers[0]?.is_active).toBe(false);
    });
  });

  describe('handleToggleReceivePush', () => {
    it('opens confirmation and toggles receive_push on confirm', async () => {
      const { facade, mockToast, client, dialogs } = createTestContext();
      facade.allSubscribers = [
        {
          ...mockSubscriber,
          email: 'push@example.com',
          receive_push: true,
        },
      ] as never;

      client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { email: 'push@example.com' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await facade.handleToggleReceivePush('123', true);

      expect(dialogs.showConfirmationDialog).toBe(true);
      expect(dialogs.confirmationTitle).toBe('Disable push notifications');

      await facade.onConfirmationConfirmed({
        kind: 'toggleReceivePush',
        id: '123',
        currentReceivePush: true,
      });

      expect(mockToast.success).toHaveBeenCalled();
      expect(facade.allSubscribers[0]?.receive_push).toBe(false);
    });
  });

  describe('handleToggleBlocked', () => {
    it('shows unblock messaging when currently blocked', async () => {
      const { facade, client, dialogs } = createTestContext();
      client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { email: 'u@example.com' },
              error: null,
            }),
          }),
        }),
      });

      await facade.handleToggleBlocked('123', true);

      expect(dialogs.confirmationTitle).toBe('Unblock User');
      expect(dialogs.confirmationMessage).toContain('Unblock');
    });
  });

  describe('handleDelete', () => {
    it('deletes non-admin subscriber on confirmation', async () => {
      const { facade, mockToast, client } = createTestContext();
      facade.allSubscribers = [{ ...mockSubscriber, email: 'user@example.com' }] as never;
      facade.totalItems = 1;

      client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { is_admin: false },
              error: null,
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await facade.handleDelete('123', 'user@example.com');
      await facade.onConfirmationConfirmed({
        kind: 'delete',
        id: '123',
        email: 'user@example.com',
        isAdmin: false,
      });

      expect(mockToast.success).toHaveBeenCalled();
      expect(facade.allSubscribers).toHaveLength(0);
    });
  });

  describe('subscriber added and welcome email', () => {
    it('onSubscriberAdded opens welcome dialog', () => {
      const { facade, dialogs } = createTestContext();
      const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue();

      facade.onSubscriberAdded({
        email: 'new@example.com',
        successMessage: 'Added',
      });

      expect(facade.csvSuccess).toBe('Added');
      expect(facade.pendingSubscriberEmail).toBe('new@example.com');
      expect(dialogs.showSendWelcomeEmailDialog).toBe(true);
      expect(facade.showAddForm).toBe(false);
      expect(spy).toHaveBeenCalled();
    });

    it('onDeclineSendWelcomeEmail clears pending email', () => {
      const { facade, dialogs } = createTestContext();
      dialogs.openWelcomeEmailDialog();
      facade.showAddForm = true;
      facade.pendingSubscriberEmail = 'test@example.com';

      facade.onDeclineSendWelcomeEmail();

      expect(dialogs.showSendWelcomeEmailDialog).toBe(false);
      expect(facade.showAddForm).toBe(false);
      expect(facade.pendingSubscriberEmail).toBe('');
    });
  });

  describe('edit modal', () => {
    it('opens and closes edit subscriber modal', () => {
      const { facade } = createTestContext();
      const subscriber = { ...mockSubscriber, id: 'sub-1' } as never;

      facade.openEditSubscriberModal(subscriber);
      expect(facade.editSubscriber).toBe(subscriber);

      facade.closeEditSubscriberModal();
      expect(facade.editSubscriber).toBeNull();
    });

    it('onEditSaved patches name and reloads page', () => {
      const { facade } = createTestContext();
      facade.allSubscribers = [{ ...mockSubscriber, id: 'sub-1', name: 'Old' }] as never;
      facade.editSubscriber = facade.allSubscribers[0] as never;
      const loadSpy = vi.spyOn(facade, 'loadPageData').mockImplementation(() => {});

      facade.onEditSaved({ id: 'sub-1', name: 'New Name' });

      expect(facade.allSubscribers[0]?.name).toBe('New Name');
      expect(loadSpy).toHaveBeenCalled();
      expect(facade.editSubscriber).toBeNull();
    });
  });

  describe('toggleSort', () => {
    it('re-sorts list and resets to first page', () => {
      const { facade } = createTestContext();
      facade.allSubscribers = [
        { ...mockSubscriber, id: 'a', email: 'a@example.com' },
        { ...mockSubscriber, id: 'b', email: 'b@example.com' },
      ] as never;
      facade.currentPage = 2;

      facade.toggleSort('email');

      expect(facade.sortBy).toBe('email');
      expect(facade.sortDirection).toBe('asc');
      expect(facade.currentPage).toBe(1);
      expect(facade.allSubscribers[0]?.email).toBe('a@example.com');
    });
  });
});
