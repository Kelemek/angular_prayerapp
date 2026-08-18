import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrayerEditorFacade } from './admin-prayer-editor-facade';

const mockPrayer = {
  id: '123',
  title: 'Test Prayer',
  requester: 'John Doe',
  email: 'john@example.com',
  status: 'current',
  created_at: '2024-01-15T10:30:00Z',
  denial_reason: null,
  description: 'Test description',
  approval_status: 'approved',
  prayer_for: 'Jane Doe',
  prayer_updates: [],
};

function createTestContext() {
  const markForCheck = vi.fn();
  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  };
  const mockPrayerService = {
    loadPrayers: vi.fn().mockResolvedValue(undefined),
  };

  const defaultPrayersTableMock = {
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockPrayer, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
      in: vi.fn().mockResolvedValue({ error: null }),
    }),
  };

  const mockSupabaseService = {
    getSupabaseUrl: vi.fn().mockReturnValue('https://test.supabase.co'),
    getSupabaseKey: vi.fn().mockReturnValue('test-key'),
    getClient: vi.fn().mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'email_subscribers') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return defaultPrayersTableMock;
      }),
    }),
  };

  const facade = new PrayerEditorFacade({
    supabase: mockSupabaseService as never,
    toast: mockToastService as never,
    prayerService: mockPrayerService as never,
    markForCheck,
  });

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }),
  );

  return {
    facade,
    markForCheck,
    mockToastService,
    mockPrayerService,
    mockSupabaseService,
    defaultPrayersTableMock,
  };
}

describe('PrayerEditorFacade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('initializes with default list state', () => {
    const { facade } = createTestContext();
    expect(facade.searchTerm).toBe('');
    expect(facade.allPrayers).toEqual([]);
    expect(facade.selectedPrayers).toBeInstanceOf(Set);
    expect(facade.currentPage).toBe(1);
    expect(facade.pageSize).toBe(10);
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
    it('computes page metadata and slices display list', () => {
      const { facade } = createTestContext();
      facade.allPrayers = Array.from({ length: 25 }, (_, i) => ({
        ...mockPrayer,
        id: `prayer-${i}`,
      })) as never;
      facade.totalItems = 25;
      facade.pageSize = 10;
      facade.currentPage = 2;

      expect(facade.totalPages).toBe(3);
      facade.loadPageData();
      expect(facade.displayPrayers).toHaveLength(10);
      expect(facade.displayPrayers[0]?.id).toBe('prayer-10');
    });
  });

  describe('handleSearch', () => {
    it('fetches prayers successfully', async () => {
      const { facade } = createTestContext();
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [mockPrayer],
        }),
      );

      await facade.handleSearch();

      expect(facade.allPrayers).toEqual([mockPrayer]);
      expect(facade.totalItems).toBe(1);
      expect(facade.searching).toBe(false);
    });
  });

  describe('clearSearch', () => {
    it('resets list state and triggers search', async () => {
      const { facade } = createTestContext();
      const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue(undefined);
      facade.searchTerm = 'test';
      facade.allPrayers = [mockPrayer] as never;
      facade.error = 'Error';

      facade.clearSearch();

      expect(facade.searchTerm).toBe('');
      expect(facade.allPrayers).toEqual([]);
      expect(facade.error).toBeNull();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('prayer creation shell', () => {
    it('startCreatePrayer clears error and resets panel form', async () => {
      const { facade } = createTestContext();
      const resetForm = vi.fn();
      (facade as { panelRef?: { resetCreateForm: () => void } }).panelRef = {
        resetCreateForm: resetForm,
      };
      facade.error = 'Previous error';
      facade.startCreatePrayer();
      expect(facade.creatingPrayer).toBe(true);
      expect(facade.error).toBeNull();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(resetForm).toHaveBeenCalled();
    });

    it('onPrayerCreated prepends prayer and opens send dialog', () => {
      const { facade } = createTestContext();
      const openSend = vi.fn();
      (facade as { dialogsRef?: { openSendNotificationForPrayer: typeof openSend } }).dialogsRef =
        { openSendNotificationForPrayer: openSend };
      const prayer = { ...mockPrayer, id: 'new-prayer' };
      facade.onPrayerCreated(prayer as never);
      expect(facade.allPrayers[0]?.id).toBe('new-prayer');
      expect(openSend).toHaveBeenCalledWith('new-prayer', prayer.title);
      expect(facade.creatingPrayer).toBe(false);
    });
  });

  describe('prayer editing', () => {
    it('starts and cancels edit', () => {
      const { facade } = createTestContext();
      facade.startEditPrayer(mockPrayer as never);
      expect(facade.editingPrayer).toBe(mockPrayer.id);
      expect(facade.editForm.title).toBe(mockPrayer.title);
      facade.cancelEdit();
      expect(facade.editingPrayer).toBeNull();
      expect(facade.editForm.title).toBe('');
    });

    it('saves prayer successfully', async () => {
      const { facade, mockToastService } = createTestContext();
      facade.editForm = {
        title: 'Updated Title',
        description: 'Updated description',
        requester: 'John Doe',
        email: 'john@example.com',
        prayer_for: 'Jane',
        status: 'current',
      };
      facade.allPrayers = [mockPrayer] as never;
      facade.loadPageData();

      await facade.savePrayer('123');

      expect(mockToastService.success).toHaveBeenCalled();
      expect(facade.editingPrayer).toBeNull();
    });

    it('rejects save with empty title', async () => {
      const { facade } = createTestContext();
      facade.editForm.title = '';
      facade.editForm.description = 'desc';
      facade.editForm.requester = 'John';
      await facade.savePrayer('123');
      expect(facade.error).toContain('required');
    });
  });

  describe('prayer deletion', () => {
    it('opens delete confirmation dialog', async () => {
      const { facade } = createTestContext();
      const openDelete = vi.fn();
      (facade as { dialogsRef?: { openDeletePrayerConfirmation: typeof openDelete } }).dialogsRef =
        { openDeletePrayerConfirmation: openDelete };

      await facade.deletePrayer(mockPrayer as never);

      expect(openDelete).toHaveBeenCalledWith(mockPrayer);
    });

    it('deletes prayer on confirmation', async () => {
      const { facade, mockToastService } = createTestContext();
      facade.allPrayers = [mockPrayer] as never;
      facade.searchResults = [mockPrayer] as never;
      facade.totalItems = 1;

      await facade.onConfirmationConfirmed({ kind: 'deleteOne', prayerId: mockPrayer.id });

      expect(mockToastService.success).toHaveBeenCalledWith('Prayer deleted successfully');
      expect(facade.allPrayers).toHaveLength(0);
    });

    it('opens bulk delete confirmation', async () => {
      const { facade } = createTestContext();
      const openDeleteSelected = vi.fn();
      (facade as {
        dialogsRef?: { openDeleteSelectedConfirmation: typeof openDeleteSelected };
      }).dialogsRef = { openDeleteSelectedConfirmation: openDeleteSelected };
      facade.selectedPrayers = new Set(['1', '2', '3']);

      await facade.deleteSelected();

      expect(openDeleteSelected).toHaveBeenCalledWith(3);
    });
  });

  describe('bulk status update', () => {
    it('skips when nothing selected', async () => {
      const { facade, mockSupabaseService } = createTestContext();
      await facade.updateSelectedStatus();
      expect(mockSupabaseService.getClient().from().update).not.toHaveBeenCalled();
    });

    it('updates selected status on confirmation', async () => {
      const { facade, mockToastService } = createTestContext();
      facade.selectedPrayers = new Set(['1', '2']);
      facade.bulkStatus = 'archived';
      facade.allPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' },
      ] as never;
      facade.searchResults = facade.allPrayers;

      const mockIn = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
      facade.supabaseService.getClient().from = vi.fn().mockReturnValue({ update: mockUpdate });

      await facade.onConfirmationConfirmed({ kind: 'bulkStatus' });

      expect(mockToastService.success).toHaveBeenCalled();
      expect(facade.selectedPrayers.size).toBe(0);
      expect(facade.bulkStatus).toBe('');
    });
  });

  describe('prayer updates', () => {
    it('validates and saves new update', async () => {
      const { facade, mockToastService } = createTestContext();
      facade.newUpdate = {
        content: 'Test',
        firstName: 'John',
        lastName: 'Doe',
        author_email: 'john@example.com',
      };
      facade.allPrayers = [mockPrayer] as never;

      await facade.saveNewUpdate('123');

      expect(mockToastService.success).toHaveBeenCalled();
      expect(facade.addingUpdate).toBeNull();
    });

    it('opens typed delete update confirmation', () => {
      const { facade } = createTestContext();
      const openDeleteUpdateConfirmation = vi.fn();
      (facade as {
        dialogsRef?: { openDeleteUpdateConfirmation: typeof openDeleteUpdateConfirmation };
      }).dialogsRef = { openDeleteUpdateConfirmation };

      facade.deleteUpdate('123', 'update-1', 'Test');

      expect(openDeleteUpdateConfirmation).toHaveBeenCalledWith(
        '123',
        'update-1',
        'Test',
      );
    });

    it('executes delete update', async () => {
      const { facade, mockToastService } = createTestContext();
      facade.allPrayers = [
        {
          ...mockPrayer,
          prayer_updates: [
            { id: 'update-1', content: 'Test', author: 'John', created_at: '2024-01-01' },
          ],
        },
      ] as never;

      await facade.executeDeleteUpdate('123', 'update-1');

      expect(mockToastService.success).toHaveBeenCalled();
    });
  });

  describe('selection management', () => {
    it('toggleSelectPrayer and toggleSelectAll', () => {
      const { facade } = createTestContext();
      facade.displayPrayers = [{ ...mockPrayer, id: 'a' }, { ...mockPrayer, id: 'b' }] as never;
      facade.toggleSelectPrayer('a');
      expect(facade.selectedPrayers.has('a')).toBe(true);
      facade.toggleSelectAll();
      expect(facade.selectedPrayers.has('a')).toBe(true);
      expect(facade.selectedPrayers.has('b')).toBe(true);
    });
  });

  describe('filter handling', () => {
    it('Enter triggers immediate search', () => {
      const { facade } = createTestContext();
      const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue(undefined);
      const ev = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      facade.onMainSearchKeydown(ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('search debounce', () => {
    it('destroySearchDebouncer clears pending timers', () => {
      vi.useFakeTimers();
      const { facade } = createTestContext();
      const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue(undefined);
      facade.onMainSearchTermChange('ab');
      facade.destroySearchDebouncer();
      vi.advanceTimersByTime(500);
      expect(spy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
