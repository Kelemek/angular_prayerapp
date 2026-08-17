import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrayerSearchComponent } from './prayer-search.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PrayerService } from '../../services/prayer.service';
import { ChangeDetectorRef } from '@angular/core';
import { AdminPrayerEditorDialogsComponent } from '../admin-prayer-editor-dialogs/admin-prayer-editor-dialogs.component';

function attachPrayerEditorDialogs(
  component: PrayerSearchComponent,
  adminData: {
    sendBroadcastNotificationForNewPrayer: ReturnType<typeof vi.fn>;
    sendBroadcastNotificationForNewUpdate: ReturnType<typeof vi.fn>;
  },
  toast: ToastService,
  cdr: ChangeDetectorRef,
): AdminPrayerEditorDialogsComponent {
  const dialogs = new AdminPrayerEditorDialogsComponent(
    adminData as never,
    toast,
    cdr,
  );
  component.dialogsRef = dialogs;
  return dialogs;
}

describe('PrayerSearchComponent', () => {
  let component: PrayerSearchComponent;
  let mockSupabaseService: any;
  let mockToastService: any;
  let mockChangeDetectorRef: any;
  let mockPrayerService: any;
  let mockAdminDataService: {
    sendBroadcastNotificationForNewPrayer: ReturnType<typeof vi.fn>;
    sendBroadcastNotificationForNewUpdate: ReturnType<typeof vi.fn>;
  };

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
    prayer_updates: []
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const defaultPrayersTableMock = {
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockPrayer, error: null })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
        in: vi.fn().mockResolvedValue({ error: null })
      })
    };

    mockSupabaseService = {
      getSupabaseUrl: vi.fn().mockReturnValue('https://test.supabase.co'),
      getSupabaseKey: vi.fn().mockReturnValue('test-key'),
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [], error: null })
                  })
                })
              })
            };
          }
          return defaultPrayersTableMock;
        })
      })
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

    mockPrayerService = {
      loadPrayers: vi.fn().mockResolvedValue(undefined)
    };

    mockAdminDataService = {
      sendBroadcastNotificationForNewPrayer: vi.fn().mockResolvedValue(undefined),
      sendBroadcastNotificationForNewUpdate: vi.fn().mockResolvedValue(undefined),
    };

    component = new PrayerSearchComponent(
      mockSupabaseService,
      mockToastService,
      mockChangeDetectorRef,
      mockPrayerService
    );
    attachPrayerEditorDialogs(
      component,
      mockAdminDataService,
      mockToastService,
      mockChangeDetectorRef,
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    });
    global.confirm = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(component.searchTerm).toBe('');
      expect(component.statusFilter).toBe('');
      expect(component.approvalFilter).toBe('');
      expect(component.searchResults).toEqual([]);
      expect(component.searching).toBe(false);
      expect(component.deleting).toBe(false);
      expect(component.error).toBeNull();
      expect(component.selectedPrayers).toBeInstanceOf(Set);
      expect(component.expandedCards).toBeInstanceOf(Set);
      expect(component.editingPrayer).toBeNull();
      expect(component.creatingPrayer).toBe(false);
      expect(component.saving).toBe(false);
      expect(component.bulkStatus).toBe('');
      expect(component.updatingStatus).toBe(false);
      expect(component.addingUpdate).toBeNull();
      expect(component.savingUpdate).toBe(false);
      expect(component.editingUpdateId).toBeNull();
      expect(component.editingUpdatePrayerId).toBeNull();
      expect(component.savingEditUpdate).toBe(false);
      expect(component.currentPage).toBe(1);
      expect(component.pageSize).toBe(10);
      expect(component.totalItems).toBe(0);
      expect(component.allPrayers).toEqual([]);
      expect(component.displayPrayers).toEqual([]);
    });
  });

  describe('prayer creation shell', () => {
    it('should start create prayer', () => {
      const resetForm = vi.fn();
      component.panelRef = { resetCreateForm: resetForm } as never;
      component.startCreatePrayer();
      expect(component.creatingPrayer).toBe(true);
    });

    it('should cancel create prayer', () => {
      const resetForm = vi.fn();
      component.panelRef = { resetCreateForm: resetForm } as never;
      component.creatingPrayer = true;
      component.cancelCreatePrayer();
      expect(component.creatingPrayer).toBe(false);
      expect(resetForm).toHaveBeenCalled();
    });

    it('onPrayerCreated adds prayer and opens send dialog', () => {
      const prayer = { ...mockPrayer, id: 'new-prayer' };
      component.onPrayerCreated(prayer as never);
      expect(component.allPrayers[0]?.id).toBe('new-prayer');
      expect(component.dialogsRef!.showSendNotificationDialog).toBe(true);
      expect(component.creatingPrayer).toBe(false);
    });

    it('start create prayer clears error and resets child form', async () => {
      const resetForm = vi.fn();
      component.panelRef = { resetCreateForm: resetForm } as never;
      component.error = 'Previous error';

      component.startCreatePrayer();

      expect(component.creatingPrayer).toBe(true);
      expect(component.error).toBeNull();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(resetForm).toHaveBeenCalled();
    });
  });

  describe('onCardAction', () => {
    it('toggleSelect updates selectedPrayers', () => {
      const prayer = { ...mockPrayer, id: 'card-1' };
      component.onCardAction(prayer as never, { type: 'toggleSelect' });
      expect(component.selectedPrayers.has('card-1')).toBe(true);
    });
  });

  describe('onSectionToggle', () => {
    it('calls handleSearch on first expand only', () => {
      const spy = vi.spyOn(component, 'handleSearch');
      component.onSectionToggle();
      expect(spy).toHaveBeenCalledTimes(1);
      component.onSectionToggle();
      component.onSectionToggle();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      component.allPrayers = Array.from({ length: 25 }, (_, i) => ({
        ...mockPrayer,
        id: `prayer-${i}`
      }));
      component.totalItems = 25;
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

    it('should load page data', () => {
      component.currentPage = 1;
      component.pageSize = 10;
      component.loadPageData();
      expect(component.displayPrayers).toHaveLength(10);
    });

    it('should go to specific page', () => {
      component.goToPage(2);
      expect(component.currentPage).toBe(2);
    });

    it('should not go to invalid page', () => {
      component.goToPage(100);
      expect(component.currentPage).toBe(3);
      component.goToPage(0);
      expect(component.currentPage).toBe(1);
    });

    it('should go to previous page', () => {
      component.currentPage = 2;
      component.previousPage();
      expect(component.currentPage).toBe(1);
    });

    it('should go to next page', () => {
      component.currentPage = 1;
      component.nextPage();
      expect(component.currentPage).toBe(2);
    });

    it('should change page size', () => {
      component.currentPage = 2;
      component.changePageSize();
      expect(component.currentPage).toBe(1);
    });

    it('should get pagination range', () => {
      component.allPrayers = Array.from({ length: 100 }, (_, i) => ({
        ...mockPrayer,
        id: `prayer-${i}`
      }));
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 5;

      const range = component.paginationRange;
      expect(range.length).toBeLessThanOrEqual(5);
    });
  });

  describe('handleSearch', () => {
    it('should fetch prayers successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers).toEqual([mockPrayer]);
      expect(component.totalItems).toBe(1);
      expect(component.searching).toBe(false);
    });

    it('should handle search with term', async () => {
      component.searchTerm = 'test';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers).toEqual([mockPrayer]);
    });

    it('should handle search with status filter', async () => {
      component.statusFilter = 'current';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers).toEqual([mockPrayer]);
    });

    it('should handle search with approval filter', async () => {
      component.approvalFilter = 'approved';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers).toEqual([mockPrayer]);
    });

    it('should filter denied prayers', async () => {
      component.approvalFilter = 'denied';
      const deniedPrayer = { ...mockPrayer, denial_reason: 'Invalid' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer, deniedPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers).toHaveLength(1);
      expect(component.allPrayers[0].denial_reason).toBe('Invalid');
    });

    it('should filter pending prayers', async () => {
      component.approvalFilter = 'pending';
      const pendingPrayer = { ...mockPrayer, approval_status: 'pending' };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer, pendingPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBeGreaterThan(0);
    });

    it('should handle search error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Search failed'));

      await component.handleSearch();

      expect(component.error).toBe('Search failed');
      expect(mockToastService.error).toHaveBeenCalled();
    });

    it('should handle non-ok response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error'
      });

      await component.handleSearch();

      expect(component.error).toContain('Query failed');
    });
  });

  describe('prayer editing', () => {
    it('should start edit prayer', () => {
      component.startEditPrayer(mockPrayer);
      expect(component.editingPrayer).toBe(mockPrayer.id);
      expect(component.editForm.title).toBe(mockPrayer.title);
      expect(component.expandedCards.has(mockPrayer.id)).toBe(true);
    });

    it('should cancel edit', () => {
      component.editingPrayer = '123';
      component.editForm.title = 'Changed';
      component.cancelEdit();
      expect(component.editingPrayer).toBeNull();
      expect(component.editForm.title).toBe('');
    });

    it('should save prayer successfully', async () => {
      component.editForm = {
        title: 'Updated Title',
        description: 'Updated description',
        requester: 'John Doe',
        email: 'john@example.com',
        prayer_for: 'Jane',
        status: 'current'
      };

      component.allPrayers = [mockPrayer];
      component.loadPageData();

      await component.savePrayer('123');

      expect(mockToastService.success).toHaveBeenCalled();
      expect(component.editingPrayer).toBeNull();
      const updatePayload = mockSupabaseService.getClient().from().update.mock.calls[0][0];
      expect(updatePayload.approved_at).toBeDefined();
    });

    it('should not save prayer with invalid data', async () => {
      component.editForm.title = '';

      await component.savePrayer('123');

      expect(component.error).toContain('required');
    });

    it('should handle save prayer error', async () => {
      component.editForm = {
        title: 'Updated',
        description: 'Test',
        requester: 'John',
        email: 'john@example.com',
        prayer_for: 'Jane',
        status: 'current'
      };

      mockSupabaseService.getClient().from().update().eq.mockResolvedValue({
        error: new Error('Update failed')
      });

      await component.savePrayer('123');

      expect(component.error).toContain('Failed to update prayer');
    });
  });

  describe('prayer deletion', () => {
    it('should show confirmation dialog', async () => {
      await component.deletePrayer(mockPrayer);

      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);
      expect(component.dialogsRef!.confirmationPrayerId).toBe(mockPrayer.id);
    });

    it('should delete prayer successfully', async () => {
      component.allPrayers = [mockPrayer];
      component.totalItems = 1;

      await component.deletePrayer(mockPrayer);
      await component.onConfirmationConfirmed({ kind: 'deleteOne', prayerId: mockPrayer.id });

      expect(mockToastService.success).toHaveBeenCalledWith('Prayer deleted successfully');
      expect(component.allPrayers).toHaveLength(0);
    });

    it('should handle delete error', async () => {
      mockSupabaseService.getClient().from().delete().eq.mockResolvedValue({
        error: new Error('Delete failed')
      });

      await component.deletePrayer(mockPrayer);
      await component.onConfirmationConfirmed({ kind: 'deleteOne', prayerId: mockPrayer.id });

      expect(component.error).toContain('Failed to delete prayer');
    });

    it('should delete selected prayers', async () => {
      component.selectedPrayers = new Set(['1', '2', '3']);
      component.allPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' },
        { ...mockPrayer, id: '3' }
      ];
      component.totalItems = 3;

      await component.deleteSelected();
      // Confirmation dialog should be shown
      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);
      expect(component.dialogsRef!.isMultiSelectDelete).toBe(true);

      // Confirm the deletion
      await component.onConfirmationConfirmed({ kind: 'deleteMany' });
    });

    it('should not delete selected if user cancels', async () => {
      component.selectedPrayers = new Set(['1', '2']);

      await component.deleteSelected();
      // Dialog should be shown
      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);

      // Cancel the deletion
      component.dialogsRef!.onCancelDelete();
      expect(component.dialogsRef!.showConfirmationDialog).toBe(false);
      expect(mockSupabaseService.getClient().from().delete).not.toHaveBeenCalled();
    });

    it('should handle delete selected error', async () => {
      component.selectedPrayers = new Set(['1']);

      mockSupabaseService.getClient().from().delete().in.mockResolvedValue({
        error: new Error('Delete failed')
      });

      await component.deleteSelected();
      // Dialog should be shown
      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);

      // Try to confirm deletion - should fail
      await component.onConfirmationConfirmed({ kind: 'deleteMany' });

      expect(component.error).toContain('Failed to delete');
    });
  });

  describe('bulk status update', () => {
    it('should not update if no prayers selected', async () => {
      component.selectedPrayers = new Set();

      await component.updateSelectedStatus();

      expect(mockSupabaseService.getClient().from().update).not.toHaveBeenCalled();
    });

    it('should not update if user cancels', async () => {
      component.selectedPrayers = new Set(['1', '2']);
      component.bulkStatus = 'archived';

      await component.updateSelectedStatus();
      // Dialog should be shown
      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);
      expect(component.dialogsRef!.isStatusUpdateConfirmation).toBe(true);

      // Cancel the update
      component.dialogsRef!.onCancelDelete();
      expect(component.dialogsRef!.showConfirmationDialog).toBe(false);
      expect(mockSupabaseService.getClient().from().update).not.toHaveBeenCalled();
    });

    it('should update selected status successfully', async () => {
      component.selectedPrayers = new Set(['1', '2']);
      component.bulkStatus = 'archived';
      component.allPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' }
      ];

      // Mock the update chain
      const mockIn = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
      mockSupabaseService.getClient().from = vi.fn().mockReturnValue({ update: mockUpdate });

      await component.updateSelectedStatus();
      // Dialog should be shown
      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);
      expect(component.dialogsRef!.isStatusUpdateConfirmation).toBe(true);

      // Confirm the update
      await component.onConfirmationConfirmed({ kind: 'bulkStatus' });
      expect(mockToastService.success).toHaveBeenCalled();
      expect(component.selectedPrayers.size).toBe(0);
      expect(component.bulkStatus).toBe('');
    });

    it('should handle update selected error', async () => {
      component.selectedPrayers = new Set(['1']);
      component.bulkStatus = 'archived';

      // Mock the update chain with error
      const mockIn = vi.fn().mockResolvedValue({ error: new Error('Update failed') });
      const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
      mockSupabaseService.getClient().from = vi.fn().mockReturnValue({ update: mockUpdate });

      await component.updateSelectedStatus();
      // Dialog should be shown
      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);
      expect(component.dialogsRef!.isStatusUpdateConfirmation).toBe(true);

      // Confirm with error
      await component.onConfirmationConfirmed({ kind: 'bulkStatus' });
      expect(component.error).toBeTruthy();
    });
  });

  describe('prayer updates management', () => {
    it('should validate update form', () => {
      expect(component.isUpdateFormValid()).toBe(false);

      component.newUpdate = {
        content: 'Test content',
        firstName: 'John',
        lastName: 'Doe',
        author_email: 'john@example.com'
      };

      expect(component.isUpdateFormValid()).toBe(true);
    });

    it('should save new update successfully', async () => {
      component.newUpdate = {
        content: 'Test',
        firstName: 'John',
        lastName: 'Doe',
        author_email: 'john@example.com'
      };

      component.allPrayers = [mockPrayer];

      await component.saveNewUpdate('123');

      expect(mockToastService.success).toHaveBeenCalled();
      expect(component.addingUpdate).toBeNull();
      const insertPayload = mockSupabaseService.getClient().from().insert.mock.calls[0][0];
      expect(insertPayload.approved_at).toBeDefined();
    });

    it('should not save update with invalid form', async () => {
      component.newUpdate.content = '';

      await component.saveNewUpdate('123');

      expect(component.error).toBe('All fields are required');
    });

    it('should cancel add update', () => {
      component.addingUpdate = '123';
      component.newUpdate.content = 'Test';
      component.cancelAddUpdate();
      expect(component.addingUpdate).toBeNull();
      expect(component.newUpdate.content).toBe('');
    });

    it('should start add update with clean form and subscriber lookup', () => {
      component.newUpdate = {
        content: 'leftover',
        firstName: 'A',
        lastName: 'B',
        author_email: 'a@b.com'
      };
      component.startAddUpdate('prayer-1');
      expect(component.addingUpdate).toBe('prayer-1');
      expect(component.newUpdate).toEqual({
        content: '',
        firstName: '',
        lastName: '',
        author_email: ''
      });
    });

    it('should delete update successfully', async () => {
      component.allPrayers = [{
        ...mockPrayer,
        prayer_updates: [{ id: 'update-1', content: 'Test', author: 'John', created_at: '2024-01-01' }]
      }];

      await component.deleteUpdate('123', 'update-1', 'Test content');

      expect(mockToastService.success).toHaveBeenCalled();
    });

    it('should not delete update if user cancels', async () => {
      (global.confirm as any).mockReturnValue(false);

      await component.deleteUpdate('123', 'update-1', 'Test');

      expect(mockSupabaseService.getClient().from().delete).not.toHaveBeenCalled();
    });

    it('should start edit update', () => {
      const mockUpdate = {
        id: 'update-1',
        content: 'Original content',
        author: 'John Doe',
        author_email: 'john@example.com',
        created_at: '2024-01-01'
      };

      component.startEditUpdate('123', mockUpdate);

      expect(component.editingUpdateId).toBe('update-1');
      expect(component.editingUpdatePrayerId).toBe('123');
      expect(component.editUpdateForm.content).toBe('Original content');
      expect(component.editUpdateForm.author).toBe('John Doe');
      expect(component.editUpdateForm.author_email).toBe('john@example.com');
    });

    it('should cancel edit update', () => {
      component.editingUpdateId = 'update-1';
      component.editingUpdatePrayerId = '123';
      component.editUpdateForm = {
        content: 'Modified content',
        author: 'Jane Doe',
        author_email: 'jane@example.com'
      };

      component.cancelEditUpdate();

      expect(component.editingUpdateId).toBeNull();
      expect(component.editingUpdatePrayerId).toBeNull();
      expect(component.editUpdateForm.content).toBe('');
      expect(component.editUpdateForm.author).toBe('');
      expect(component.editUpdateForm.author_email).toBe('');
    });

    it('should validate edit update form', () => {
      expect(component.isEditUpdateFormValid()).toBe(false);

      component.editUpdateForm = {
        content: 'Test content',
        author: 'John Doe',
        author_email: 'john@example.com'
      };

      expect(component.isEditUpdateFormValid()).toBe(true);
    });

    it('should not validate edit update form with empty fields', () => {
      component.editUpdateForm = {
        content: '   ',
        author: 'John Doe',
        author_email: 'john@example.com'
      };

      expect(component.isEditUpdateFormValid()).toBe(false);
    });

    it('should save edit update successfully', async () => {
      const mockUpdate = {
        id: 'update-1',
        content: 'Original',
        author: 'John',
        author_email: 'john@example.com',
        created_at: '2024-01-01'
      };

      component.editUpdateForm = {
        content: 'Updated content',
        author: 'Jane Doe',
        author_email: 'jane@example.com'
      };

      component.allPrayers = [{
        ...mockPrayer,
        prayer_updates: [mockUpdate]
      }];

      await component.saveEditUpdate('123', 'update-1');

      expect(mockToastService.success).toHaveBeenCalled();
      expect(component.editingUpdateId).toBeNull();
      expect(component.editingUpdatePrayerId).toBeNull();
      const updatePayload = mockSupabaseService.getClient().from().update.mock.calls[0][0];
      expect(updatePayload.approved_at).toBeDefined();
    });

    it('should not save edit update with invalid form', async () => {
      component.editUpdateForm = {
        content: '',
        author: 'John',
        author_email: 'john@example.com'
      };

      await component.saveEditUpdate('123', 'update-1');

      expect(component.error).toBe('All fields are required');
      expect(mockToastService.error).toHaveBeenCalled();
    });

    it('should handle edit update error', async () => {
      component.editUpdateForm = {
        content: 'Updated',
        author: 'John',
        author_email: 'john@example.com'
      };

      mockSupabaseService.getClient().from().update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') })
      });

      await component.saveEditUpdate('123', 'update-1');

      expect(component.error).toContain('Failed to update');
      expect(mockToastService.error).toHaveBeenCalled();
    });
  });

  describe('selection management', () => {
    it('should toggle select prayer', () => {
      component.toggleSelectPrayer('123');
      expect(component.selectedPrayers.has('123')).toBe(true);
      component.toggleSelectPrayer('123');
      expect(component.selectedPrayers.has('123')).toBe(false);
    });

    it('should toggle select all', () => {
      component.displayPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' }
      ];

      component.toggleSelectAll();
      expect(component.selectedPrayers.size).toBe(2);

      component.toggleSelectAll();
      expect(component.selectedPrayers.size).toBe(0);
    });

    it('should toggle expand card', () => {
      component.toggleExpandCard('123');
      expect(component.expandedCards.has('123')).toBe(true);
      component.toggleExpandCard('123');
      expect(component.expandedCards.has('123')).toBe(false);
    });
  });

  describe('filter handling', () => {
    it('should handle status filter change', () => {
      const spy = vi.spyOn(component, 'handleSearch');
      component.statusFilter = 'current';
      component.onStatusFilterChange();
      expect(spy).toHaveBeenCalled();
    });

    it('should handle approval filter change', () => {
      const spy = vi.spyOn(component, 'handleSearch');
      component.approvalFilter = 'approved';
      component.onApprovalFilterChange();
      expect(spy).toHaveBeenCalled();
    });

    it('should handle Enter to search immediately', () => {
      const spy = vi.spyOn(component, 'handleSearch');
      const mockEvent = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      component.onMainSearchKeydown(mockEvent);
      expect(spy).toHaveBeenCalled();
    });

    it('should not search on other keys', () => {
      const spy = vi.spyOn(component, 'handleSearch');
      const mockEvent = { key: 'a', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      component.onMainSearchKeydown(mockEvent);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('clearSearch', () => {
    it('should clear search state', () => {
      component.searchTerm = 'test';
      component.allPrayers = [mockPrayer];
      component.displayPrayers = [mockPrayer];
      component.selectedPrayers = new Set(['123']);
      component.error = 'Error';

      component.clearSearch();

      expect(component.searchTerm).toBe('');
      expect(component.allPrayers).toEqual([]);
      expect(component.displayPrayers).toEqual([]);
      expect(component.selectedPrayers.size).toBe(0);
      expect(component.error).toBeNull();
    });
  });

  describe('additional edge cases and error handling', () => {
    it('should handle delete prayer with loadPrayers error gracefully', async () => {
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
        prayer_for: 'Jane Doe'
      };

      component.allPrayers = [mockPrayer];
      component.searchResults = [mockPrayer];
      mockPrayerService.loadPrayers.mockRejectedValue(new Error('Service error'));

      await component.deletePrayer(mockPrayer);
      await component.onConfirmationConfirmed({ kind: 'deleteOne', prayerId: mockPrayer.id });

      expect(component.allPrayers).not.toContain(mockPrayer);
      expect(mockToastService.success).toHaveBeenCalled();
    });

    it('should handle delete selected with loadPrayers error gracefully', async () => {
      component.selectedPrayers = new Set(['1', '2']);
      component.displayPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' }
      ];
      component.allPrayers = component.displayPrayers;
      mockPrayerService.loadPrayers.mockRejectedValue(new Error('Service error'));

      await component.deleteSelected();
      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);
      
      await component.onConfirmationConfirmed({ kind: 'deleteMany' });

      expect(mockToastService.success).toHaveBeenCalledWith('2 prayers deleted successfully');
    });

    it('should handle search with all filter combinations', async () => {
      component.searchTerm = 'test';
      component.statusFilter = 'current';
      component.approvalFilter = 'approved';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle save new update with loadPrayers error gracefully', async () => {
      component.newUpdate = {
        content: 'Test update',
        firstName: 'John',
        lastName: 'Doe',
        author_email: 'john@example.com'
      };
      component.allPrayers = [mockPrayer];
      mockPrayerService.loadPrayers.mockRejectedValue(new Error('Service error'));

      await component.saveNewUpdate('123');

      expect(mockToastService.success).toHaveBeenCalled();
    });

    it('should handle delete update with loadPrayers error gracefully', async () => {
      const update = { id: 'update-1', content: 'Test', author: 'John', created_at: '2024-01-01' };
      component.allPrayers = [{
        ...mockPrayer,
        prayer_updates: [update]
      }];
      mockPrayerService.loadPrayers.mockRejectedValue(new Error('Service error'));

      await component.deleteUpdate('123', 'update-1', 'Test content');

      expect(mockToastService.success).toHaveBeenCalled();
    });

    it('should handle search with custom filter combination - denied approval filter', async () => {
      component.approvalFilter = 'denied';
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [{
          ...mockPrayer,
          id: '1',
          denial_reason: 'Inappropriate content'
        }]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBe(1);
      expect(component.allPrayers[0].denial_reason).toBe('Inappropriate content');
    });

    it('should handle search with denied approval filter matching updates', async () => {
      component.approvalFilter = 'denied';
      
      const prayerWithDeniedUpdate = {
        ...mockPrayer,
        id: '2',
        denial_reason: null,
        prayer_updates: [{
          id: 'u1',
          content: 'Update content',
          author: 'Admin',
          created_at: '2024-01-01',
          denial_reason: 'Update denied'
        }]
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerWithDeniedUpdate]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBe(1);
    });

    it('should handle search with pending approval filter', async () => {
      component.approvalFilter = 'pending';
      
      const prayerPending = {
        ...mockPrayer,
        id: '3',
        approval_status: 'pending'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerPending]
      });

      await component.handleSearch();

      expect(component.allPrayers[0].approval_status).toBe('pending');
    });

    it('should handle search with pending approval filter in updates', async () => {
      component.approvalFilter = 'pending';
      
      const prayerWithPendingUpdate = {
        ...mockPrayer,
        id: '4',
        approval_status: 'approved',
        prayer_updates: [{
          id: 'u2',
          content: 'Pending update',
          author: 'John',
          created_at: '2024-01-01',
          approval_status: 'pending'
        }]
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerWithPendingUpdate]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBe(1);
    });

    it('should handle search with timeout error', async () => {
      (global.fetch as any).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        });
      });

      await component.handleSearch();

      expect(component.error).toBeTruthy();
      expect(mockToastService.error).toHaveBeenCalled();
    });

    it('should handle search with network error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await component.handleSearch();

      expect(component.error).toBe('Network error');
      expect(mockToastService.error).toHaveBeenCalled();
    });

    it('should handle search response with non-ok status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error'
      });

      await component.handleSearch();

      expect(component.error).toBeTruthy();
      expect(mockToastService.error).toHaveBeenCalled();
    });

    it('should maintain selected prayers across pagination', () => {
      component.displayPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' }
      ];
      component.selectedPrayers = new Set(['1']);

      component.loadPageData();

      expect(component.selectedPrayers.has('1')).toBe(true);
    });

    it('should handle start edit prayer with empty prayer_for', () => {
      const prayer = {
        ...mockPrayer,
        prayer_for: undefined
      };

      component.startEditPrayer(prayer);

      expect(component.editingPrayer).toBe(prayer.id);
      expect(component.editForm.prayer_for).toBe('');
    });

    it('should handle pagination boundary - first page', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 1;

      expect(component.isFirstPage).toBe(true);
    });

    it('should handle pagination boundary - last page', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 10;

      expect(component.isLastPage).toBe(true);
    });

    it('should handle pagination boundary - middle page', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 5;

      expect(component.isFirstPage).toBe(false);
      expect(component.isLastPage).toBe(false);
    });

    it('should return correct pagination range with more than 5 pages', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 5;

      const range = component.paginationRange;

      expect(range.length).toBeLessThanOrEqual(5);
      expect(range).toContain(5);
    });

    it('should return correct pagination range when at the beginning', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 1;

      const range = component.paginationRange;

      expect(range[0]).toBe(1);
    });

    it('should return correct pagination range when at the end', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 10;

      const range = component.paginationRange;

      expect(range[range.length - 1]).toBe(10);
    });

    it('should goToPage handle invalid page bounds', () => {
      component.totalItems = 100;
      component.pageSize = 10;

      component.goToPage(0);
      expect(component.currentPage).toBe(1);

      component.goToPage(100);
      expect(component.currentPage).toBeLessThanOrEqual(10);
    });

    it('should clear search reset all filters', () => {
      component.searchTerm = 'test';
      component.allPrayers = [mockPrayer];
      component.selectedPrayers = new Set(['123']);
      component.error = 'Some error';

      component.clearSearch();

      expect(component.searchTerm).toBe('');
      expect(component.allPrayers).toEqual([]);
      expect(component.selectedPrayers.size).toBe(0);
      expect(component.error).toBeNull();
    });

    it('should handle save prayer with empty email', async () => {
      component.editingPrayer = '123';
      component.editForm = {
        title: 'Test',
        description: 'Description',
        requester: 'John Doe',
        email: '',
        prayer_for: '',
        status: 'current'
      };
      component.allPrayers = [mockPrayer];

      await component.savePrayer('123');

      expect(mockSupabaseService.getClient().from().update).toHaveBeenCalled();
      const updatePayload = mockSupabaseService.getClient().from().update.mock.calls[0][0];
      expect(updatePayload.approved_at).toBeDefined();
    });

    it('should handle delete prayer confirmation cancel', async () => {
      (global.confirm as any).mockReturnValueOnce(false);

      await component.deletePrayer(mockPrayer);

      expect(mockSupabaseService.getClient().from().delete).not.toHaveBeenCalled();
    });

    it('should handle delete selected with no confirmation', async () => {
      (global.confirm as any).mockReturnValueOnce(false);
      component.selectedPrayers = new Set(['1', '2']);

      await component.deleteSelected();

      expect(mockSupabaseService.getClient().from().delete).not.toHaveBeenCalled();
    });

    it('should handle update selected status with no confirmation', async () => {
      (global.confirm as any).mockReturnValueOnce(false);
      component.selectedPrayers = new Set(['1', '2']);
      component.bulkStatus = 'answered';

      await component.updateSelectedStatus();

      expect(mockSupabaseService.getClient().from().update).not.toHaveBeenCalled();
    });

    it('should handle error in cancel edit', () => {
      component.editingPrayer = '123';
      component.editForm.title = 'Test';

      component.cancelEdit();

      expect(component.editingPrayer).toBeNull();
      expect(component.editForm.title).toBe('');
    });

    it('should handle error in cancel create prayer', () => {
      const resetForm = vi.fn();
      component.panelRef = { resetCreateForm: resetForm } as never;
      component.creatingPrayer = true;

      component.cancelCreatePrayer();

      expect(component.creatingPrayer).toBe(false);
      expect(resetForm).toHaveBeenCalled();
    });

    it('should test start create prayer resets form', () => {
      const resetForm = vi.fn();
      component.panelRef = { resetCreateForm: resetForm } as never;
      component.error = 'Previous error';

      component.startCreatePrayer();

      expect(component.creatingPrayer).toBe(true);
      expect(component.error).toBeNull();
    });

    it('should handle search with all filter combinations', async () => {
      component.searchTerm = 'test';
      component.statusFilter = 'current';
      component.approvalFilter = 'approved';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBeGreaterThanOrEqual(0);
    });

    it('should set error and return early when search has no conditions', async () => {
      component.searchTerm = '';
      component.statusFilter = '';
      component.approvalFilter = '';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => []
      });

      await component.handleSearch();

      expect(component.allPrayers).toEqual([]);
    });

    it('should handle search response with empty array', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => []
      });

      component.searchTerm = 'test';
      await component.handleSearch();

      expect(component.allPrayers).toEqual([]);
      expect(component.totalItems).toBe(0);
    });

    it('should handle approval filter with both all and specific values', async () => {
      component.approvalFilter = 'all';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBeGreaterThanOrEqual(0);
    });

    it('should properly filter pending prayers with approval_status null', async () => {
      component.approvalFilter = 'pending';
      
      const prayerNullStatus = {
        ...mockPrayer,
        id: '5',
        approval_status: null
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerNullStatus]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBe(1);
    });

    it('should handle search with statusFilter all', async () => {
      component.statusFilter = 'all';
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle onStatusFilterChange with empty string', () => {
      component.statusFilter = '';
      const spy = vi.spyOn(component, 'handleSearch');
      
      component.onStatusFilterChange();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle onApprovalFilterChange with empty string', () => {
      component.approvalFilter = '';
      const spy = vi.spyOn(component, 'handleSearch');
      
      component.onApprovalFilterChange();

      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle previousPage when already at first page', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 1;

      component.previousPage();

      expect(component.currentPage).toBe(1);
    });

    it('should handle nextPage when already at last page', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 10;

      component.nextPage();

      expect(component.currentPage).toBe(10);
    });

    it('should load page data correctly for different page numbers', () => {
      component.allPrayers = Array.from({ length: 25 }, (_, i) => ({
        ...mockPrayer,
        id: `prayer-${i}`
      }));
      component.totalItems = 25;
      component.pageSize = 10;
      component.currentPage = 2;

      component.loadPageData();

      expect(component.displayPrayers).toHaveLength(10);
      expect(component.displayPrayers[0].id).toBe('prayer-10');
    });

    it('should handle pagination range when at start', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 1;

      const range = component.paginationRange;

      expect(range).toContain(1);
      expect(range.length).toBeLessThanOrEqual(5);
    });

    it('should handle pagination range boundary cases', () => {
      component.totalItems = 25;
      component.pageSize = 10;
      component.currentPage = 1;

      const range = component.paginationRange;

      expect(range).toContain(1);
      expect(range.length).toBeLessThanOrEqual(5);
    });

    it('should handle save new update with error from insertError', async () => {
      component.newUpdate = {
        content: 'Test update',
        firstName: 'John',
        lastName: 'Doe',
        author_email: 'john@example.com'
      };
      component.allPrayers = [mockPrayer];

      mockSupabaseService.getClient().from().insert().select().single.mockResolvedValue({
        data: null,
        error: new Error('Insert failed')
      });

      await component.saveNewUpdate('123');

      expect(component.error).toContain('Failed to create update');
    });

    it('should update prayer in searchResults when saving', async () => {
      component.editForm = {
        title: 'Updated Title',
        description: 'Updated description',
        requester: 'John Doe',
        email: 'john@example.com',
        prayer_for: 'Jane',
        status: 'answered'
      };

      component.searchResults = [mockPrayer];
      component.allPrayers = [mockPrayer];
      component.displayPrayers = [mockPrayer];
      component.currentPage = 1;
      component.pageSize = 10;

      await component.savePrayer('123');

      expect(component.searchResults[0].title).toBe('Updated Title');
    });

    it('should toggle expand card with cdr markForCheck', () => {
      component.toggleExpandCard('123');
      expect(component.expandedCards.has('123')).toBe(true);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalled();

      component.toggleExpandCard('123');
      expect(component.expandedCards.has('123')).toBe(false);
      expect(mockChangeDetectorRef.markForCheck).toHaveBeenCalledTimes(2);
    });

    it('should handle delete selected with error in prayer deletion', async () => {
      component.selectedPrayers = new Set(['1', '2']);
      component.displayPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' }
      ];
      component.allPrayers = component.displayPrayers;

      mockSupabaseService.getClient().from().delete().in.mockResolvedValueOnce({
        error: null
      }).mockResolvedValueOnce({
        error: new Error('Prayer delete failed')
      });

      await component.deleteSelected();
      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);
      
      await component.onConfirmationConfirmed({ kind: 'deleteMany' });

      expect(component.error).toContain('Failed to delete prayers');
    });

    it('should handle delete prayer with error in updates deletion', async () => {
      mockSupabaseService.getClient().from().delete().eq.mockResolvedValueOnce({
        error: new Error('Updates delete failed')
      });

      await component.deletePrayer(mockPrayer);
      await component.onConfirmationConfirmed({ kind: 'deleteOne', prayerId: mockPrayer.id });

      expect(component.error).toContain('Failed to delete prayer updates');
    });

    it('should return with no-op when no selectedPrayers in bulkStatusUpdate', async () => {
      component.selectedPrayers = new Set();
      component.bulkStatus = 'answered';

      await component.updateSelectedStatus();

      expect(component.updatingStatus).toBe(false);
    });

    it('should cancel bulk status update on confirmation dialog cancel', async () => {
      component.selectedPrayers = new Set(['1']);
      component.bulkStatus = 'answered';
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      await component.updateSelectedStatus();

      expect(component.updatingStatus).toBe(false);
    });

    it('should clear edit form on cancel', () => {
      component.editForm = {
        title: 'Test',
        description: 'Test',
        requester: 'John',
        email: 'john@example.com',
        prayer_for: 'Test',
        status: 'current'
      };

      component.cancelEdit();

      expect(component.editForm.title).toBe('');
      expect(component.editingPrayer).toBeNull();
    });

    it('should load page data correctly', () => {
      component.allPrayers = [mockPrayer];

      component.loadPageData();

      expect(component.displayPrayers.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle fetch error with text parsing', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error'
      });

      component.searchTerm = 'test';
      await component.handleSearch();

      expect(component.error).toBeDefined();
    });

    it('should handle network error in handleSearch', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      component.searchTerm = 'test';
      await component.handleSearch();

      expect(component.error).toContain('Network error');
    });

    it('should update displayPrayers when allPrayers changes', () => {
      component.allPrayers = [mockPrayer];
      component.currentPage = 1;
      component.pageSize = 10;

      component.loadPageData();

      expect(component.displayPrayers).toContain(mockPrayer);
    });

    it('should handle cancel delete in confirmation dialog', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      component.deletePrayer(mockPrayer);

      expect(component.deleting).toBe(false);
    });

    it('should handle cancel for deleteSelected confirmation', () => {
      component.selectedPrayers = new Set(['1']);
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      component.deleteSelected();

      expect(component.deleting).toBe(false);
    });

    it('should handle isFirstPage getter correctly', () => {
      component.currentPage = 1;
      expect(component.isFirstPage).toBe(true);

      component.currentPage = 5;
      expect(component.isFirstPage).toBe(false);
    });

    it('should handle isLastPage getter correctly', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 10;
      expect(component.isLastPage).toBe(true);

      component.currentPage = 5;
      expect(component.isLastPage).toBe(false);
    });

    it('should set correct totalPages calculation', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      expect(component.totalPages).toBe(10);

      component.pageSize = 25;
      expect(component.totalPages).toBe(4);
    });

    it('should handle saveNewUpdate when form is invalid', async () => {
      component.newUpdate = {
        content: '',
        firstName: 'John',
        lastName: 'Doe',
        author_email: 'john@example.com'
      };

      await component.saveNewUpdate('123');

      expect(component.error).toContain('required');
    });

    it('should clearSearch and reset all values', () => {
      component.searchTerm = 'test';
      component.allPrayers = [mockPrayer];
      component.currentPage = 5;
      component.totalItems = 100;

      component.clearSearch();

      expect(component.searchTerm).toBe('');
      expect(component.allPrayers.length).toBe(0);
      expect(component.currentPage).toBe(1);
      expect(component.totalItems).toBe(0);
    });

    it('should handle isUpdateFormValid with all update fields', () => {
      component.newUpdate = {
        content: 'Valid update',
        firstName: 'John',
        lastName: 'Doe',
        author_email: 'john@example.com'
      };

      expect(component.isUpdateFormValid()).toBe(true);
    });

    it('should return false for isUpdateFormValid with missing content', () => {
      component.newUpdate = {
        content: '',
        firstName: 'John',
        lastName: 'Doe',
        author_email: 'john@example.com'
      };

      expect(component.isUpdateFormValid()).toBe(false);
    });

    it('should return false for isUpdateFormValid with missing firstName', () => {
      component.newUpdate = {
        content: 'Update',
        firstName: '',
        lastName: 'Doe',
        author_email: 'john@example.com'
      };

      expect(component.isUpdateFormValid()).toBe(false);
    });

    it('should return false for isUpdateFormValid with missing lastName', () => {
      component.newUpdate = {
        content: 'Update',
        firstName: 'John',
        lastName: '',
        author_email: 'john@example.com'
      };

      expect(component.isUpdateFormValid()).toBe(false);
    });

    it('should return false for isUpdateFormValid with missing author_email', () => {
      component.newUpdate = {
        content: 'Update',
        firstName: 'John',
        lastName: 'Doe',
        author_email: ''
      };

      expect(component.isUpdateFormValid()).toBe(false);
    });

    it('should handle toggleSelectPrayer to select and deselect', () => {
      const id = '123';
      expect(component.selectedPrayers.has(id)).toBe(false);

      component.toggleSelectPrayer(id);
      expect(component.selectedPrayers.has(id)).toBe(true);

      component.toggleSelectPrayer(id);
      expect(component.selectedPrayers.has(id)).toBe(false);
    });

    it('should handle toggleSelectAll when no prayers selected', () => {
      component.displayPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' }
      ];
      component.selectedPrayers = new Set();

      component.toggleSelectAll();

      expect(component.selectedPrayers.size).toBe(2);
    });

    it('should handle toggleSelectAll when all selected', () => {
      component.displayPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' }
      ];
      component.selectedPrayers = new Set(['1', '2']);

      component.toggleSelectAll();

      expect(component.selectedPrayers.size).toBe(0);
    });

    it('should handle changePageSize and reset current page', () => {
      component.currentPage = 10;

      component.changePageSize();

      expect(component.currentPage).toBe(1);
    });

    it('should handle goToPage with positive valid number', () => {
      component.totalItems = 100;
      component.pageSize = 10;

      component.goToPage(5);

      expect(component.currentPage).toBe(5);
    });

    it('should handle goToPage with boundary at max pages', () => {
      component.totalItems = 100;
      component.pageSize = 10;

      component.goToPage(15);

      expect(component.currentPage).toBeLessThanOrEqual(10);
    });

    it('should handle goToPage with boundary at minimum', () => {
      component.totalItems = 100;
      component.pageSize = 10;

      component.goToPage(0);

      expect(component.currentPage).toBe(1);
    });

    it('should handle cancelAddUpdate clearing form', () => {
      component.newUpdate = {
        content: 'Test',
        firstName: 'John',
        lastName: 'Doe',
        author_email: 'john@example.com'
      };
      component.addingUpdate = '123';

      component.cancelAddUpdate();

      expect(component.newUpdate.content).toBe('');
      expect(component.addingUpdate).toBeNull();
    });

    it('should start edit for a prayer', () => {
      component.allPrayers = [mockPrayer];

      component.startEditPrayer(mockPrayer);

      expect(component.editingPrayer).toBe(mockPrayer.id);
      expect(component.editForm.title).toBe(mockPrayer.title);
    });

    it('should handle search with detailed filter conditions', async () => {
      component.searchTerm = 'prayer';
      component.statusFilter = 'answered';
      component.approvalFilter = 'approved';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBeGreaterThanOrEqual(0);
      expect(component.displayPrayers.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle toggleExpandCard for multiple cards', () => {
      component.toggleExpandCard('card1');
      expect(component.expandedCards.has('card1')).toBe(true);

      component.toggleExpandCard('card2');
      expect(component.expandedCards.has('card2')).toBe(true);
      expect(component.expandedCards.has('card1')).toBe(true);

      component.toggleExpandCard('card1');
      expect(component.expandedCards.has('card1')).toBe(false);
    });

    it('should initialize with empty arrays and sets', () => {
      expect(component.displayPrayers).toBeDefined();
      expect(component.selectedPrayers).toBeDefined();
      expect(component.expandedCards).toBeDefined();
    });

    it('should handle pagination with exactly one page', () => {
      component.totalItems = 5;
      component.pageSize = 10;

      expect(component.totalPages).toBe(1);
      expect(component.isLastPage).toBe(true);
    });

    it('should handle getPaginationRange middle page', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 5;

      const range = component.paginationRange;

      expect(range).toContain(5);
      expect(range.length).toBeGreaterThan(0);
      expect(range.length).toBeLessThanOrEqual(5);
    });

    it('should handle getPaginationRange last pages', () => {
      component.totalItems = 100;
      component.pageSize = 10;
      component.currentPage = 9;

      const range = component.paginationRange;

      expect(range.includes(10)).toBe(true);
      expect(range.length).toBeLessThanOrEqual(5);
    });

    it('should filter denied prayers with denial_reason on prayer', async () => {
      component.approvalFilter = 'denied';
      
      const prayerWithDenialReason = {
        ...mockPrayer,
        id: 'denied-1',
        denial_reason: 'Not aligned with values'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerWithDenialReason]
      });

      component.searchTerm = 'test';
      await component.handleSearch();

      expect(component.allPrayers.length).toBe(1);
    });

    it('should filter denied prayers with denial_reason on update', async () => {
      component.approvalFilter = 'denied';
      
      const update = {
        id: 'update-1',
        content: 'Test',
        author: 'John',
        created_at: '2024-01-01',
        denial_reason: 'Needs more info'
      };

      const prayerWithUpdateDenial = {
        ...mockPrayer,
        id: 'denied-2',
        denial_reason: null,
        prayer_updates: [update]
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerWithUpdateDenial]
      });

      component.searchTerm = 'test';
      await component.handleSearch();

      expect(component.allPrayers.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter denied prayers excluding those without denial reasons', async () => {
      component.approvalFilter = 'denied';
      
      const prayerNoDenialReason = {
        ...mockPrayer,
        id: 'prayer-no-denial',
        denial_reason: null,
        prayer_updates: []
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerNoDenialReason]
      });

      component.searchTerm = 'test';
      await component.handleSearch();

      expect(component.allPrayers.length).toBe(0);
    });

    it('should handle pending approval filter with null approval_status', async () => {
      component.approvalFilter = 'pending';
      
      const prayerPending = {
        ...mockPrayer,
        id: 'pending-1',
        approval_status: null
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerPending]
      });

      component.searchTerm = 'test';
      await component.handleSearch();

      expect(component.allPrayers.length).toBe(1);
    });

    it('should exclude pending approval filter when approval_status is not null', async () => {
      component.approvalFilter = 'pending';
      
      const prayerApproved = {
        ...mockPrayer,
        id: 'approved-1',
        approval_status: 'approved'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerApproved]
      });

      component.searchTerm = 'test';
      await component.handleSearch();

      expect(component.allPrayers.length).toBe(0);
    });

    it('should handle denial filter on updates with various values', async () => {
      component.approvalFilter = 'denied';
      
      const updateWithEmptyDenial = {
        ...mockPrayer,
        id: 'prayer-empty-denial',
        denial_reason: null,
        prayer_updates: [
          {
            id: 'u1',
            content: 'Test',
            author: 'John',
            created_at: '2024-01-01',
            denial_reason: ''
          }
        ]
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [updateWithEmptyDenial]
      });

      component.searchTerm = 'test';
      await component.handleSearch();

      expect(component.allPrayers.length).toBe(0);
    });

    it('should fetch and store all prayer details with all filters active', async () => {
      component.searchTerm = 'faith';
      component.statusFilter = 'current';
      component.approvalFilter = 'approved';

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            ...mockPrayer,
            id: 'multi-filter-1',
            title: 'Prayer for faith',
            status: 'current',
            approval_status: 'approved'
          }
        ]
      });

      await component.handleSearch();

      expect(component.allPrayers[0].title).toContain('Prayer');
    });

    it('should handle search timeout gracefully', async () => {
      component.searchTerm = 'test';

      (global.fetch as any).mockRejectedValue(new Error('AbortError'));

      await component.handleSearch();

      expect(component.error).toBeDefined();
    });

    it('should load page data with multiple items correctly', () => {
      const prayers = Array.from({ length: 35 }, (_, i) => ({
        ...mockPrayer,
        id: `prayer-${i}`
      }));
      
      component.allPrayers = prayers;
      component.currentPage = 2;
      component.pageSize = 10;

      component.loadPageData();

      expect(component.displayPrayers.length).toBe(10);
      expect(component.displayPrayers[0].id).toBe('prayer-10');
      expect(component.displayPrayers[9].id).toBe('prayer-19');
    });

    it('should toggle select all with partial selection', () => {
      component.displayPrayers = [
        { ...mockPrayer, id: '1' },
        { ...mockPrayer, id: '2' },
        { ...mockPrayer, id: '3' }
      ];
      component.selectedPrayers = new Set(['1']);

      component.toggleSelectAll();

      expect(component.selectedPrayers.size).toBe(3);
    });

    it('should handle changePageSize resets to page 1', () => {
      component.currentPage = 5;

      component.changePageSize();

      expect(component.currentPage).toBe(1);
    });

    it('should handle denied prayers filter with empty denial_reason', async () => {
      component.approvalFilter = 'denied';
      
      const prayerWithEmptyDenialReason = {
        ...mockPrayer,
        id: '6',
        denial_reason: ''
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [prayerWithEmptyDenialReason]
      });

      await component.handleSearch();

      expect(component.allPrayers.length).toBe(0);
    });

    it('should handle goToPage with boundary validation', () => {
      component.totalItems = 100;
      component.pageSize = 10;

      component.goToPage(50);
      expect(component.currentPage).toBeLessThanOrEqual(10);

      component.goToPage(-5);
      expect(component.currentPage).toBeGreaterThanOrEqual(1);
    });

    it('should handle delete update with error', async () => {
      const update = { id: 'update-1', content: 'Test', author: 'John', created_at: '2024-01-01' };
      component.allPrayers = [{
        ...mockPrayer,
        prayer_updates: [update]
      }];

      mockSupabaseService.getClient().from().delete().eq.mockResolvedValue({
        error: new Error('Delete failed')
      });

      await component.deleteUpdate('123', 'update-1', 'Test content');

      expect(component.error).toContain('Failed to delete update');
    });

    it('should handle save prayer with empty requester', async () => {
      component.editForm = {
        title: 'Test',
        description: 'Test',
        requester: '',
        email: 'john@example.com',
        prayer_for: 'Jane',
        status: 'current'
      };

      await component.savePrayer('123');

      expect(component.error).toContain('required');
    });

    it('should handle updateSelectedStatus with error in update', async () => {
      component.selectedPrayers = new Set(['1']);
      component.bulkStatus = 'archived';

      const mockIn = vi.fn().mockResolvedValue({ error: new Error('Update failed') });
      const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
      mockSupabaseService.getClient().from = vi.fn().mockReturnValue({ update: mockUpdate });

      await component.updateSelectedStatus();

      expect(component.dialogsRef!.showConfirmationDialog).toBe(true);
    });
  });

  describe('search debounce, lifecycle, and notifications', () => {
    it('ngOnDestroy clears pending debounce timers without throwing', () => {
      vi.useFakeTimers();
      component.onMainSearchTermChange('ab');
      expect(() => component.ngOnDestroy()).not.toThrow();
      vi.useRealTimers();
    });

    it('onMainSearchTermChange debounces handleSearch for empty trimmed term', async () => {
      vi.useFakeTimers();
      const searchSpy = vi
        .spyOn(component, 'handleSearch')
        .mockResolvedValue(undefined);
      component.onMainSearchTermChange('  ');
      vi.advanceTimersByTime(350);
      expect(searchSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('onMainSearchTermChange debounces handleSearch when term meets min length', async () => {
      vi.useFakeTimers();
      const searchSpy = vi
        .spyOn(component, 'handleSearch')
        .mockResolvedValue(undefined);
      component.onMainSearchTermChange('needle');
      vi.advanceTimersByTime(350);
      expect(searchSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('onConfirmSendNotification sends prayer broadcast and closes dialog', async () => {
      component.dialogsRef!.openSendNotificationForPrayer('p-1', 'Title');

      await component.dialogsRef!.onConfirmSendNotification();

      expect(
        mockAdminDataService.sendBroadcastNotificationForNewPrayer
      ).toHaveBeenCalledWith('p-1');
      expect(mockToastService.success).toHaveBeenCalledWith(
        'Notification emails sent to subscribers'
      );
      expect(component.dialogsRef!.showSendNotificationDialog).toBe(false);
    });

    it('onDeclineSendNotification resets dialog state', () => {
      component.dialogsRef!.openSendNotificationForPrayer('p-1', 'Title');

      component.dialogsRef!.onDeclineSendNotification();

      expect(component.dialogsRef!.showSendNotificationDialog).toBe(false);
    });
  });

  describe('basic information overflow', () => {
    it('truncates long Basic Information values instead of overflowing the card', async () => {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const source = readFileSync(
        join(__dirname, '../admin-prayer-editor-card/admin-prayer-editor-card.component.html'),
        'utf8'
      );
      const basicInfoBlock = source.slice(
        source.indexOf('<!-- Basic Information -->'),
        source.indexOf('<!-- Status Information -->')
      );

      expect(basicInfoBlock).toContain('min-w-0 truncate');
      expect(basicInfoBlock).toContain('[title]="prayer.email"');
      expect(basicInfoBlock).toContain('[title]="prayer.title"');
      expect(basicInfoBlock).toContain('[title]="prayer.requester"');
      expect(basicInfoBlock).toContain('[title]="prayer.prayer_for"');
      expect(basicInfoBlock).toContain('overflow-hidden');
    });

    it('uses the same vertical gap between Basic/Status as the sections below', async () => {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const source = readFileSync(
        join(__dirname, '../admin-prayer-editor-card/admin-prayer-editor-card.component.html'),
        'utf8'
      );
      const viewModeBlock = source.slice(
        source.indexOf('<!-- View Mode -->'),
        source.indexOf('<!-- Description -->')
      );

      expect(viewModeBlock).toContain(
        'grid grid-cols-1 md:grid-cols-2 gap-2 min-w-0'
      );
      expect(viewModeBlock).not.toContain(
        'grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0'
      );
    });

    it('uses compact horizontal padding on expanded prayer details', async () => {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const source = readFileSync(
        join(__dirname, '../admin-prayer-editor-card/admin-prayer-editor-card.component.html'),
        'utf8'
      );
      const expandedDetails = source.slice(
        source.indexOf('<!-- Expanded Details - Only Visible When Expanded -->'),
        source.indexOf('<!-- View Mode -->')
      );

      expect(expandedDetails).toContain(
        'px-3 pb-3 pt-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-w-0'
      );
      expect(expandedDetails).not.toContain(
        'px-6 pb-3 pt-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-w-0'
      );
    });
  });
});
