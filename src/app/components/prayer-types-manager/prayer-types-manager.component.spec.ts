import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

  const createMockPrayerType = (overrides: Partial<PrayerTypeRecord> = {}): PrayerTypeRecord => ({
    id: 'type-1',
    name: 'Healing',
    display_order: 0,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
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

    component = new PrayerTypesManagerComponent(mockSupabaseService, mockToastService, mockPromptService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial state', () => {
    expect(component.types).toEqual([]);
    expect(component.loading).toBe(true);
    expect(component.showAddForm).toBe(false);
    expect(component.error).toBeNull();
    expect(component.success).toBeNull();
    expect(component.editingId).toBeNull();
    expect(component.name).toBe('');
    expect(component.displayOrder).toBe(0);
    expect(component.isActive).toBe(true);
  });

  describe('ngOnInit', () => {
    it('should fetch types on initialization', () => {
      const spy = vi.spyOn(component, 'fetchTypes');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
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

    it('should reset form fields', () => {
      component.editingId = 'some-id';
      component.name = 'Test Name';
      component.displayOrder = 5;
      component.isActive = false;
      component.error = 'Some error';
      component.success = 'Some success';

      component.toggleAddForm();

      expect(component.editingId).toBeNull();
      expect(component.name).toBe('');
      expect(component.displayOrder).toBe(0);
      expect(component.isActive).toBe(true);
      expect(component.error).toBeNull();
      expect(component.success).toBeNull();
    });
  });

  describe('handleSubmit', () => {
    it('should show error if name is empty', async () => {
      const event = new Event('submit');
      component.name = '';

      await component.handleSubmit(event);

      expect(component.error).toBe('Please enter a type name');
    });

    it('should show error if name is only whitespace', async () => {
      const event = new Event('submit');
      component.name = '   ';

      await component.handleSubmit(event);

      expect(component.error).toBe('Please enter a type name');
    });

    it('should add new prayer type successfully', async () => {
      const event = new Event('submit');
      component.name = 'New Type';
      component.displayOrder = 5;
      component.isActive = true;

      mockSupabaseClient.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      await component.handleSubmit(event);

      expect(component.success).toBe('Prayer type added successfully!');
      expect(component.showAddForm).toBe(false);
      expect(component.name).toBe('');
      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
    });

    it('should update existing prayer type successfully', async () => {
      const event = new Event('submit');
      component.editingId = 'type-1';
      component.name = 'Updated Type';
      component.displayOrder = 3;
      component.isActive = false;

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      await component.handleSubmit(event);

      expect(component.success).toBe('Prayer type updated successfully!');
      expect(component.showAddForm).toBe(false);
      expect(component.editingId).toBeNull();
      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
    });

    it('should handle insert error', async () => {
      const event = new Event('submit');
      component.name = 'New Type';
      const error = new Error('Insert failed');

      mockSupabaseClient.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error }))
      }));

      await component.handleSubmit(event);

      expect(component.error).toBe('Failed to save prayer type: Insert failed');
      // Form is reset even on error per the component's finally block
      expect(component.showAddForm).toBe(false);
    });

    it('should handle update error', async () => {
      const event = new Event('submit');
      component.editingId = 'type-1';
      component.name = 'Updated Type';
      const error = new Error('Update failed');

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error }))
        }))
      }));

      await component.handleSubmit(event);

      expect(component.error).toBe('Failed to save prayer type: Update failed');
    });

    it('should trim whitespace from name', async () => {
      const event = new Event('submit');
      component.name = '  Trimmed Name  ';
      
      const insertSpy = vi.fn(() => Promise.resolve({ error: null }));
      mockSupabaseClient.from = vi.fn(() => ({
        insert: insertSpy
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      await component.handleSubmit(event);

      expect(insertSpy).toHaveBeenCalledWith({
        name: 'Trimmed Name',
        display_order: 0,
        is_active: true
      });
    });

    it('should emit onSave event', async () => {
      const event = new Event('submit');
      component.name = 'New Type';
      const emitSpy = vi.spyOn(component.onSave, 'emit');

      mockSupabaseClient.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      await component.handleSubmit(event);

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('handleEdit', () => {
    it('should populate form fields with type data', () => {
      const type = createMockPrayerType({
        id: 'type-1',
        name: 'Test Type',
        display_order: 5,
        is_active: false
      });

      component.handleEdit(type);

      expect(component.name).toBe('Test Type');
      expect(component.displayOrder).toBe(5);
      expect(component.isActive).toBe(false);
      expect(component.editingId).toBe('type-1');
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
      vi.stubGlobal('confirm', () => false);

      await component.handleDelete('type-1', 'Test Type');

      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should delete prayer type successfully', async () => {
      vi.stubGlobal('confirm', () => true);

      mockSupabaseClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }));

      mockSupabaseService.directQuery = vi.fn(() => Promise.resolve({ data: [], error: null }));

      await component.handleDelete('type-1', 'Test Type');

      expect(component.success).toBe('Prayer type deleted successfully!');
      expect(mockPromptService.loadPrompts).toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      vi.stubGlobal('confirm', () => true);
      const error = new Error('Delete failed');

      mockSupabaseClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error }))
        }))
      }));

      await component.handleDelete('type-1', 'Test Type');

      expect(component.error).toBe('Delete failed');
    });

    it('should display confirmation with type name', async () => {
      const confirmSpy = vi.fn(() => false);
      vi.stubGlobal('confirm', confirmSpy);

      await component.handleDelete('type-1', 'Healing');

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('"Healing"')
      );
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

  describe('cancelEdit', () => {
    it('should reset form state', () => {
      component.showAddForm = true;
      component.editingId = 'type-1';
      component.name = 'Test';
      component.displayOrder = 5;
      component.isActive = false;
      component.error = 'Error';

      component.cancelEdit();

      expect(component.showAddForm).toBe(false);
      expect(component.editingId).toBeNull();
      expect(component.name).toBe('');
      expect(component.displayOrder).toBe(0);
      expect(component.isActive).toBe(true);
      expect(component.error).toBeNull();
    });
  });

  describe('formatDate', () => {
    it('should format date string', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const formatted = component.formatDate(dateString);
      
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // MM/DD/YYYY or similar
    });

    it('should handle different date formats', () => {
      const dateString = '2024-12-25';
      const formatted = component.formatDate(dateString);
      
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
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
