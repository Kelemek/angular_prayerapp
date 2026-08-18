import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrayerTypesFacade } from './admin-prayer-types-facade';
import type { PrayerTypeRecord } from '../types/prayer';

const createMockPrayerType = (
  overrides: Partial<PrayerTypeRecord> = {},
): PrayerTypeRecord => ({
  id: 'type-1',
  name: 'Healing',
  display_order: 0,
  is_active: true,
  include_in_booklet: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

function createTestContext() {
  const markForCheck = vi.fn();
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };
  const mockPromptService = {
    loadPrompts: vi.fn().mockResolvedValue(undefined),
  };

  const mockSupabaseClient = {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  };

  const mockSupabase = {
    client: mockSupabaseClient,
    getClient: () => mockSupabaseClient,
    directQuery: vi.fn().mockResolvedValue({ data: [], error: null }),
  };

  const facade = new PrayerTypesFacade({
    supabase: mockSupabase as never,
    toast: mockToast as never,
    promptService: mockPromptService as never,
    markForCheck,
  });

  const panelRef = { resetTypeFormForAdd: vi.fn() };
  (facade as { panelRef?: typeof panelRef }).panelRef = panelRef;

  const dialogsRef = { openConfirmation: vi.fn() };
  (facade as { dialogsRef?: typeof dialogsRef }).dialogsRef = dialogsRef;

  return {
    facade,
    markForCheck,
    mockToast,
    mockPromptService,
    mockSupabase,
    mockSupabaseClient,
    panelRef,
    dialogsRef,
  };
}

describe('PrayerTypesFacade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { facade } = createTestContext();
    expect(facade.types).toEqual([]);
    expect(facade.loading).toBe(false);
    expect(facade.showAddForm).toBe(false);
    expect(facade.error).toBeNull();
    expect(facade.success).toBeNull();
    expect(facade.editingType).toBeNull();
  });

  describe('onSectionToggle', () => {
    it('fetches types on first expand only', () => {
      const { facade } = createTestContext();
      const spy = vi.spyOn(facade, 'fetchTypes').mockResolvedValue(undefined);

      facade.onSectionToggle();
      facade.onSectionToggle();
      facade.onSectionToggle();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchTypes', () => {
    it('fetches prayer types successfully', async () => {
      const { facade, mockSupabase } = createTestContext();
      const mockTypes = [
        createMockPrayerType({ id: '1', name: 'Healing' }),
        createMockPrayerType({ id: '2', name: 'Guidance' }),
      ];
      mockSupabase.directQuery.mockResolvedValue({ data: mockTypes, error: null });

      await facade.fetchTypes();

      expect(facade.types).toEqual(mockTypes);
      expect(facade.loading).toBe(false);
      expect(facade.error).toBeNull();
    });

    it('handles fetch error', async () => {
      const { facade, mockSupabase } = createTestContext();
      mockSupabase.directQuery.mockResolvedValue({
        data: null,
        error: new Error('Fetch failed'),
      });

      await facade.fetchTypes();

      expect(facade.types).toEqual([]);
      expect(facade.error).toBe('Fetch failed');
      expect(facade.sectionExpanded).toBe(true);
    });

    it('wraps a single returned row as one type', async () => {
      const { facade, mockSupabase } = createTestContext();
      const singleType = createMockPrayerType({ id: 'solo', name: 'Solo' });
      mockSupabase.directQuery.mockResolvedValue({ data: singleType, error: null });

      await facade.fetchTypes();

      expect(facade.types).toEqual([singleType]);
    });
  });

  describe('toggleAddForm', () => {
    it('toggles showAddForm and clears messages when opening', () => {
      const { facade, panelRef } = createTestContext();
      facade.editingType = createMockPrayerType({ id: 'some-id' });
      facade.error = 'Some error';
      facade.success = 'Some success';

      facade.toggleAddForm();

      expect(facade.editingType).toBeNull();
      expect(facade.error).toBeNull();
      expect(facade.success).toBeNull();
      expect(facade.showAddForm).toBe(true);
      expect(panelRef.resetTypeFormForAdd).toHaveBeenCalled();

      facade.toggleAddForm();
      expect(facade.showAddForm).toBe(false);
    });
  });

  describe('handleEdit', () => {
    it('sets editing type and opens form', () => {
      const { facade } = createTestContext();
      const type = createMockPrayerType({ id: 'type-1', name: 'Test Type' });

      facade.handleEdit(type);

      expect(facade.editingType).toEqual(type);
      expect(facade.showAddForm).toBe(true);
      expect(facade.error).toBeNull();
      expect(facade.success).toBeNull();
    });
  });

  describe('handleDelete', () => {
    it('opens delete confirmation via dialogs', () => {
      const { facade, dialogsRef } = createTestContext();

      facade.handleDelete('type-1', 'Healing');

      expect(dialogsRef.openConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Delete Prayer Type' }),
        { kind: 'delete', deleteId: 'type-1' },
      );
    });

    it('deletes prayer type on confirmation', async () => {
      const { facade, mockPromptService, mockSupabase } = createTestContext();
      mockSupabase.directQuery.mockResolvedValue({ data: [], error: null });

      await facade.onConfirmationConfirmed({
        kind: 'delete',
        deleteId: 'type-1',
      });

      expect(facade.success).toBe('Prayer type deleted successfully!');
      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
    });
  });

  describe('toggleActive', () => {
    it('deactivates on confirmation', async () => {
      const { facade, mockPromptService, mockSupabase } = createTestContext();
      const type = createMockPrayerType({ id: 'type-1', is_active: true });
      mockSupabase.directQuery.mockResolvedValue({ data: [], error: null });

      await facade.onConfirmationConfirmed({
        kind: 'toggleActive',
        type,
      });

      expect(facade.success).toBe('Prayer type deactivated successfully!');
      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
    });

    it('handles toggle error', async () => {
      const { facade, mockSupabaseClient } = createTestContext();
      const type = createMockPrayerType({ id: 'type-1', is_active: true });
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: new Error('Toggle failed') })),
        })),
      }));

      await facade.onConfirmationConfirmed({
        kind: 'toggleActive',
        type,
      });

      expect(facade.error).toBe('Toggle failed');
    });
  });

  describe('toggleBooklet', () => {
    it('toggles booklet inclusion on confirmation', async () => {
      const { facade, mockSupabase, mockSupabaseClient } = createTestContext();
      const type = createMockPrayerType({ id: 'type-1', include_in_booklet: false });
      mockSupabase.directQuery.mockResolvedValue({ data: [], error: null });

      await facade.onConfirmationConfirmed({
        kind: 'toggleBooklet',
        type,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayer_types');
      expect(mockSupabase.directQuery).toHaveBeenCalled();
    });
  });

  describe('onDrop', () => {
    it('does not reorder when position unchanged', async () => {
      const { facade, mockSupabaseClient } = createTestContext();

      await facade.onDrop({
        previousIndex: 2,
        currentIndex: 2,
      } as never);

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('reorders prayer types successfully', async () => {
      const { facade, mockPromptService, mockSupabase, mockSupabaseClient } =
        createTestContext();
      const types = [
        createMockPrayerType({ id: '1', display_order: 0 }),
        createMockPrayerType({ id: '2', display_order: 1 }),
        createMockPrayerType({ id: '3', display_order: 2 }),
      ];
      facade.types = [...types];
      mockSupabase.directQuery.mockResolvedValue({ data: types, error: null });

      await facade.onDrop({
        previousIndex: 0,
        currentIndex: 2,
      } as never);

      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
      expect(facade.reordering).toBe(false);
    });

    it('reverts on reorder error', async () => {
      const { facade, mockSupabaseClient } = createTestContext();
      const types = [
        createMockPrayerType({ id: '1' }),
        createMockPrayerType({ id: '2' }),
      ];
      const originalTypes = [...types];
      facade.types = [...types];

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: new Error('Reorder failed') })),
        })),
      }));

      await facade.onDrop({
        previousIndex: 0,
        currentIndex: 1,
      } as never);

      expect(facade.error).toBe('Reorder failed');
      expect(facade.types).toEqual(originalTypes);
    });
  });

  describe('getActiveCount', () => {
    it('returns count of active types', () => {
      const { facade } = createTestContext();
      facade.types = [
        createMockPrayerType({ is_active: true }),
        createMockPrayerType({ is_active: false }),
        createMockPrayerType({ is_active: true }),
      ];

      expect(facade.getActiveCount()).toBe(2);
    });
  });
});
