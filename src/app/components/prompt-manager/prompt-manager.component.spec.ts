import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApplicationRef, ChangeDetectorRef } from '@angular/core';
import { PromptManagerComponent } from './prompt-manager.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

describe('PromptManagerComponent', () => {
  let component: PromptManagerComponent;
  let mockSupabaseService: any;
  let mockToastService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseService = {
      directQuery: vi.fn(),
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }
    };

    mockToastService = {
      show: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn()
    };

    const mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn()
    } as unknown as ChangeDetectorRef;

    const mockApplicationRef = {
      tick: vi.fn()
    } as unknown as ApplicationRef;

    component = new PromptManagerComponent(
      mockSupabaseService,
      mockToastService,
      mockChangeDetectorRef,
      mockApplicationRef
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onSectionToggle', () => {
    it('fetches prayer types then loads prompts on first expand', async () => {
      const mockTypes = [
        { name: 'Type1', display_order: 1, is_active: true },
        { name: 'Type2', display_order: 2, is_active: true }
      ];

      mockSupabaseService.directQuery.mockImplementation(async (table: string) => {
        if (table === 'prayer_types') {
          return { data: mockTypes, error: null };
        }
        return { data: [], error: null };
      });

      component.onSectionToggle();

      await vi.waitFor(() => {
        expect(mockSupabaseService.directQuery).toHaveBeenCalledWith(
          'prayer_types',
          expect.objectContaining({
            select: '*',
            eq: { is_active: true },
            order: { column: 'display_order', ascending: true }
          })
        );
        expect(mockSupabaseService.directQuery).toHaveBeenCalledWith(
          'prayer_prompts',
          expect.objectContaining({
            select: '*',
            limit: 500
          })
        );
        expect(component.prayerTypes).toEqual(mockTypes);
        expect(component.hasSearched).toBe(true);
      });
    });
  });

  describe('fetchPrayerTypes', () => {
    it('should load active prayer types', async () => {
      const mockTypes = [
        { name: 'Prayer', display_order: 1, is_active: true },
        { name: 'Praise', display_order: 2, is_active: true }
      ];

      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockTypes,
        error: null
      });

      await component.fetchPrayerTypes();

      expect(component.prayerTypes).toEqual(mockTypes);
    });

    it('should handle single object response', async () => {
      const mockType = { name: 'Prayer', display_order: 1, is_active: true };

      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockType,
        error: null
      });

      await component.fetchPrayerTypes();

      expect(component.prayerTypes).toEqual([mockType]);
    });

    it('should handle null data', async () => {
      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: null
      });

      await component.fetchPrayerTypes();

      expect(component.prayerTypes).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: new Error('DB error')
      });

      await component.fetchPrayerTypes();

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching prayer types:', expect.any(Error));
      consoleSpy.mockRestore();
    });

  });

  describe('prompt search debounce', () => {
    it('Enter runs search immediately', () => {
      const spy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
      component.searchQuery = 'ab';
      const ev = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      component.onPromptSearchKeydown(ev);
      expect(ev.preventDefault).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });

    it('ngOnDestroy cancels pending debounced search', () => {
      vi.useFakeTimers();
      const spy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
      component.onPromptSearchQueryChange('ab');
      vi.advanceTimersByTime(100);
      component.ngOnDestroy();
      vi.advanceTimersByTime(400);
      expect(spy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('clearPromptSearch clears query and reloads', () => {
      component.searchQuery = 'test';
      const spy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
      component.clearPromptSearch();
      expect(component.searchQuery).toBe('');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleSearch', () => {
    it('should search prompts with query', async () => {
      const mockPrompts = [
        { id: '1', title: 'Test Prayer', type: 'Prayer', description: 'Test desc', created_at: '2024-01-01' }
      ];

      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockPrompts,
        error: null
      });

      component.searchQuery = 'test';
      await component.handleSearch();

      expect(component.searching).toBe(false);
      expect(component.hasSearched).toBe(true);
      expect(component.prompts.length).toBe(1);
    });

    it('should filter results client-side based on query', async () => {
      const mockPrompts = [
        { id: '1', title: 'Test Prayer', type: 'Prayer', description: 'First desc', created_at: '2024-01-01' },
        { id: '2', title: 'Other', type: 'Praise', description: 'Second desc', created_at: '2024-01-02' }
      ];

      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockPrompts,
        error: null
      });

      component.searchQuery = 'test';
      await component.handleSearch();

      expect(component.prompts).toHaveLength(1);
      expect(component.prompts[0].title).toBe('Test Prayer');
    });

    it('should filter by type', async () => {
      const mockPrompts = [
        { id: '1', title: 'Prayer 1', type: 'Prayer', description: 'Desc 1', created_at: '2024-01-01' },
        { id: '2', title: 'Praise 1', type: 'Praise', description: 'Desc 2', created_at: '2024-01-02' }
      ];

      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockPrompts,
        error: null
      });

      component.searchQuery = 'praise';
      await component.handleSearch();

      expect(component.prompts).toHaveLength(1);
      expect(component.prompts[0].type).toBe('Praise');
    });

    it('should filter by description', async () => {
      const mockPrompts = [
        { id: '1', title: 'Prayer 1', type: 'Prayer', description: 'Special content', created_at: '2024-01-01' },
        { id: '2', title: 'Prayer 2', type: 'Prayer', description: 'Other content', created_at: '2024-01-02' }
      ];

      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockPrompts,
        error: null
      });

      component.searchQuery = 'special';
      await component.handleSearch();

      expect(component.prompts).toHaveLength(1);
      expect(component.prompts[0].description).toContain('Special');
    });

    it('should return all prompts if query is empty', async () => {
      const mockPrompts = [
        { id: '1', title: 'Prayer 1', type: 'Prayer', description: 'Desc 1', created_at: '2024-01-01' },
        { id: '2', title: 'Prayer 2', type: 'Prayer', description: 'Desc 2', created_at: '2024-01-02' }
      ];

      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockPrompts,
        error: null
      });

      component.searchQuery = '';
      await component.handleSearch();

      expect(component.prompts).toHaveLength(2);
    });

    it('should handle errors during search', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: new Error('Search failed')
      });

      await component.handleSearch();

      expect(component.error).toContain('Failed to search prompts');
      expect(component.searching).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should clear error and success messages before searching', async () => {
      component.error = 'Old error';
      component.success = 'Old success';

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [],
        error: null
      });

      await component.handleSearch();

      expect(component.error).toBeNull();
      expect(component.success).toBeNull();
    });
  });

  describe('toggleCSVUpload', () => {
    it('should toggle CSV upload visibility', () => {
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
      expect(component.showCSVUpload).toBe(true);
    });

    it('should clear messages when toggling CSV upload', () => {
      component.error = 'Error';
      component.success = 'Success';

      component.toggleCSVUpload();

      expect(component.error).toBeNull();
      expect(component.success).toBeNull();
    });
  });

  describe('toggleAddForm', () => {
    it('should toggle add form visibility', () => {
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
      expect(component.showAddForm).toBe(true);
    });

    it('should clear editing state when opening add form', () => {
      component.editingId = 'some-id';

      component.toggleAddForm();

      expect(component.editingId).toBeNull();
      expect(component.showAddForm).toBe(true);
    });
  });







  describe('handleEdit', () => {
    it('should populate form with prompt data', () => {
      const prompt = {
        id: 'prompt-123',
        title: 'Test Prayer',
        type: 'Guidance' as any,
        description: 'Test description',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      component.handleEdit(prompt);

      expect(component.editingId).toBe('prompt-123');
      expect(component.showAddForm).toBe(false);
      expect(component.showCSVUpload).toBe(false);
    });

    it('should clear messages when editing', () => {
      const prompt = {
        id: 'prompt-123',
        title: 'Test',
        type: 'Guidance' as any,
        description: 'Desc',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      component.error = 'Error';
      component.success = 'Success';

      component.handleEdit(prompt);

      expect(component.error).toBeNull();
      expect(component.success).toBeNull();
    });
  });

  describe('handleDelete', () => {
    it('should show deletion confirmation dialog', async () => {
      await component.handleDelete('prompt-123', 'Test Prayer');

      expect(component.showConfirmationDialog).toBe(true);
      expect(component.confirmationDeleteId).toBe('prompt-123');
      expect(component.confirmationTitle).toBe('Delete Prompt');
    });

    it('should delete prompt after confirmation', async () => {
      await component.handleDelete('prompt-123', 'Test Prayer');
      await component.onConfirmDelete();

      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('prayer_prompts');
      expect(component.success).toBe('Prayer prompt deleted successfully!');
    });

    it('should not delete if user cancels', async () => {
      await component.handleDelete('prompt-123', 'Test Prayer');
      component.onCancelDelete();

      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should handle delete errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseService.client.from.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: new Error('Delete failed') }))
        }))
      });

      await component.handleDelete('prompt-123', 'Test Prayer');
      await component.onConfirmDelete();

      expect(component.error).toContain('Failed to delete prayer prompt');
      
      consoleSpy.mockRestore();
    });

    it('should refresh search results after deletion', async () => {
      component.hasSearched = true;

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [],
        error: null
      });

      await component.handleDelete('prompt-123', 'Test Prayer');
      await component.onConfirmDelete();

      expect(mockSupabaseService.directQuery).toHaveBeenCalled();
    });
  });

  describe('cancelEdit', () => {
    it('should reset editing state', () => {
      component.editingId = 'prompt-123';
      component.error = 'Error';

      component.cancelEdit();

      expect(component.editingId).toBeNull();
      expect(component.error).toBeNull();
    });
  });
});
