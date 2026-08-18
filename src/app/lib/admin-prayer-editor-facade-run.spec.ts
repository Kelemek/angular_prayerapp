import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyPrayerEditorFacadeMutationError,
  applyPrayerEditorFacadeValidationError,
  runPrayerEditorFacadeConfirmation,
  runPrayerEditorFacadeSearch,
} from './admin-prayer-editor-facade-run';

describe('applyPrayerEditorFacadeMutationError', () => {
  it('sets error, expands section, and toasts', () => {
    const target = { error: null, sectionExpanded: false };
    const toast = { error: vi.fn() };

    applyPrayerEditorFacadeMutationError(target, toast as never, new Error('boom'), 'fallback');

    expect(target.error).toBe('boom');
    expect(target.sectionExpanded).toBe(true);
    expect(toast.error).toHaveBeenCalledWith('boom');
  });
});

describe('applyPrayerEditorFacadeValidationError', () => {
  it('sets validation message and expands section', () => {
    const target = { error: null, sectionExpanded: false };
    const toast = { error: vi.fn() };

    applyPrayerEditorFacadeValidationError(target, toast as never, 'Required');

    expect(target.error).toBe('Required');
    expect(target.sectionExpanded).toBe(true);
    expect(toast.error).toHaveBeenCalledWith('Required');
  });
});

describe('runPrayerEditorFacadeSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('applies search results and clears selection', async () => {
    const mockPrayer = { id: '1', title: 'Test', prayer_updates: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer],
      }),
    );

    const markForCheck = vi.fn();
    const loadPageData = vi.fn();
    const host = {
      supabaseService: {
        getSupabaseUrl: () => 'https://test.supabase.co',
        getSupabaseKey: () => 'key',
      },
      toast: { error: vi.fn() },
      searchTerm: '',
      statusFilter: '',
      approvalFilter: '',
      mainSearchResultLimit: 50,
      allPrayers: [] as never[],
      totalItems: 0,
      currentPage: 1,
      selectedPrayers: new Set(['old']),
      searching: false,
      error: null,
      sectionExpanded: false,
      markForCheck,
    };

    await runPrayerEditorFacadeSearch(host, loadPageData);

    expect(host.allPrayers).toEqual([mockPrayer]);
    expect(host.totalItems).toBe(1);
    expect(host.selectedPrayers.size).toBe(0);
    expect(host.searching).toBe(false);
    expect(loadPageData).toHaveBeenCalled();
    expect(markForCheck).toHaveBeenCalled();
  });
});

describe('runPrayerEditorFacadeConfirmation', () => {
  it('delegates deleteOne through confirmation runner', async () => {
    const mockToast = { success: vi.fn(), error: vi.fn() };
    const host = {
      supabaseService: {
        getClient: () => ({
          from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      },
      toast: mockToast,
      prayerService: { loadPrayers: vi.fn().mockResolvedValue(undefined) },
      markForCheck: vi.fn(),
      searchResults: [{ id: '1', title: 'T', prayer_updates: [] }] as never[],
      allPrayers: [{ id: '1', title: 'T', prayer_updates: [] }] as never[],
      selectedPrayers: new Set<string>(),
      bulkStatus: '',
      totalItems: 1,
      currentPage: 1,
      deleting: false,
      updatingStatus: false,
      error: null,
      sectionExpanded: false,
    };

    await runPrayerEditorFacadeConfirmation(host as never, {
      kind: 'deleteOne',
      prayerId: '1',
    }, {
      loadPageData: vi.fn(),
      executeDeleteUpdate: vi.fn().mockResolvedValue(undefined),
    });

    expect(mockToast.success).toHaveBeenCalled();
    expect(host.allPrayers).toHaveLength(0);
  });
});
