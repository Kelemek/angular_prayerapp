import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
      success: vi.fn()
    };

    component = new PromptManagerComponent(
      mockSupabaseService,
      mockToastService
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should fetch prayer types on init', async () => {
      const mockTypes = [
        { name: 'Type1', display_order: 1, is_active: true },
        { name: 'Type2', display_order: 2, is_active: true }
      ];

      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockTypes,
        error: null
      });

      await component.ngOnInit();

      expect(mockSupabaseService.directQuery).toHaveBeenCalledWith(
        'prayer_types',
        expect.objectContaining({
          select: '*',
          eq: { is_active: true },
          order: { column: 'display_order', ascending: true }
        })
      );
      expect(component.prayerTypes).toEqual(mockTypes);
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
      expect(component.type).toBe('Prayer');
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

    it('should not update type if type is already set', async () => {
      component.type = 'ExistingType';
      
      const mockTypes = [
        { name: 'Type1', display_order: 1, is_active: true }
      ];

      mockSupabaseService.directQuery.mockResolvedValue({
        data: mockTypes,
        error: null
      });

      await component.fetchPrayerTypes();

      expect(component.type).toBe('ExistingType');
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
      await component.handleSearch(new Event('submit'));

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
      await component.handleSearch(new Event('submit'));

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
      await component.handleSearch(new Event('submit'));

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
      await component.handleSearch(new Event('submit'));

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
      await component.handleSearch(new Event('submit'));

      expect(component.prompts).toHaveLength(2);
    });

    it('should handle errors during search', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseService.directQuery.mockResolvedValue({
        data: null,
        error: new Error('Search failed')
      });

      await component.handleSearch(new Event('submit'));

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

      await component.handleSearch(new Event('submit'));

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

    it('should clear messages and csv data', () => {
      component.error = 'Error';
      component.success = 'Success';
      component.csvData = [{ title: 'test', type: 'test', description: 'test', valid: true }];
      
      component.toggleCSVUpload();
      
      expect(component.error).toBeNull();
      expect(component.success).toBeNull();
      expect(component.csvData).toEqual([]);
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

    it('should reset form fields', () => {
      component.title = 'Old title';
      component.description = 'Old description';
      component.editingId = 'some-id';
      component.prayerTypes = [{ name: 'Prayer', display_order: 1, is_active: true }];
      
      component.toggleAddForm();
      
      expect(component.title).toBe('');
      expect(component.description).toBe('');
      expect(component.editingId).toBeNull();
      expect(component.type).toBe('Prayer');
    });
  });

  describe('handleCSVUpload', () => {
    it('should parse valid CSV file', () => {
      const csvContent = 'title,type,description\nPrayer1,Prayer,Desc1\nPrayer2,Praise,Desc2';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });
      
      component.prayerTypes = [
        { name: 'Prayer', display_order: 1, is_active: true },
        { name: 'Praise', display_order: 2, is_active: true }
      ];

      const event = {
        target: {
          files: [file]
        }
      } as any;

      component.handleCSVUpload(event);

      // Wait for FileReader to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(component.csvData).toHaveLength(2);
          expect(component.csvData[0].valid).toBe(true);
          expect(component.csvData[1].valid).toBe(true);
          resolve();
        }, 100);
      });
    });

    it('should validate CSV data and mark invalid rows', () => {
      const csvContent = 'title,type,description\nPrayer1,Prayer,Desc1\n,Prayer,Desc2\nPrayer3,InvalidType,Desc3';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });
      
      component.prayerTypes = [
        { name: 'Prayer', display_order: 1, is_active: true }
      ];

      const event = {
        target: {
          files: [file]
        }
      } as any;

      component.handleCSVUpload(event);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(component.csvData).toHaveLength(3);
          expect(component.csvData[0].valid).toBe(true);
          expect(component.csvData[1].valid).toBe(false);
          expect(component.csvData[1].error).toBe('Missing title');
          expect(component.csvData[2].valid).toBe(false);
          expect(component.csvData[2].error).toContain('Invalid type');
          resolve();
        }, 100);
      });
    });

    it('should handle CSV with missing columns', () => {
      const csvContent = 'title,description\nPrayer1,Desc1';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });

      const event = {
        target: {
          files: [file]
        }
      } as any;

      component.handleCSVUpload(event);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(component.error).toBe('CSV must have columns: title, type, description');
          resolve();
        }, 100);
      });
    });

    it('should handle empty CSV file', () => {
      const csvContent = 'title,type,description';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });

      const event = {
        target: {
          files: [file]
        }
      } as any;

      component.handleCSVUpload(event);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(component.error).toBe('CSV file must have at least a header row and one data row');
          resolve();
        }, 100);
      });
    });

    it('should return early if no file is selected', () => {
      const event = {
        target: {
          files: []
        }
      } as any;

      component.handleCSVUpload(event);

      expect(component.csvData).toEqual([]);
    });

    it('should mark row as invalid when type is missing', () => {
      const csvContent = 'title,type,description\nPrayer1,,Desc1';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });
      
      component.prayerTypes = [
        { name: 'Prayer', display_order: 1, is_active: true }
      ];

      const event = {
        target: {
          files: [file]
        }
      } as any;

      component.handleCSVUpload(event);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(component.csvData).toHaveLength(1);
          expect(component.csvData[0].valid).toBe(false);
          expect(component.csvData[0].error).toBe('Missing type');
          resolve();
        }, 100);
      });
    });

    it('should mark row as invalid when description is missing', () => {
      const csvContent = 'title,type,description\nPrayer1,Prayer,';
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });
      
      component.prayerTypes = [
        { name: 'Prayer', display_order: 1, is_active: true }
      ];

      const event = {
        target: {
          files: [file]
        }
      } as any;

      component.handleCSVUpload(event);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(component.csvData).toHaveLength(1);
          expect(component.csvData[0].valid).toBe(false);
          expect(component.csvData[0].error).toBe('Missing description');
          resolve();
        }, 100);
      });
    });
  });

  describe('uploadCSVData', () => {
    it('should upload valid CSV rows', async () => {
      component.csvData = [
        { title: 'Prayer1', type: 'Prayer', description: 'Desc1', valid: true },
        { title: 'Prayer2', type: 'Praise', description: 'Desc2', valid: true },
        { title: '', type: 'Prayer', description: 'Desc3', valid: false }
      ];

      await component.uploadCSVData();

      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('prayer_prompts');
      expect(component.success).toContain('Successfully uploaded 2 prompt(s)');
      expect(component.csvData).toEqual([]);
      expect(component.showCSVUpload).toBe(false);
    });

    it('should return early if no valid rows', async () => {
      component.csvData = [
        { title: '', type: 'Prayer', description: 'Desc1', valid: false }
      ];

      await component.uploadCSVData();

      expect(mockSupabaseService.client.from).not.toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      component.csvData = [
        { title: 'Prayer1', type: 'Prayer', description: 'Desc1', valid: true }
      ];

      mockSupabaseService.client.from.mockReturnValue({
        insert: vi.fn(() => Promise.resolve({ data: null, error: new Error('Upload failed') }))
      });

      await component.uploadCSVData();

      expect(component.error).toContain('Failed to upload CSV');
      expect(component.uploadingCSV).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should refresh search results if already searched', async () => {
      component.hasSearched = true;
      component.csvData = [
        { title: 'Prayer1', type: 'Prayer', description: 'Desc1', valid: true }
      ];

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [],
        error: null
      });

      await component.uploadCSVData();

      expect(mockSupabaseService.directQuery).toHaveBeenCalled();
    });

    it('should emit onSave event', async () => {
      const emitSpy = vi.spyOn(component.onSave, 'emit');
      
      component.csvData = [
        { title: 'Prayer1', type: 'Prayer', description: 'Desc1', valid: true }
      ];

      await component.uploadCSVData();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('handleSubmit', () => {
    it('should add new prompt', async () => {
      component.title = 'New Prayer';
      component.type = 'Prayer';
      component.description = 'New description';

      await component.handleSubmit(new Event('submit'));

      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('prayer_prompts');
      expect(component.success).toBe('Prayer prompt added successfully!');
      expect(component.showAddForm).toBe(false);
    });

    it('should update existing prompt', async () => {
      component.editingId = 'prompt-123';
      component.title = 'Updated Prayer';
      component.type = 'Prayer';
      component.description = 'Updated description';

      await component.handleSubmit(new Event('submit'));

      expect(component.success).toBe('Prayer prompt updated successfully!');
      expect(component.editingId).toBeNull();
    });

    it('should validate required fields', async () => {
      component.title = '';
      component.type = 'Prayer';
      component.description = 'Description';

      await component.handleSubmit(new Event('submit'));

      expect(component.error).toBe('All fields are required');
    });

    it('should trim whitespace from fields', async () => {
      component.title = '  Prayer Title  ';
      component.type = 'Prayer';
      component.description = '  Description  ';

      let insertData: any;
      mockSupabaseService.client.from.mockReturnValue({
        insert: vi.fn((data: any) => {
          insertData = data;
          return Promise.resolve({ data: null, error: null });
        })
      });

      await component.handleSubmit(new Event('submit'));

      expect(insertData.title).toBe('Prayer Title');
      expect(insertData.description).toBe('Description');
    });

    it('should handle submit errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      component.title = 'Prayer';
      component.type = 'Prayer';
      component.description = 'Description';

      mockSupabaseService.client.from.mockReturnValue({
        insert: vi.fn(() => Promise.resolve({ data: null, error: new Error('Insert failed') }))
      });

      await component.handleSubmit(new Event('submit'));

      expect(component.error).toContain('Failed to save prayer prompt');
      expect(component.submitting).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should reset form after successful submission', async () => {
      component.prayerTypes = [{ name: 'Prayer', display_order: 1, is_active: true }];
      component.title = 'Prayer';
      component.type = 'Prayer';
      component.description = 'Description';

      await component.handleSubmit(new Event('submit'));

      expect(component.title).toBe('');
      expect(component.description).toBe('');
      expect(component.type).toBe('Prayer');
    });

    it('should emit onSave event after submission', async () => {
      const emitSpy = vi.spyOn(component.onSave, 'emit');
      
      component.title = 'Prayer';
      component.type = 'Prayer';
      component.description = 'Description';

      await component.handleSubmit(new Event('submit'));

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should refresh search results after submission if user has searched', async () => {
      component.title = 'Prayer';
      component.type = 'Prayer';
      component.description = 'Description';
      component.hasSearched = true;

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [],
        error: null
      });

      await component.handleSubmit(new Event('submit'));

      // Check that directQuery was called (for handleSearch)
      expect(mockSupabaseService.directQuery).toHaveBeenCalled();
    });
  });

  describe('handleEdit', () => {
    it('should populate form with prompt data', () => {
      const prompt = {
        id: 'prompt-123',
        title: 'Test Prayer',
        type: 'Prayer',
        description: 'Test description',
        created_at: '2024-01-01'
      };

      component.handleEdit(prompt);

      expect(component.title).toBe('Test Prayer');
      expect(component.type).toBe('Prayer');
      expect(component.description).toBe('Test description');
      expect(component.editingId).toBe('prompt-123');
      expect(component.showAddForm).toBe(false);
      expect(component.showCSVUpload).toBe(false);
    });

    it('should clear messages when editing', () => {
      const prompt = {
        id: 'prompt-123',
        title: 'Test',
        type: 'Prayer',
        description: 'Desc',
        created_at: '2024-01-01'
      };

      component.error = 'Error';
      component.success = 'Success';

      component.handleEdit(prompt);

      expect(component.error).toBeNull();
      expect(component.success).toBeNull();
    });
  });

  describe('handleDelete', () => {
    it('should delete prompt after confirmation', async () => {
      vi.stubGlobal('confirm', vi.fn(() => true));

      await component.handleDelete('prompt-123', 'Test Prayer');

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "Test Prayer"?');
      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('prayer_prompts');
      expect(component.success).toBe('Prayer prompt deleted successfully!');
      
      vi.unstubAllGlobals();
    });

    it('should not delete if user cancels', async () => {
      vi.stubGlobal('confirm', vi.fn(() => false));

      await component.handleDelete('prompt-123', 'Test Prayer');

      expect(mockSupabaseService.client.from).not.toHaveBeenCalled();
      
      vi.unstubAllGlobals();
    });

    it('should handle delete errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.stubGlobal('confirm', vi.fn(() => true));

      mockSupabaseService.client.from.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: new Error('Delete failed') }))
        }))
      });

      await component.handleDelete('prompt-123', 'Test Prayer');

      expect(component.error).toContain('Failed to delete prompt');
      
      consoleSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it('should refresh search results after deletion', async () => {
      vi.stubGlobal('confirm', vi.fn(() => true));
      component.hasSearched = true;

      mockSupabaseService.directQuery.mockResolvedValue({
        data: [],
        error: null
      });

      await component.handleDelete('prompt-123', 'Test Prayer');

      expect(mockSupabaseService.directQuery).toHaveBeenCalled();
      
      vi.unstubAllGlobals();
    });
  });

  describe('cancelEdit', () => {
    it('should reset form state', () => {
      component.prayerTypes = [{ name: 'Prayer', display_order: 1, is_active: true }];
      component.showAddForm = true;
      component.editingId = 'prompt-123';
      component.title = 'Test';
      component.description = 'Desc';
      component.error = 'Error';

      component.cancelEdit();

      expect(component.showAddForm).toBe(false);
      expect(component.editingId).toBeNull();
      expect(component.title).toBe('');
      expect(component.description).toBe('');
      expect(component.type).toBe('Prayer');
      expect(component.error).toBeNull();
    });
  });

  describe('formatDate', () => {
    it('should format date string to locale date', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = component.formatDate(dateString);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('getValidTypeNames', () => {
    it('should return comma-separated type names', () => {
      component.prayerTypes = [
        { name: 'Prayer', display_order: 1, is_active: true },
        { name: 'Praise', display_order: 2, is_active: true },
        { name: 'Thanks', display_order: 3, is_active: true }
      ];

      const result = component.getValidTypeNames();

      expect(result).toBe('Prayer, Praise, Thanks');
    });

    it('should return "Loading..." if no types', () => {
      component.prayerTypes = [];
      
      const result = component.getValidTypeNames();
      
      expect(result).toBe('Loading...');
    });
  });

  describe('getValidRowCount', () => {
    it('should count valid CSV rows', () => {
      component.csvData = [
        { title: 'P1', type: 'Prayer', description: 'D1', valid: true },
        { title: '', type: 'Prayer', description: 'D2', valid: false },
        { title: 'P3', type: 'Praise', description: 'D3', valid: true }
      ];

      const count = component.getValidRowCount();

      expect(count).toBe(2);
    });

    it('should return 0 if no valid rows', () => {
      component.csvData = [
        { title: '', type: 'Prayer', description: 'D1', valid: false }
      ];

      const count = component.getValidRowCount();

      expect(count).toBe(0);
    });
  });

  describe('getInvalidRowCount', () => {
    it('should count invalid CSV rows', () => {
      component.csvData = [
        { title: 'P1', type: 'Prayer', description: 'D1', valid: true },
        { title: '', type: 'Prayer', description: 'D2', valid: false },
        { title: '', type: 'Praise', description: 'D3', valid: false }
      ];

      const count = component.getInvalidRowCount();

      expect(count).toBe(2);
    });

    it('should return 0 if no invalid rows', () => {
      component.csvData = [
        { title: 'P1', type: 'Prayer', description: 'D1', valid: true }
      ];

      const count = component.getInvalidRowCount();

      expect(count).toBe(0);
    });
  });
});
