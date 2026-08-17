import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApplicationRef, ChangeDetectorRef } from '@angular/core';
import { PrayerTypesManagerComponent } from './prayer-types-manager.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PromptService } from '../../services/prompt.service';
import { firstValueFrom } from 'rxjs';
import type { PrayerTypeRecord } from '../../types/prayer';

describe('PrayerTypesManagerComponent', () => {
  let component: PrayerTypesManagerComponent;
  let mockSupabaseService: any;
  let mockSupabaseClient: any;
  let mockToastService: any;
  let mockPromptService: any;
  let mockChangeDetectorRef: any;

  const createMockPrayerType = (overrides: Partial<PrayerTypeRecord> = {}): PrayerTypeRecord => ({
    id: 'type-1',
    name: 'Healing',
    display_order: 0,
    is_active: true,
    include_in_booklet: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  });

  const createMockQueryChain = (returnData: any = null, returnError: any = null) => ({
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: returnData, error: returnError }))
    })),
    insert: vi.fn(() => Promise.resolve({ data: returnData, error: returnError })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: returnData, error: returnError }))
    }))
  });

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabaseClient = {
      from: vi.fn((table: string) => createMockQueryChain(null, null))
    };

    // Create mock SupabaseService
    mockSupabaseService = {
      client: mockSupabaseClient,
      directQuery: vi.fn(() => Promise.resolve({ data: [], error: null }))
    } as unknown as SupabaseService;

    // Create mock ToastService
    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn()
    } as unknown as ToastService;

    // Create mock PromptService
    mockPromptService = {
      loadPrompts: vi.fn(() => Promise.resolve())
    } as unknown as PromptService;

    // Create mock ChangeDetectorRef
    mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn()
    } as unknown as ChangeDetectorRef;

    const mockApplicationRef = {
      tick: vi.fn()
    } as unknown as ApplicationRef;

    component = new PrayerTypesManagerComponent(
      mockSupabaseService,
      mockToastService,
      mockPromptService,
      mockChangeDetectorRef,
      mockApplicationRef
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial state', () => {
    expect(component.types).toEqual([]);
    expect(component.loading).toBe(false);
    expect(component.showAddForm).toBe(false);
    expect(component.error).toBeNull();
    expect(component.success).toBeNull();
    expect(component.editingType).toBeNull();
  });

  describe('onSectionToggle', () => {
    it('fetches types on first expand only', () => {
      const spy = vi.spyOn(component, 'fetchTypes');
      component.onSectionToggle();
      expect(spy).toHaveBeenCalledTimes(1);
      component.onSectionToggle();
      component.onSectionToggle();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchTypes', () => {
    it('should fetch prayer types successfully', async () => {
      const mockTypes = [
        createMockPrayerType({ id: '1', name: 'Healing' }),
        createMockPrayerType({ id: '2', name: 'Guidance' })
      ];

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: mockTypes, error: null }));

      await component.fetchTypes();

      expect(component.types).toEqual(mockTypes);
      expect(component.loading).toBe(false);
      expect(component.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      const error = new Error('Fetch failed');
      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: null, error }));

      await component.fetchTypes();

      expect(component.types).toEqual([]);
      expect(component.loading).toBe(false);
      expect(component.error).toBe('Fetch failed');
    });

    it('should handle single item response', async () => {
      const mockType = createMockPrayerType();
      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: mockType, error: null }));

      await component.fetchTypes();

      expect(component.types).toEqual([mockType]);
    });

    it('should handle null data response', async () => {
      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: null, error: null }));

      await component.fetchTypes();

      expect(component.types).toEqual([]);
    });

    it('should handle error without message property', async () => {
      const error = { code: 'UNKNOWN' };
      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: null, error }));

      await component.fetchTypes();

      expect(component.error).toBe('Unknown error');
    });
  });

  describe('toggleAddForm', () => {
    it('should toggle showAddForm', () => {
      component.showAddForm = false;
      component.toggleAddForm();
      expect(component.showAddForm).toBe(true);

      component.toggleAddForm();
      expect(component.showAddForm).toBe(false);
    });

    it('should clear editing state and messages when opening add form', () => {
      component.editingType = createMockPrayerType({ id: 'some-id' });
      component.error = 'Some error';
      component.success = 'Some success';

      component.toggleAddForm();

      expect(component.editingType).toBeNull();
      expect(component.error).toBeNull();
      expect(component.success).toBeNull();
      expect(component.showAddForm).toBe(true);
    });
  });



  describe('handleEdit', () => {
    it('should set editing type and open form', () => {
      const type = createMockPrayerType({
        id: 'type-1',
        name: 'Test Type',
        display_order: 5,
        is_active: false,
      });

      component.handleEdit(type);

      expect(component.editingType).toEqual(type);
      expect(component.showAddForm).toBe(true);
    });

    it('should clear error and success messages', () => {
      const type = createMockPrayerType();
      component.error = 'Some error';
      component.success = 'Some success';

      component.handleEdit(type);

      expect(component.error).toBeNull();
      expect(component.success).toBeNull();
    });
  });

  describe('handleDelete', () => {
    it('should not delete if user cancels confirmation', async () => {
      await component.handleDelete('type-1', 'Test Type');
      expect(component.showConfirmationDialog).toBe(true);

      await component.onConfirmationCancel();

      expect(component.showConfirmationDialog).toBe(false);
    });

    it('should delete prayer type successfully', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      await component.handleDelete('type-1', 'Test Type');
      await component.onConfirmationConfirm();

      expect(component.success).toBe('Prayer type deleted successfully!');
      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      const error = new Error('Delete failed');

      mockSupabaseClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error }))
        }))
      }));

      await component.handleDelete('type-1', 'Test Type');
      await component.onConfirmationConfirm();

      expect(component.error).toBe('Delete failed');
    });

    it('should display confirmation with type name', async () => {
      await component.handleDelete('type-1', 'Healing');

      expect(component.confirmationKind).toBe('delete');
      expect(component.confirmationMessage).toContain('"Healing"');
      expect(component.showConfirmationDialog).toBe(true);
    });
  });

  describe('toggleActive', () => {
    it('should toggle is_active to false', async () => {
      const type = createMockPrayerType({ id: 'type-1', is_active: true });

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      await component.toggleActive(type);

      expect(component.success).toBe('Prayer type deactivated successfully!');
      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
    });

    it('should toggle is_active to true', async () => {
      const type = createMockPrayerType({ id: 'type-1', is_active: false });

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      await component.toggleActive(type);

      expect(component.success).toBe('Prayer type activated successfully!');
    });

    it('should handle toggle error', async () => {
      const type = createMockPrayerType({ id: 'type-1', is_active: true });
      const error = new Error('Toggle failed');

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error }))
        }))
      }));

      await component.toggleActive(type);

      expect(component.error).toBe('Toggle failed');
    });
  });

  describe('beginIncludeInBookletToggle', () => {
    it('should open confirmation and apply toggle on confirm', async () => {
      const type = createMockPrayerType({ id: 'type-1', include_in_booklet: false });

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      component.beginIncludeInBookletToggle(type);
      expect(component.showConfirmationDialog).toBe(true);
      expect(component.confirmationKind).toBe('toggleBooklet');

      await component.onConfirmationConfirm();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayer_types');
      expect(mockSupabaseService.directQuery).toHaveBeenCalled();
    });
  });

  describe('beginActiveToggle', () => {
    it('should open confirmation and apply active toggle on confirm', async () => {
      const type = createMockPrayerType({ id: 'type-1', is_active: true });

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      component.beginActiveToggle(type);
      expect(component.showConfirmationDialog).toBe(true);
      expect(component.confirmationKind).toBe('toggleActive');

      await component.onConfirmationConfirm();

      expect(component.success).toBe('Prayer type deactivated successfully!');
      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
    });
  });

  describe('toggleIncludeInBooklet', () => {
    it('should flip include_in_booklet and refresh types', async () => {
      const type = createMockPrayerType({ id: 'type-1', include_in_booklet: false });

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      await component.toggleIncludeInBooklet(type);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayer_types');
      expect(mockSupabaseService.directQuery).toHaveBeenCalled();
    });

    it('should surface update errors', async () => {
      const type = createMockPrayerType({ include_in_booklet: false });
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: { message: 'nope' } }))
        }))
      }));

      await component.toggleIncludeInBooklet(type);

      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('onDrop', () => {
    it('should not reorder if position unchanged', async () => {
      const event = {
        previousIndex: 2,
        currentIndex: 2
      } as any;

      await component.onDrop(event);

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should reorder prayer types successfully', async () => {
      const types = [
        createMockPrayerType({ id: '1', name: 'Type 1', display_order: 0 }),
        createMockPrayerType({ id: '2', name: 'Type 2', display_order: 1 }),
        createMockPrayerType({ id: '3', name: 'Type 3', display_order: 2 })
      ];

      component.types = [...types];

      const event = {
        previousIndex: 0,
        currentIndex: 2
      } as any;

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: types, error: null }));

      await component.onDrop(event);

      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
      expect(component.reordering).toBe(false);
    });

    it('should handle reorder error and revert changes', async () => {
      const types = [
        createMockPrayerType({ id: '1', name: 'Type 1' }),
        createMockPrayerType({ id: '2', name: 'Type 2' })
      ];

      const originalTypes = [...types];
      component.types = [...types];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      const error = new Error('Reorder failed');
      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error }))
        }))
      }));

      await component.onDrop(event);

      expect(component.error).toBe('Reorder failed');
      expect(component.types).toEqual(originalTypes);
    });

    it('should update all types with new display_order', async () => {
      const types = [
        createMockPrayerType({ id: '1', display_order: 0 }),
        createMockPrayerType({ id: '2', display_order: 1 })
      ];

      component.types = [...types];

      const event = {
        previousIndex: 1,
        currentIndex: 0
      } as any;

      const updateSpy = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }));

      mockSupabaseClient.from = vi.fn(() => ({
        update: updateSpy
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: types, error: null }));

      await component.onDrop(event);

      // Should update both types
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('closeTypeForm', () => {
    it('should reset editing state', () => {
      component.showAddForm = true;
      component.editingType = createMockPrayerType({ id: 'type-1' });
      component.error = 'Error';

      component.closeTypeForm();

      expect(component.showAddForm).toBe(false);
      expect(component.editingType).toBeNull();
      expect(component.error).toBeNull();
    });
  });



  describe('getActiveCount', () => {
    it('should return count of active types', () => {
      component.types = [
        createMockPrayerType({ is_active: true }),
        createMockPrayerType({ is_active: false }),
        createMockPrayerType({ is_active: true }),
        createMockPrayerType({ is_active: true })
      ];

      expect(component.getActiveCount()).toBe(3);
    });

    it('should return 0 for empty types array', () => {
      component.types = [];
      expect(component.getActiveCount()).toBe(0);
    });

    it('should return 0 when all types are inactive', () => {
      component.types = [
        createMockPrayerType({ is_active: false }),
        createMockPrayerType({ is_active: false })
      ];

      expect(component.getActiveCount()).toBe(0);
    });
  });
});
