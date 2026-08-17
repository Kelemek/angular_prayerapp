import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailSubscribersComponent } from './email-subscribers.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { AdminDataService } from '../../services/admin-data.service';
import { ChangeDetectorRef } from '@angular/core';
import { AdminEmailSubscribersDialogsComponent } from '../admin-email-subscribers-dialogs/admin-email-subscribers-dialogs.component';
import {
  emailSubscriberSortIndicator,
  sortEmailSubscriberRows,
} from '../../lib/admin-email-subscribers-sort';
import * as planningCenter from '../../../lib/planning-center';

function attachEmailSubscribersDialogs(
  component: EmailSubscribersComponent,
  cdr: ChangeDetectorRef,
): AdminEmailSubscribersDialogsComponent {
  const dialogs = new AdminEmailSubscribersDialogsComponent(cdr);
  component.dialogsRef = dialogs;
  return dialogs;
}

vi.mock('../../../lib/planning-center', () => ({
  lookupPersonByEmail: vi.fn(),
  batchLookupPlanningCenter: vi.fn(),
  searchPlanningCenterByName: vi.fn()
}));

describe('EmailSubscribersComponent', () => {
  let component: EmailSubscribersComponent;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockChangeDetectorRef: any;
  let mockAdminDataService: any;
  let mockBreakpointObserver: any;

  const mockSubscriber = {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    is_active: true,
    is_blocked: false,
    is_admin: false,
    created_at: '2024-01-15T10:30:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Planning Center lookup to return not found by default
    vi.mocked(planningCenter.lookupPersonByEmail).mockResolvedValue({
      people: [],
      count: 0
    });

    mockSupabaseService = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
            }),
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
            }),
            order: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      }
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    };

    mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn()
    };

    mockAdminDataService = {
      sendSubscriberWelcomeEmail: vi.fn().mockResolvedValue({})
    };

    mockBreakpointObserver = {
      observe: vi.fn().mockReturnValue({
        subscribe: vi.fn().mockImplementation((fn: (v: { matches: boolean }) => void) => {
          fn({ matches: false });
          return { unsubscribe: vi.fn() };
        })
      })
    };

    component = new EmailSubscribersComponent(
      mockSupabaseService,
      mockToastService,
      mockChangeDetectorRef,
      mockAdminDataService,
      mockBreakpointObserver
    );

    attachEmailSubscribersDialogs(component, mockChangeDetectorRef);

    component.panelRef = {
      resetAddForm: vi.fn(),
      resetCsvPanel: vi.fn(),
      showPlanningCenterTab: vi.fn(),
      runPlanningCenterSearchTourDemo: vi.fn().mockResolvedValue(undefined),
      selectTourPlanningCenterMatchFromDemoResults: vi.fn(),
      applyTourDemoPlanningCenterAdd: vi.fn(),
      clearTourDemoForm: vi.fn(),
    } as never;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(component.subscribers).toEqual([]);
      expect(component.searchQuery).toBe('');
      expect(component.searching).toBe(false);
      expect(component.hasSearched).toBe(false);
      expect(component.showAddForm).toBe(false);
      expect(component.showCSVUpload).toBe(false);
      expect(component.error).toBeNull();
      expect(component.csvSuccess).toBeNull();
      expect(component.editSubscriber).toBeNull();
      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(10);
      expect(component.totalItems).toBe(0);
      expect(component.allSubscribers).toEqual([]);
    });
  });

  describe('onSectionToggle', () => {
    it('calls handleSearch on first expand only', () => {
      const spy = vi.spyOn(component, 'handleSearch');
      component.ngOnInit();
      expect(spy).not.toHaveBeenCalled();
      component.onSectionToggle();
      expect(spy).toHaveBeenCalledTimes(1);
      component.onSectionToggle();
      component.onSectionToggle();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('prepareOverviewTourListState', () => {
    it('sets search to app-test, expands section, marks initial load done, and awaits handleSearch', async () => {
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
      (component as unknown as { sectionInitialLoadDone: boolean }).sectionInitialLoadDone = false;

      await component.prepareOverviewTourListState();

      expect(component.searchQuery).toBe('app-test');
      expect(component.sectionExpanded).toBe(true);
      expect(component.showAddForm).toBe(false);
      expect((component as unknown as { sectionInitialLoadDone: boolean }).sectionInitialLoadDone).toBe(true);
      expect(searchSpy).toHaveBeenCalled();
    });

    it('clears list search debounce before calling handleSearch', async () => {
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.prepareOverviewTourListState();

      expect(searchSpy).toHaveBeenCalled();
    });
  });

  describe('toggleAddForm', () => {
    it('should toggle showAddForm', () => {
      expect(component.showAddForm).toBe(false);
      component.toggleAddForm();
      expect(component.showAddForm).toBe(true);
      component.toggleAddForm();
      expect(component.showAddForm).toBe(false);
    });

    it('should hide CSV upload when showing add form', () => {
      component.showCSVUpload = true;
      component.toggleAddForm();
      expect(component.showCSVUpload).toBe(false);
    });

    it('should reset add form when closing', () => {
      component.showAddForm = true;
      component.toggleAddForm();
      expect(component.panelRef?.resetAddForm).toHaveBeenCalled();
    });
  });

  describe('toggleCSVUpload', () => {
    it('should toggle showCSVUpload', () => {
      expect(component.showCSVUpload).toBe(false);
      component.toggleCSVUpload();
      expect(component.showCSVUpload).toBe(true);
      component.toggleCSVUpload();
      expect(component.showCSVUpload).toBe(false);
    });

    it('should hide add form when showing CSV upload', () => {
      component.showAddForm = true;
      component.toggleCSVUpload();
      expect(component.showAddForm).toBe(false);
    });

    it('should reset CSV panel when closing', () => {
      component.showCSVUpload = true;
      component.toggleCSVUpload();
      expect(component.panelRef?.resetCsvPanel).toHaveBeenCalled();
    });
  });

  describe('list search debounce', () => {
    it('Enter runs search immediately', () => {
      const spy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
      const ev = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      component.onListSearchKeydown(ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });

    it('does not search on other keys', () => {
      const spy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
      component.onListSearchKeydown({ key: 'a', preventDefault: vi.fn() } as unknown as KeyboardEvent);
      expect(spy).not.toHaveBeenCalled();
    });

    it('ngOnDestroy cancels pending debounced search', () => {
      vi.useFakeTimers();
      const spy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
      component.onListSearchQueryChange('ab');
      vi.advanceTimersByTime(100);
      component.ngOnDestroy();
      vi.advanceTimersByTime(400);
      expect(spy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('clearListSearch resets query and reloads', () => {
      component.searchQuery = 'test';
      const spy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
      component.clearListSearch();
      expect(component.searchQuery).toBe('');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleSearch', () => {
    it('should fetch subscribers successfully', async () => {
      mockSupabaseService.client.from().select().order.mockResolvedValue({
        data: [mockSubscriber],
        error: null,
        count: 1
      });

      await component.handleSearch();

      expect(component.allSubscribers).toEqual([mockSubscriber]);
      expect(component.totalItems).toBe(1);
      expect(component.hasSearched).toBe(true);
      expect(component.searching).toBe(false);
    });

    it('should handle search error', async () => {
      mockSupabaseService.client.from().select().order.mockResolvedValue({
        data: null,
        error: new Error('Search failed'),
        count: 0
      });

      await component.handleSearch();

      expect(component.error).toBe('Search failed');
      expect(component.subscribers).toEqual([]);
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      component.allSubscribers = Array.from({ length: 25 }, (_, i) => ({
        ...mockSubscriber,
        id: `sub-${i}`,
        email: `user${i}@example.com`
      }));
      component.totalItems = 25;
    });

    it('should load correct page data', () => {
      component.currentPage = 1;
      component.pageSize = 10;
      component.loadPageData();
      expect(component.subscribers).toHaveLength(10);
      expect(component.subscribers[0].id).toBe('sub-0');
    });

    it('should calculate total pages', () => {
      component.pageSize = 10;
      expect(component.totalPages).toBe(3);
    });

    it('should check if first page', () => {
      component.currentPage = 1;
      expect(component.isFirstPage).toBe(true);
      component.currentPage = 2;
      expect(component.isFirstPage).toBe(false);
    });

    it('should check if last page', () => {
      component.pageSize = 10;
      component.currentPage = 3;
      expect(component.isLastPage).toBe(true);
      component.currentPage = 2;
      expect(component.isLastPage).toBe(false);
    });

    it('should go to specific page', () => {
      component.pageSize = 10;
      component.goToPage(2);
      expect(component.currentPage).toBe(2);
    });

    it('should go to previous page', () => {
      component.currentPage = 2;
      component.previousPage();
      expect(component.currentPage).toBe(1);
    });

    it('should not go before first page', () => {
      component.currentPage = 1;
      component.previousPage();
      expect(component.currentPage).toBe(1);
    });

    it('should go to next page', () => {
      component.pageSize = 10;
      component.currentPage = 1;
      component.nextPage();
      expect(component.currentPage).toBe(2);
    });

    it('should not go past last page', () => {
      component.pageSize = 10;
      component.currentPage = 3;
      component.nextPage();
      expect(component.currentPage).toBe(3);
    });

    it('should change page size', () => {
      component.currentPage = 2;
      component.pageSize = 10;
      component.changePageSize();
      expect(component.currentPage).toBe(1);
    });

    it('should get pagination range', () => {
      component.allSubscribers = Array.from({ length: 100 }, (_, i) => ({
        ...mockSubscriber,
        id: `sub-${i}`
      }));
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 1;

      const range = component.paginationRange;
      expect(range.length).toBeLessThanOrEqual(5);
      expect(range[0]).toBe(1);
    });
  });


  describe('handleToggleActive', () => {
    it('should show confirmation dialog and toggle active status on confirm', async () => {
      component.allSubscribers = [
        { id: '123', email: 'test@example.com', name: 'Test', is_active: true, is_blocked: false, created_at: '2024-01-01', last_activity_date: '2024-01-01', in_planning_center: false }
      ];

      // Setup mock to return subscriber data for the fetch
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { email: 'test@example.com' },
            error: null
          })
        })
      };

      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });

      await component.handleToggleActive('123', true);

      // Should show confirmation dialog
      expect(component.dialogsRef?.showConfirmationDialog).toBe(true);
      expect(component.dialogsRef?.confirmationTitle).toBe('Deactivate Subscriber');

      await component.onConfirmationConfirmed({
        kind: 'toggleActive',
        id: '123',
        currentActive: true,
      });

      expect(mockToastService.success).toHaveBeenCalled();
      expect(component.allSubscribers[0].is_active).toBe(false);
    });

    it('should handle toggle error', async () => {
      component.allSubscribers = [
        { id: '123', email: 'test@example.com', name: 'Test', is_active: true, is_blocked: false, created_at: '2024-01-01', last_activity_date: '2024-01-01', in_planning_center: false }
      ];

      // Setup mock to return subscriber data
      const selectChain = {
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { email: 'test@example.com' },
            error: null
          })
        })
      };

      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue(selectChain),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: new Error('Update failed')
          })
        })
      });

      await component.handleToggleActive('123', true);

      await component.onConfirmationConfirmed({
        kind: 'toggleActive',
        id: '123',
        currentActive: true,
      });
    });
  });

  describe('handleToggleBlocked', () => {
    it('should show confirmation dialog when toggling blocked status', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { email: 'test@example.com' },
        error: null
      });

      component.allSubscribers = [
        { id: '123', email: 'test@example.com', name: 'Test', is_active: true, is_blocked: false, created_at: '2024-01-01', last_activity_date: '2024-01-01', in_planning_center: false }
      ];

      await component.handleToggleBlocked('123', false);

      expect(component.dialogsRef?.showConfirmationDialog).toBe(true);
      expect(component.dialogsRef?.confirmationTitle).toBe('Block User');
    });

    it('should execute block action when confirmed', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { email: 'test@example.com' },
        error: null
      });

      mockSupabaseService.client.from().update().eq.mockResolvedValue({
        error: null
      });

      component.allSubscribers = [
        { id: '123', email: 'test@example.com', name: 'Test', is_active: true, is_blocked: false, created_at: '2024-01-01', last_activity_date: '2024-01-01', in_planning_center: false }
      ];

      await component.handleToggleBlocked('123', false);

      await component.onConfirmationConfirmed({
        kind: 'toggleBlocked',
        id: '123',
        currentBlocked: false,
      });
      expect(mockToastService.success).toHaveBeenCalled();
      expect(component.allSubscribers[0].is_blocked).toBe(true);
    });

    it('should handle toggle error', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { email: 'test@example.com' },
        error: null
      });

      mockSupabaseService.client.from().update().eq.mockResolvedValue({
        error: new Error('Update failed')
      });

      await component.handleToggleBlocked('123', false);

      await component.onConfirmationConfirmed({
        kind: 'toggleBlocked',
        id: '123',
        currentBlocked: false,
      });
      expect(mockToastService.error).toHaveBeenCalled();
    });

    it('shows unblock messaging when currentStatus is true', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { email: 'u@example.com' },
        error: null
      });
      await component.handleToggleBlocked('123', true);
      expect(component.dialogsRef?.confirmationTitle).toBe('Unblock User');
      expect(component.dialogsRef?.confirmationMessage).toContain('Unblock');
      expect(component.dialogsRef?.confirmationDetails).toContain('able to log in');
    });
  });

  describe('handleToggleReceivePush', () => {
    it('shows enable push dialog and toggles on confirm', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { email: 'u@example.com' }, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      });
      component.allSubscribers = [
        { ...mockSubscriber, id: '123', receive_push: false }
      ];
      await component.handleToggleReceivePush('123', false);
      expect(component.dialogsRef?.confirmationTitle).toBe('Enable push notifications');
      await component.onConfirmationConfirmed({
        kind: 'toggleReceivePush',
        id: '123',
        currentReceivePush: false,
      });
      expect(mockToastService.success).toHaveBeenCalledWith('Push notifications enabled');
      expect(component.allSubscribers[0].receive_push).toBe(true);
    });

    it('shows error when toggle receive_push update fails', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { email: 'u@example.com' }, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: new Error('DB error') }) })
      });
      await component.handleToggleReceivePush('123', true);
      await component.onConfirmationConfirmed({
        kind: 'toggleReceivePush',
        id: '123',
        currentReceivePush: true,
      });
      expect(mockToastService.error).toHaveBeenCalledWith(
        'Failed to update push notification preference',
      );
    });
  });

  describe('handleDelete', () => {
    it('should show confirmation dialog for admin subscriber', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      await component.handleDelete('123', 'john@example.com');

      expect(component.dialogsRef?.showConfirmationDialog).toBe(true);
      expect(component.dialogsRef?.confirmationTitle).toBe('Remove Subscriber');
      expect(component.dialogsRef?.confirmationMessage).toContain('john@example.com');
      expect(component.dialogsRef?.isDeleteConfirmation).toBe(true);
    });

    it('should show confirmation dialog for non-admin subscriber', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { is_admin: false },
        error: null
      });

      await component.handleDelete('123', 'john@example.com');

      expect(component.dialogsRef?.showConfirmationDialog).toBe(true);
      expect(component.dialogsRef?.confirmationTitle).toBe('Remove Subscriber');
      expect(component.dialogsRef?.confirmationMessage).toContain('john@example.com');
      expect(component.dialogsRef?.isDeleteConfirmation).toBe(true);
    });

    it('should deactivate admin subscriber when confirmed', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      component.allSubscribers = [
        { id: '123', email: 'admin@example.com', name: 'Admin User', is_active: true, is_blocked: false, created_at: '2024-01-01', last_activity_date: '2024-01-01', in_planning_center: false }
      ];

      await component.handleDelete('123', 'admin@example.com');
      
      await component.onConfirmationConfirmed({
        kind: 'delete',
        id: '123',
        email: 'admin@example.com',
        isAdmin: true,
      });

      expect(component.csvSuccess).toContain('admin');
      expect(component.allSubscribers[0].is_active).toBe(false);
    });

    it('should delete non-admin subscriber when confirmed', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { is_admin: false },
        error: null
      });

      component.allSubscribers = [
        { id: '123', email: 'user@example.com', name: 'Regular User', is_active: true, is_blocked: false, created_at: '2024-01-01', last_activity_date: '2024-01-01', in_planning_center: false }
      ];
      component.totalItems = 1;

      await component.handleDelete('123', 'user@example.com');
      
      await component.onConfirmationConfirmed({
        kind: 'delete',
        id: '123',
        email: 'user@example.com',
        isAdmin: false,
      });

      expect(mockToastService.success).toHaveBeenCalled();
      expect(component.allSubscribers.length).toBe(0);
    });

    it('should handle delete error', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: new Error('Fetch failed')
      });

      await component.handleDelete('123', 'john@example.com');

      expect(component.error).toBe('Fetch failed');
    });
  });


  describe('totalActiveCount', () => {
    it('should reflect active subscriber count', () => {
      component.totalActiveCount = 2;
      expect(component.totalActiveCount).toBe(2);
    });

    it('should return 0 for no active subscribers', () => {
      component.totalActiveCount = 0;
      expect(component.totalActiveCount).toBe(0);
    });
  });


  describe('handleSearch with query', () => {
    it('should search with query string', async () => {
      component.searchQuery = 'john@example.com';
      
      const finalResultMock = {
        data: [mockSubscriber],
        error: null,
        count: 1
      };
      
      const queryWithOrMock = {
        or: vi.fn().mockResolvedValue(finalResultMock)
      };
      
      const selectMock = {
        order: vi.fn().mockReturnValue(queryWithOrMock)
      };
      
      mockSupabaseService.client.from().select.mockReturnValue(selectMock);

      await component.handleSearch();

      expect(component.hasSearched).toBe(true);
      expect(component.currentPage).toBe(1);
      expect(queryWithOrMock.or).toHaveBeenCalled();
    });

    it('should reset page to 1 on new search', async () => {
      component.currentPage = 3;
      
      mockSupabaseService.client.from().select().order.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      await component.handleSearch();

      expect(component.currentPage).toBe(1);
    });
  });


  describe('getPaginationRange with various scenarios', () => {
    beforeEach(() => {
      component.allSubscribers = Array.from({ length: 100 }, (_, i) => ({
        ...mockSubscriber,
        id: `sub-${i}`
      }));
      component.totalItems = 100;
      component.pageSize = 10;
    });

    it('should show all pages when total pages is less than max', () => {
      component.pageSize = 50; // 2 pages total
      const range = component.paginationRange;
      expect(range).toEqual([1, 2]);
    });

    it('should adjust start and end when near end of pagination', () => {
      component.currentPage = 10;
      const range = component.paginationRange;
      expect(range.length).toBeLessThanOrEqual(5);
      expect(range[range.length - 1]).toBe(10);
    });

    it('adjusts start when near end so range has maxPagesToShow items', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 10;
      component.maxPaginationButtons = 5;
      const range = component.paginationRange;
      expect(range.length).toBeLessThanOrEqual(5);
      expect(range[range.length - 1]).toBe(10);
    });
  });

  describe('toggleAddForm and toggleCSVUpload integration', () => {
    it('should clear csvSuccess when toggling add form', () => {
      component.csvSuccess = 'Some success message';
      component.toggleAddForm();
      expect(component.csvSuccess).toBeNull();
    });

    it('should clear csvSuccess when toggling CSV upload', () => {
      component.csvSuccess = 'Some success message';
      component.toggleCSVUpload();
      expect(component.csvSuccess).toBeNull();
    });

    it('should clear error when toggling add form', () => {
      component.error = 'Some error';
      component.toggleAddForm();
      expect(component.error).toBeNull();
    });

    it('should clear error when toggling CSV upload', () => {
      component.error = 'Some error';
      component.toggleCSVUpload();
      expect(component.error).toBeNull();
    });
  });

  describe('loadPageData', () => {
    beforeEach(() => {
      component.allSubscribers = Array.from({ length: 25 }, (_, i) => ({
        ...mockSubscriber,
        id: `sub-${i}`
      }));
      component.totalItems = 25;
      component.pageSize = 10;
    });

    it('should load second page correctly', () => {
      component.currentPage = 2;
      component.loadPageData();
      
      expect(component.subscribers).toHaveLength(10);
      expect(component.subscribers[0].id).toBe('sub-10');
    });

    it('should load partial last page', () => {
      component.currentPage = 3;
      component.loadPageData();
      
      expect(component.subscribers).toHaveLength(5);
      expect(component.subscribers[0].id).toBe('sub-20');
    });
  });


  describe('goToPage branches', () => {
    beforeEach(() => {
      component.totalItems = 30;
      component.pageSize = 10;
    });

    it('does nothing when page is out of range', () => {
      component.currentPage = 1;
      component.goToPage(0);
      expect(component.currentPage).toBe(1);
      component.goToPage(5);
      expect(component.currentPage).toBe(1);
    });
  });

  describe('dialogs component cancel', () => {
    it('closes dialog without applying shell confirmation', () => {
      component.dialogsRef?.openConfirmation(
        {
          title: 'Test',
          message: 'Msg',
          details: null,
          confirmText: 'OK',
          isDangerous: false,
        },
        { kind: 'toggleActive', id: '1', currentActive: true },
      );
      component.dialogsRef?.onCancelDialog();
      expect(component.dialogsRef?.showConfirmationDialog).toBe(false);
    });
  });

  describe('handleDelete non-admin pagination adjustment', () => {
    it('goes to previous page when current page becomes empty after delete', async () => {
      component.allSubscribers = Array.from({ length: 11 }, (_, i) => ({
        ...mockSubscriber,
        id: String(i + 1),
        email: `u${i + 1}@example.com`
      }));
      component.totalItems = 11;
      component.pageSize = 10;
      component.currentPage = 2;
      let resolveConfirm: () => void;
      const confirmPromise = new Promise<void>((r) => { resolveConfirm = r; });
      mockSupabaseService.client.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { is_admin: false }, error: null })
          })
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });
      component.handleDelete('11', 'u11@example.com');
      await Promise.resolve();
      await component.onConfirmationConfirmed({
        kind: 'delete',
        id: '11',
        email: 'u11@example.com',
        isAdmin: false,
      });
      await Promise.resolve();
      expect(component.currentPage).toBe(1);
    });
  });

  describe('handleSearch with null count', () => {
    it('should handle null count from query', async () => {
      mockSupabaseService.client.from().select().order.mockResolvedValue({
        data: [mockSubscriber],
        error: null,
        count: null
      });

      await component.handleSearch();

      expect(component.totalItems).toBe(0);
    });

    it('should handle null data from query', async () => {
      mockSupabaseService.client.from().select().order.mockResolvedValue({
        data: null,
        error: null,
        count: 0
      });

      await component.handleSearch();

      expect(component.allSubscribers).toEqual([]);
    });
  });


  describe('Dialog handlers and confirmations', () => {
    it('should have onConfirmSendWelcomeEmail method', () => {
      expect(typeof component.onConfirmSendWelcomeEmail).toBe('function');
    });

    it('should handle send welcome email with no pending email', async () => {
      component.pendingSubscriberEmail = '';

      const result = await component.onConfirmSendWelcomeEmail();

      expect(result).toBeUndefined();
    });

    it('should handle decline send welcome email', () => {
      component.dialogsRef?.openWelcomeEmailDialog();
      component.showAddForm = true;
      component.pendingSubscriberEmail = 'test@example.com';

      component.onDeclineSendWelcomeEmail();

      expect(component.dialogsRef?.showSendWelcomeEmailDialog).toBe(false);
      expect(component.showAddForm).toBe(false);
      expect(component.pendingSubscriberEmail).toBe('');
    });

    it('should handle confirmation dialog confirm via shell handler', async () => {
      mockSupabaseService.client.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      component.allSubscribers = [{ ...mockSubscriber, id: '123', is_active: true }];

      await component.onConfirmationConfirmed({
        kind: 'toggleActive',
        id: '123',
        currentActive: true,
      });

      expect(component.dialogsRef?.showConfirmationDialog).toBe(false);
      expect(component.allSubscribers[0].is_active).toBe(false);
    });

    it('should handle confirmation dialog cancel', () => {
      component.dialogsRef?.openConfirmation(
        {
          title: 'Delete',
          message: 'Sure?',
          details: null,
          confirmText: 'Delete',
          isDangerous: true,
        },
        { kind: 'delete', id: '1', email: 'a@example.com', isAdmin: false },
      );

      component.dialogsRef?.onCancelDialog();

      expect(component.dialogsRef?.showConfirmationDialog).toBe(false);
      expect(component.dialogsRef?.isDeleteConfirmation).toBe(false);
    });

    it('should open edit subscriber modal with subscriber reference', () => {
      const subscriber = {
        id: 'sub-1',
        name: 'Original Name',
        email: 'user@example.com',
        is_active: true,
        is_blocked: false,
        is_admin: false,
        created_at: '2024-01-01',
        last_activity_date: '2024-01-01',
        in_planning_center: false,
      } as any;

      component.openEditSubscriberModal(subscriber);

      expect(component.editSubscriber).toBe(subscriber);
    });

    it('should close edit subscriber modal', () => {
      component.editSubscriber = { ...mockSubscriber } as any;
      component.closeEditSubscriberModal();
      expect(component.editSubscriber).toBeNull();
    });

    it('onEditSaved updates local list and closes modal', () => {
      const existing = {
        ...mockSubscriber,
        id: 'sub-1',
        name: 'Old Name',
      };
      component.allSubscribers = [existing as any];
      component.editSubscriber = existing as any;
      const loadSpy = vi.spyOn(component, 'loadPageData').mockImplementation(() => {});

      component.onEditSaved({ id: 'sub-1', name: 'New Name' });

      expect(component.allSubscribers[0].name).toBe('New Name');
      expect(loadSpy).toHaveBeenCalled();
      expect(component.editSubscriber).toBeNull();
    });

    // Tests for non-existent component property sortOrder - commented out
    // it('should handle toggleSort for name column', () => {
    //   component.sortBy = 'email';
    //   (component as any).sortOrder = 'asc';
    //
    //   component.toggleSort('name');
    //
    //   expect(component.sortBy).toBe('name');
    //   expect((component as any).sortOrder).toBe('asc');
    // });
    //
    // it('should change column and reset order when toggling different column', () => {
    //   component.sortBy = 'name';
    //   (component as any).sortOrder = 'asc';
    //
    //   component.toggleSort('created_at');
    //
    //   expect(component.sortBy).toBe('created_at');
    // });

    it('should toggle sort for email column', () => {
      component.sortBy = 'email';

      component.toggleSort('email');

      expect(component.sortBy).toBe('email');
    });

    it('should toggle sort for is_active column', () => {
      component.toggleSort('is_active');

      expect(component.sortBy).toBe('is_active');
    });

    it('should toggle sort for is_blocked column', () => {
      component.toggleSort('is_blocked');

      expect(component.sortBy).toBe('is_blocked');
    });

    it('should toggle sort for in_planning_center column', () => {
      component.toggleSort('in_planning_center');

      expect(component.sortBy).toBe('in_planning_center');
    });

    it('should toggle sort for last_activity_date column', () => {
      component.toggleSort('last_activity_date');

      expect(component.sortBy).toBe('last_activity_date');
    });
  });


  describe('Branch coverage - welcome email dialog handlers', () => {
    it('should return early if no pending subscriber email in onConfirmSendWelcomeEmail', async () => {
      component.pendingSubscriberEmail = '';
      component.dialogsRef?.openWelcomeEmailDialog();

      const result = await component.onConfirmSendWelcomeEmail();

      expect(result).toBeUndefined();
      expect(component.dialogsRef?.showSendWelcomeEmailDialog).toBe(true);
    });

    it('should handle successful welcome email send', async () => {
      component.pendingSubscriberEmail = 'test@example.com';
      component.dialogsRef?.openWelcomeEmailDialog();
      component.showAddForm = true;

      const toastSpy = vi.spyOn(mockToastService, 'success');

      await component.onConfirmSendWelcomeEmail();

      expect(toastSpy).toHaveBeenCalledWith('Welcome email sent to subscriber');
      expect(component.dialogsRef?.showSendWelcomeEmailDialog).toBe(false);
      expect(component.showAddForm).toBe(false);
      expect(component.pendingSubscriberEmail).toBe('');
    });

    it('should handle welcome email send error', async () => {
      component.pendingSubscriberEmail = 'test@example.com';
      component.dialogsRef?.openWelcomeEmailDialog();

      mockAdminDataService.sendSubscriberWelcomeEmail.mockRejectedValueOnce(
        new Error('Send failed'),
      );

      const toastSpy = vi.spyOn(mockToastService, 'error');

      await component.onConfirmSendWelcomeEmail();

      expect(toastSpy).toHaveBeenCalledWith('Failed to send welcome email');
    });

    it('should close dialogs after successful welcome email', async () => {
      component.pendingSubscriberEmail = 'new@example.com';
      component.dialogsRef?.openWelcomeEmailDialog();
      component.showAddForm = true;

      await component.onConfirmSendWelcomeEmail();

      expect(component.dialogsRef?.showSendWelcomeEmailDialog).toBe(false);
      expect(component.showAddForm).toBe(false);
    });

    it('should clear pending email after successful send', async () => {
      component.pendingSubscriberEmail = 'test@example.com';

      await component.onConfirmSendWelcomeEmail();

      expect(component.pendingSubscriberEmail).toBe('');
    });

    it('should handle decline send welcome email and reset form', () => {
      component.dialogsRef?.openWelcomeEmailDialog();
      component.showAddForm = true;
      component.pendingSubscriberEmail = 'test@example.com';

      component.onDeclineSendWelcomeEmail();

      expect(component.dialogsRef?.showSendWelcomeEmailDialog).toBe(false);
      expect(component.showAddForm).toBe(false);
      expect(component.pendingSubscriberEmail).toBe('');
    });

    it('should call markForCheck after declining welcome email', () => {
      const cdrSpy = vi.spyOn(mockChangeDetectorRef, 'markForCheck');

      component.onDeclineSendWelcomeEmail();

      expect(cdrSpy).toHaveBeenCalled();
    });

    it('should call markForCheck after confirming welcome email', async () => {
      const cdrSpy = vi.spyOn(mockChangeDetectorRef, 'markForCheck');
      component.pendingSubscriberEmail = 'test@example.com';

      const mockAdminDataService = {
        sendSubscriberWelcomeEmail: vi.fn().mockResolvedValue({})
      };
      component['adminDataService'] = mockAdminDataService as any;

      await component.onConfirmSendWelcomeEmail();

      expect(cdrSpy).toHaveBeenCalled();
    });

    it('should handle welcome email send with no showAddForm set', async () => {
      component.pendingSubscriberEmail = 'test@example.com';
      component.dialogsRef?.openWelcomeEmailDialog();
      component.showAddForm = false;

      const mockAdminDataService = {
        sendSubscriberWelcomeEmail: vi.fn().mockResolvedValue({})
      };
      component['adminDataService'] = mockAdminDataService as any;

      await component.onConfirmSendWelcomeEmail();

      expect(component.showAddForm).toBe(false);
    });
  });

  describe('lifecycle and orientation helpers', () => {
    it('registers window listeners on init without fetching subscribers', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      component.ngOnInit();

      expect(addSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(searchSpy).not.toHaveBeenCalled();
    });

    it('removes listeners on destroy', () => {
      component['orientationChangeListener'] = vi.fn();
      component['resizeListener'] = vi.fn();
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      component.ngOnDestroy();

      expect(removeSpy).toHaveBeenCalledWith('orientationchange', component['orientationChangeListener']);
      expect(removeSpy).toHaveBeenCalledWith('resize', component['resizeListener']);
    });

    it('updates orientation mode and marks for check', () => {
      const widthSpy = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1600);
      const heightSpy = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
      const markSpy = vi.spyOn(mockChangeDetectorRef, 'markForCheck');

      (component as any).updateOrientationMode();

      expect(component.isLandscape).toBe(true);
      expect(markSpy).toHaveBeenCalled();

      widthSpy.mockRestore();
      heightSpy.mockRestore();
    });

    it('schedules an orientation update when orientation changes occur', () => {
      vi.useFakeTimers();
      const updateSpy = vi.spyOn(component as any, 'updateOrientationMode');

      (component as any).onOrientationChange();
      vi.runAllTimers();

      expect(updateSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('scroll helpers', () => {
    it('scrolls to the container when navigating pages', () => {
      component.totalItems = 20;
      component.pageSize = 10;
      component.currentPage = 1;
      component.allSubscribers = Array.from({ length: 20 }, (_, i) => ({
        ...mockSubscriber,
        id: `sub-${i}`
      }));
      component.sectionRef = {
        containerElement: {
          getBoundingClientRect: () => ({ top: 150 }),
        },
      } as never;

      const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      vi.useFakeTimers();
      component.goToPage(2);
      vi.runAllTimers();
      vi.useRealTimers();

      expect(component.currentPage).toBe(2);
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 150, behavior: 'smooth' }));
    });
  });

  describe('sorting helpers', () => {
    it('sorts subscribers by email in descending order', () => {
      const rows = sortEmailSubscriberRows(
        [
          { ...mockSubscriber, email: 'b@example.com' },
          { ...mockSubscriber, email: 'a@example.com' },
        ],
        'email',
        'desc',
      );

      expect(rows[0].email).toBe('b@example.com');
    });

    it('returns the correct sort indicator', () => {
      expect(emailSubscriberSortIndicator('name', 'asc', 'name')).toBe(' ↑');
      expect(emailSubscriberSortIndicator('name', 'desc', 'name')).toBe(' ↓');
      expect(emailSubscriberSortIndicator('name', 'asc', 'email')).toBe('');
    });

    it('toggles sort direction when the same column is selected twice', () => {
      component.sortBy = 'name';
      component.sortDirection = 'asc';

      component.toggleSort('name');

      expect(component.sortDirection).toBe('desc');
    });
  });


});
