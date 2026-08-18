import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PromptManagerFacade } from './admin-prompt-manager-facade';

function createFacade() {
  const mockSupabaseService = {
    directQuery: vi.fn(),
    client: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    },
  };
  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
  };
  const markForCheck = vi.fn();
  const facade = new PromptManagerFacade({
    supabase: mockSupabaseService as never,
    toast: mockToastService as never,
    markForCheck,
  });
  return { facade, mockSupabaseService, mockToastService, markForCheck };
}

describe('PromptManagerFacade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { facade } = createFacade();
    expect(facade.prompts).toEqual([]);
    expect(facade.searchQuery).toBe('');
    expect(facade.showAddForm).toBe(false);
    expect(facade.showCSVUpload).toBe(false);
    expect(facade.error).toBeNull();
  });

  describe('onSectionToggle', () => {
    it('bootstraps on first expand only', async () => {
      const { facade, mockSupabaseService } = createFacade();
      const mockTypes = [
        { name: 'Type1', display_order: 1, is_active: true },
      ];
      mockSupabaseService.directQuery.mockImplementation(async (table: string) => {
        if (table === 'prayer_types') {
          return { data: mockTypes, error: null };
        }
        return { data: [], error: null };
      });

      facade.onSectionToggle();
      await vi.waitFor(() => {
        expect(facade.prayerTypes).toEqual(mockTypes);
        expect(facade.hasSearched).toBe(true);
      });

      const callsBefore = mockSupabaseService.directQuery.mock.calls.length;
      facade.onSectionToggle();
      facade.onSectionToggle();
      expect(mockSupabaseService.directQuery.mock.calls.length).toBe(callsBefore);
    });
  });

  describe('fetchPrayerTypes', () => {
    it('loads active prayer types', async () => {
      const { facade, mockSupabaseService } = createFacade();
      const mockTypes = [
        { name: 'Prayer', display_order: 1, is_active: true },
        { name: 'Praise', display_order: 2, is_active: true },
      ];
      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      await facade.fetchPrayerTypes();

      expect(facade.prayerTypes).toEqual(mockTypes);
    });

    it('handles single object response', async () => {
      const { facade, mockSupabaseService } = createFacade();
      const mockType = { name: 'Prayer', display_order: 1, is_active: true };
      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockType,
        error: null,
      });

      await facade.fetchPrayerTypes();

      expect(facade.prayerTypes).toEqual([mockType]);
    });

    it('handles errors gracefully', async () => {
      const { facade, mockSupabaseService } = createFacade();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      });

      await facade.fetchPrayerTypes();

      expect(facade.prayerTypes).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('prompt search debounce', () => {
    it('Enter runs search immediately', () => {
      const { facade } = createFacade();
      const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue();
      facade.searchQuery = 'ab';
      const ev = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      facade.onPromptSearchKeydown(ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });

    it('clearPromptSearch clears query and reloads', () => {
      const { facade } = createFacade();
      facade.searchQuery = 'test';
      const spy = vi.spyOn(facade, 'handleSearch').mockResolvedValue();
      facade.clearPromptSearch();
      expect(facade.searchQuery).toBe('');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleSearch', () => {
    it('filters results client-side based on query', async () => {
      const { facade, mockSupabaseService } = createFacade();
      const mockPrompts = [
        {
          id: '1',
          title: 'Test Prayer',
          type: 'Prayer',
          description: 'First desc',
          created_at: '2024-01-01',
        },
        {
          id: '2',
          title: 'Other',
          type: 'Praise',
          description: 'Second desc',
          created_at: '2024-01-02',
        },
      ];
      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockPrompts,
        error: null,
      });

      facade.searchQuery = 'test';
      await facade.handleSearch();

      expect(facade.prompts).toHaveLength(1);
      expect(facade.prompts[0]?.title).toBe('Test Prayer');
    });

    it('handles errors during search', async () => {
      const { facade, mockSupabaseService } = createFacade();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: new Error('Search failed'),
      });

      await facade.handleSearch();

      expect(facade.error).toContain('Failed to search prompts');
      expect(facade.searching).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('toggleCSVUpload', () => {
    it('toggles visibility and clears messages', () => {
      const { facade } = createFacade();
      facade.error = 'Error';
      facade.success = 'Success';
      facade.toggleCSVUpload();
      expect(facade.showCSVUpload).toBe(true);
      expect(facade.showAddForm).toBe(false);
      expect(facade.error).toBeNull();
      expect(facade.success).toBeNull();
    });
  });

  describe('toggleAddForm', () => {
    it('toggles add form and hides CSV upload', () => {
      const { facade } = createFacade();
      facade.showCSVUpload = true;
      facade.toggleAddForm();
      expect(facade.showAddForm).toBe(true);
      expect(facade.showCSVUpload).toBe(false);
    });
  });

  describe('handleEdit', () => {
    it('sets editing id and clears messages', () => {
      const { facade } = createFacade();
      const prompt = {
        id: 'prompt-123',
        title: 'Test',
        type: 'Guidance' as never,
        description: 'Desc',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      facade.error = 'Error';
      facade.success = 'Success';
      facade.handleEdit(prompt);
      expect(facade.editingId).toBe('prompt-123');
      expect(facade.error).toBeNull();
      expect(facade.success).toBeNull();
    });
  });

  describe('handleDelete', () => {
    it('opens delete confirmation dialog', () => {
      const { facade } = createFacade();
      const openDeleteConfirmation = vi.fn();
      (facade as { dialogsRef?: { openDeleteConfirmation: typeof openDeleteConfirmation } }).dialogsRef =
        { openDeleteConfirmation };

      facade.handleDelete('prompt-123', 'Test Prayer');

      expect(openDeleteConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Delete Prompt' }),
        { kind: 'delete', id: 'prompt-123', title: 'Test Prayer' },
      );
    });

    it('deletes prompt after confirmation', async () => {
      const { facade, mockSupabaseService, mockToastService } = createFacade();

      await facade.onDeleteConfirmed({
        kind: 'delete',
        id: 'prompt-123',
        title: 'Test Prayer',
      });

      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('prayer_prompts');
      expect(facade.success).toBe('Prayer prompt deleted successfully!');
      expect(mockToastService.success).toHaveBeenCalledWith('Prompt deleted.');
    });
  });

  describe('cancelEdit', () => {
    it('resets editing state', () => {
      const { facade } = createFacade();
      facade.editingId = 'prompt-123';
      facade.error = 'Error';
      facade.cancelEdit();
      expect(facade.editingId).toBeNull();
      expect(facade.error).toBeNull();
    });
  });
});
