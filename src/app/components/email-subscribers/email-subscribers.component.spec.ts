import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailSubscribersComponent } from './email-subscribers.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef } from '@angular/core';
import * as planningCenter from '../../../lib/planning-center';

vi.mock('../../../lib/planning-center', () => ({
  lookupPersonByEmail: vi.fn(),
  batchLookupPlanningCenter: vi.fn()
}));

describe('EmailSubscribersComponent', () => {
  let component: EmailSubscribersComponent;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockChangeDetectorRef: any;

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
      warning: vi.fn()
    };

    mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn()
    };

    component = new EmailSubscribersComponent(
      mockSupabaseService,
      mockToastService,
      mockChangeDetectorRef
    );
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
      expect(component.csvData).toEqual([]);
      expect(component.uploadingCSV).toBe(false);
      expect(component.newName).toBe('');
      expect(component.newEmail).toBe('');
      expect(component.submitting).toBe(false);
      expect(component.error).toBeNull();
      expect(component.csvSuccess).toBeNull();
      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(10);
      expect(component.totalItems).toBe(0);
      expect(component.allSubscribers).toEqual([]);
    });
  });

  describe('ngOnInit', () => {
    it('should call handleSearch', () => {
      const spy = vi.spyOn(component, 'handleSearch');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
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

    it('should reset form fields', () => {
      component.newName = 'Test';
      component.newEmail = 'test@example.com';
      component.toggleAddForm();
      expect(component.newName).toBe('');
      expect(component.newEmail).toBe('');
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

    it('should reset CSV data', () => {
      component.csvData = [{ name: 'Test', email: 'test@example.com', valid: true }];
      component.toggleCSVUpload();
      expect(component.csvData).toEqual([]);
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

      const range = component.getPaginationRange();
      expect(range.length).toBeLessThanOrEqual(5);
      expect(range[0]).toBe(1);
    });
  });

  describe('handleAddSubscriber', () => {
    it('should not add subscriber with empty fields', async () => {
      component.newName = '';
      component.newEmail = '';

      await component.handleAddSubscriber();

      expect(component.error).toBe('Name and email are required');
    });

    it('should not add existing subscriber', async () => {
      component.newName = 'John Doe';
      component.newEmail = 'john@example.com';

      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: mockSubscriber,
        error: null
      });

      await component.handleAddSubscriber();

      expect(component.error).toBe('This email address is already subscribed');
    });

    it('should add new subscriber successfully', async () => {
      component.newName = 'Jane Doe';
      component.newEmail = 'jane@example.com';

      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      // Mock Planning Center lookup
      vi.mocked(planningCenter.lookupPersonByEmail).mockResolvedValue({
        people: [{
          id: '123',
          type: 'Person',
          attributes: {
            first_name: 'Jane',
            last_name: 'Doe',
            name: 'Jane Doe',
            avatar: '',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }],
        count: 1
      });

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.client.from().insert = insertSpy;

      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.handleAddSubscriber();

      expect(component.csvSuccess).toBe('Subscriber added successfully!');
      expect(component.showAddForm).toBe(false);
      expect(searchSpy).toHaveBeenCalled();
      expect(planningCenter.lookupPersonByEmail).toHaveBeenCalledWith(
        'jane@example.com',
        expect.any(String),
        expect.any(String)
      );
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          email: 'jane@example.com',
          is_active: true,
          is_admin: false,
          receive_admin_emails: false,
          in_planning_center: true,
          planning_center_checked_at: expect.any(String)
        })
      );
    });

    it('should handle add subscriber error', async () => {
      component.newName = 'Jane Doe';
      component.newEmail = 'jane@example.com';

      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      mockSupabaseService.client.from().insert.mockResolvedValue({
        error: new Error('Insert failed')
      });

      await component.handleAddSubscriber();

      expect(component.error).toBe('Insert failed');
    });

    it('should handle Planning Center lookup failure gracefully', async () => {
      component.newName = 'Jane Doe';
      component.newEmail = 'jane@example.com';

      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      // Mock Planning Center lookup to fail
      vi.mocked(planningCenter.lookupPersonByEmail).mockRejectedValue(new Error('PC API down'));

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.client.from().insert = insertSpy;

      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.handleAddSubscriber();

      // Should still succeed with null Planning Center values
      expect(component.csvSuccess).toBe('Subscriber added successfully!');
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          in_planning_center: null,
          planning_center_checked_at: null
        })
      );
    });
  });

  describe('handleToggleActive', () => {
    it('should toggle active status', async () => {
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.handleToggleActive('123', true);

      expect(mockToastService.success).toHaveBeenCalled();
      expect(searchSpy).toHaveBeenCalled();
    });

    it('should handle toggle error', async () => {
      mockSupabaseService.client.from().update().eq.mockResolvedValue({
        error: new Error('Update failed')
      });

      await component.handleToggleActive('123', true);

      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('handleToggleBlocked', () => {
    it('should toggle blocked status', async () => {
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.handleToggleBlocked('123', false);

      expect(mockToastService.success).toHaveBeenCalled();
      expect(searchSpy).toHaveBeenCalled();
    });

    it('should handle toggle error', async () => {
      mockSupabaseService.client.from().update().eq.mockResolvedValue({
        error: new Error('Update failed')
      });

      await component.handleToggleBlocked('123', false);

      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('handleDelete', () => {
    beforeEach(() => {
      global.confirm = vi.fn().mockReturnValue(true);
    });

    it('should not delete if user cancels', async () => {
      (global.confirm as any).mockReturnValue(false);

      await component.handleDelete('123', 'john@example.com');

      expect(mockSupabaseService.client.from().delete).not.toHaveBeenCalled();
    });

    it('should deactivate admin subscriber', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { is_admin: true },
        error: null
      });

      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.handleDelete('123', 'john@example.com');

      expect(component.csvSuccess).toContain('admin');
      expect(searchSpy).toHaveBeenCalled();
    });

    it('should delete non-admin subscriber', async () => {
      mockSupabaseService.client.from().select().eq().maybeSingle.mockResolvedValue({
        data: { is_admin: false },
        error: null
      });

      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.handleDelete('123', 'john@example.com');

      expect(mockToastService.success).toHaveBeenCalled();
      expect(searchSpy).toHaveBeenCalled();
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

  describe('CSV handling', () => {
    it('should get valid rows count', () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true },
        { name: 'Jane', email: 'invalid', valid: false }
      ];

      expect(component.getValidRowsCount()).toBe(1);
    });

    it('should get invalid rows count', () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true },
        { name: 'Jane', email: 'invalid', valid: false },
        { name: 'Bob', email: 'also-invalid', valid: false }
      ];

      expect(component.getInvalidRowsCount()).toBe(2);
    });

    it('should upload CSV data successfully', async () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true },
        { name: 'Jane', email: 'jane@example.com', valid: true }
      ];

      mockSupabaseService.client.from().select().in.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock batched Planning Center lookups
      vi.mocked(planningCenter.batchLookupPlanningCenter).mockResolvedValue([
        {
          email: 'john@example.com',
          result: { people: [], count: 0 },
          retries: 0,
          failed: false
        },
        {
          email: 'jane@example.com',
          result: { people: [], count: 0 },
          retries: 0,
          failed: false
        }
      ]);

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.client.from().insert = insertSpy;

      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.uploadCSVData();

      expect(component.csvSuccess).toContain('Successfully added');
      expect(searchSpy).toHaveBeenCalled();
      expect(planningCenter.batchLookupPlanningCenter).toHaveBeenCalled();
      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            receive_admin_emails: false,
            in_planning_center: false,
            planning_center_checked_at: expect.any(String)
          })
        ])
      );
    });

    it('should handle duplicate emails in CSV upload', async () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true }
      ];

      mockSupabaseService.client.from().select().in.mockResolvedValue({
        data: [{ email: 'john@example.com' }],
        error: null
      });

      await component.uploadCSVData();

      expect(component.error).toBe('All email addresses are already subscribed');
    });

    it('should handle CSV upload error', async () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true }
      ];

      mockSupabaseService.client.from().select().in.mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabaseService.client.from().insert.mockResolvedValue({
        error: new Error('Insert failed')
      });

      await component.uploadCSVData();

      expect(component.error).toBe('Insert failed');
    });

    it('should handle CSV upload with Planning Center lookup failures gracefully', async () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true },
        { name: 'Jane', email: 'jane@example.com', valid: true }
      ];

      mockSupabaseService.client.from().select().in.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock Planning Center batch lookup to return some failures
      vi.mocked(planningCenter.batchLookupPlanningCenter).mockResolvedValue([
        {
          email: 'john@example.com',
          result: { people: [], count: 0, error: 'API timeout' },
          retries: 3,
          failed: true
        },
        {
          email: 'jane@example.com',
          result: { people: [], count: 0 },
          retries: 0,
          failed: false
        }
      ]);

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.client.from().insert = insertSpy;

      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.uploadCSVData();

      // Should still succeed despite Planning Center check failures
      expect(component.csvSuccess).toContain('Successfully added');
      expect(component.csvImportWarnings.length).toBeGreaterThan(0);
      expect(insertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            in_planning_center: null,
            planning_center_checked_at: null,
            receive_admin_emails: false
          })
        ])
      );
    });

    it('should show warning for failed Planning Center checks', async () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true },
        { name: 'Jane', email: 'jane@example.com', valid: true },
        { name: 'Bob', email: 'bob@example.com', valid: true }
      ];

      mockSupabaseService.client.from().select().in.mockResolvedValue({
        data: [],
        error: null
      });

      vi.mocked(planningCenter.batchLookupPlanningCenter).mockResolvedValue([
        {
          email: 'john@example.com',
          result: { people: [], count: 0 },
          retries: 0,
          failed: false
        },
        {
          email: 'jane@example.com',
          result: { people: [], count: 0, error: 'Network timeout' },
          retries: 3,
          failed: true
        },
        {
          email: 'bob@example.com',
          result: { people: [], count: 0, error: 'API error' },
          retries: 2,
          failed: true
        }
      ]);

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.client.from().insert = insertSpy;
      
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.uploadCSVData();

      expect(component.csvImportWarnings.length).toBe(2);
      expect(component.csvImportWarnings[0]).toContain('jane@example.com');
      expect(component.csvImportWarnings[1]).toContain('bob@example.com');
      expect(component.csvSuccess).toContain('Planning Center checks failed for 2');
    });

    it('should track progress during Planning Center batch lookup', async () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true },
        { name: 'Jane', email: 'jane@example.com', valid: true }
      ];

      mockSupabaseService.client.from().select().in.mockResolvedValue({
        data: [],
        error: null
      });

      let progressCallback: any;
      vi.mocked(planningCenter.batchLookupPlanningCenter).mockImplementation(
        async (emails, url, key, options) => {
          progressCallback = options?.onProgress;
          
          // Simulate progress updates
          if (progressCallback) {
            progressCallback(1, 2);
            progressCallback(2, 2);
          }

          return [
            {
              email: 'john@example.com',
              result: { people: [], count: 0 },
              retries: 0,
              failed: false
            },
            {
              email: 'jane@example.com',
              result: { people: [], count: 0 },
              retries: 0,
              failed: false
            }
          ];
        }
      );

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.client.from().insert = insertSpy;
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.uploadCSVData();

      expect(planningCenter.batchLookupPlanningCenter).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          concurrency: 5,
          maxRetries: 3,
          onProgress: expect.any(Function)
        })
      );
    });

    it('should reset progress tracking after upload', async () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true }
      ];

      mockSupabaseService.client.from().select().in.mockResolvedValue({
        data: [],
        error: null
      });

      vi.mocked(planningCenter.batchLookupPlanningCenter).mockResolvedValue([
        {
          email: 'john@example.com',
          result: { people: [], count: 0 },
          retries: 0,
          failed: false
        }
      ]);

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.client.from().insert = insertSpy;
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.uploadCSVData();

      expect(component.csvImportProgress).toBe(0);
      expect(component.csvImportTotal).toBe(0);
    });
  });

  describe('getActiveCount', () => {
    it('should count active subscribers', () => {
      component.subscribers = [
        { ...mockSubscriber, is_active: true },
        { ...mockSubscriber, is_active: false },
        { ...mockSubscriber, is_active: true }
      ];

      expect(component.getActiveCount()).toBe(2);
    });

    it('should return 0 for no active subscribers', () => {
      component.subscribers = [
        { ...mockSubscriber, is_active: false },
        { ...mockSubscriber, is_active: false }
      ];

      expect(component.getActiveCount()).toBe(0);
    });
  });

  describe('Math property', () => {
    it('should have Math property', () => {
      expect(component.Math).toBe(Math);
    });
  });

  describe('handleCSVUpload', () => {
    it('should parse CSV file correctly', async () => {
      const csvContent = 'John Doe,john@example.com\nJane Smith,jane@example.com';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const event = { target: { files: [file] } } as any;
      component.handleCSVUpload(event);

      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(component.csvData.length).toBe(2);
      expect(component.csvData[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        valid: true
      });
    });

    it('should handle invalid email format in CSV', async () => {
      const csvContent = 'John Doe,invalid-email';
      const file = new File([csvContent], 'test.csv');
      
      const event = { target: { files: [file] } } as any;
      component.handleCSVUpload(event);

      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(component.csvData[0].valid).toBe(false);
      expect(component.csvData[0].error).toBe('Invalid email format');
    });

    it('should handle missing name or email in CSV', async () => {
      const csvContent = 'John Doe,\n,jane@example.com';
      const file = new File([csvContent], 'test.csv');
      
      const event = { target: { files: [file] } } as any;
      component.handleCSVUpload(event);

      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(component.csvData[0].valid).toBe(false);
      expect(component.csvData[0].error).toBe('Missing name or email');
      expect(component.csvData[1].valid).toBe(false);
    });

    it('should handle empty file input', () => {
      const event = { target: { files: [] } } as any;
      component.handleCSVUpload(event);
      expect(component.csvData).toEqual([]);
    });

    it('should handle null file', () => {
      const event = { target: { files: null } } as any;
      component.handleCSVUpload(event);
      expect(component.csvData).toEqual([]);
    });

    it('should clear error when parsing CSV successfully', async () => {
      component.error = 'Previous error';
      const csvContent = 'John Doe,john@example.com';
      const file = new File([csvContent], 'test.csv');
      
      const event = { target: { files: [file] } } as any;
      component.handleCSVUpload(event);

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(component.error).toBeNull();
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

  describe('uploadCSVData with skipped duplicates and no failures', () => {
    it('should include message about skipped duplicates', async () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true },
        { name: 'Existing', email: 'existing@example.com', valid: true }
      ];

      // Mock existing email check to return one existing email
      mockSupabaseService.client.from().select().in.mockResolvedValue({
        data: [{ email: 'existing@example.com' }],
        error: null
      });

      vi.mocked(planningCenter.batchLookupPlanningCenter).mockResolvedValue([
        {
          email: 'john@example.com',
          result: { people: [], count: 0 },
          retries: 0,
          failed: false
        }
      ]);

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.client.from().insert = insertSpy;
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.uploadCSVData();

      expect(component.csvSuccess).toContain('Skipped 1 duplicate(s)');
    });

    it('should add exclamation mark when no failures', async () => {
      component.csvData = [
        { name: 'John', email: 'john@example.com', valid: true }
      ];

      mockSupabaseService.client.from().select().in.mockResolvedValue({
        data: [],
        error: null
      });

      vi.mocked(planningCenter.batchLookupPlanningCenter).mockResolvedValue([
        {
          email: 'john@example.com',
          result: { people: [], count: 0 },
          retries: 0,
          failed: false
        }
      ]);

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      mockSupabaseService.client.from().insert = insertSpy;
      const searchSpy = vi.spyOn(component, 'handleSearch').mockResolvedValue();

      await component.uploadCSVData();

      expect(component.csvSuccess).toContain('!');
      expect(component.csvSuccess).not.toContain('⚠️');
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
      const range = component.getPaginationRange();
      expect(range).toEqual([1, 2]);
    });

    it('should adjust start and end when near end of pagination', () => {
      component.currentPage = 10;
      const range = component.getPaginationRange();
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
});
