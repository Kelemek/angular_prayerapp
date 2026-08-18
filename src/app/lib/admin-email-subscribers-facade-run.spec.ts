import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyEmailSubscriberFacadeSearchFailure,
  finishEmailSubscriberFacadeConfirmationApply,
  runEmailSubscriberFacadeConfirmation,
  runEmailSubscriberFacadeSearch,
} from './admin-email-subscribers-facade-run';

describe('applyEmailSubscriberFacadeSearchFailure', () => {
  it('sets error state and clears list totals', () => {
    const host = {
      error: null,
      sectionExpanded: false,
      subscribers: [{ id: '1' }] as never[],
      totalItems: 5,
      totalActiveCount: 3,
    };

    applyEmailSubscriberFacadeSearchFailure(host, 'Search failed');

    expect(host.error).toBe('Search failed');
    expect(host.sectionExpanded).toBe(true);
    expect(host.subscribers).toEqual([]);
    expect(host.totalItems).toBe(0);
    expect(host.totalActiveCount).toBe(0);
  });
});

describe('runEmailSubscriberFacadeSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('applies successful search results', async () => {
    const mockSubscriber = {
      id: '123',
      name: 'John',
      email: 'john@example.com',
      is_active: true,
      is_blocked: false,
      created_at: '2024-01-01',
      last_activity_date: '2024-01-01',
      in_planning_center: false,
    };
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockSubscriber],
            error: null,
            count: 1,
          }),
        }),
      }),
    };
    const markForCheck = vi.fn();
    const loadPageData = vi.fn();
    const host = {
      supabase: { client } as never,
      searchQuery: '',
      sortBy: 'last_activity_date' as const,
      sortDirection: 'desc' as const,
      searching: false,
      error: null,
      csvSuccess: null,
      sectionExpanded: false,
      subscribers: [] as never[],
      totalItems: 0,
      totalActiveCount: 0,
      hasSearched: false,
      currentPage: 1,
      markForCheck,
      allSubscribers: [] as never[],
    };

    await runEmailSubscriberFacadeSearch(host, loadPageData);

    expect(host.allSubscribers).toEqual([mockSubscriber]);
    expect(host.totalItems).toBe(1);
    expect(host.hasSearched).toBe(true);
    expect(host.searching).toBe(false);
    expect(loadPageData).toHaveBeenCalled();
    expect(markForCheck).toHaveBeenCalled();
  });
});

describe('finishEmailSubscriberFacadeConfirmationApply', () => {
  it('applies list state and shows toast', () => {
    const host = {
      allSubscribers: [] as never[],
      totalActiveCount: 0,
      totalItems: 0,
      currentPage: 1,
      csvSuccess: null,
      error: null,
      markForCheck: vi.fn(),
    };
    const toast = { success: vi.fn() };

    finishEmailSubscriberFacadeConfirmationApply(
      host,
      {
        allSubscribers: [{ id: '1' }] as never,
        totalActiveCount: 1,
        totalItems: 1,
        currentPage: 1,
        csvSuccess: null,
        toastSuccess: 'Updated',
        needsLoadPageData: false,
      },
      toast as never,
    );

    expect(host.allSubscribers).toEqual([{ id: '1' }]);
    expect(toast.success).toHaveBeenCalledWith('Updated');
    expect(host.markForCheck).toHaveBeenCalled();
  });
});

describe('runEmailSubscriberFacadeConfirmation', () => {
  it('delegates toggleActive through confirmation runner', async () => {
    const mockToast = { success: vi.fn(), error: vi.fn() };
    const host = {
      supabase: {
        client: {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        },
      },
      toast: mockToast,
      allSubscribers: [
        {
          id: '123',
          email: 'a@b.com',
          name: 'A',
          is_active: true,
          is_blocked: false,
          created_at: '2024-01-01',
          last_activity_date: '2024-01-01',
          in_planning_center: false,
        },
      ] as never[],
      totalActiveCount: 1,
      totalItems: 1,
      currentPage: 1,
      pageSize: 10,
      csvSuccess: null,
      error: null,
      markForCheck: vi.fn(),
    };

    await runEmailSubscriberFacadeConfirmation(
      host as never,
      { kind: 'toggleActive', id: '123', currentActive: true },
      {
        supabase: host.supabase as never,
        toast: mockToast as never,
        getApplyInput: () => ({
          allSubscribers: host.allSubscribers,
          totalActiveCount: host.totalActiveCount,
          totalItems: host.totalItems,
          currentPage: host.currentPage,
          pageSize: host.pageSize,
          csvSuccess: host.csvSuccess,
        }),
        loadPageData: vi.fn(),
      },
    );

    expect(mockToast.success).toHaveBeenCalled();
    expect(host.allSubscribers[0]?.is_active).toBe(false);
  });
});
