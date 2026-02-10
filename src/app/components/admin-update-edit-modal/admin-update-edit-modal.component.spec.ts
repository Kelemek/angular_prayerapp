import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUpdateEditModalComponent } from './admin-update-edit-modal.component';
import { AdminDataService } from '../../services/admin-data.service';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef } from '@angular/core';

describe('AdminUpdateEditModalComponent', () => {
  let component: AdminUpdateEditModalComponent;
  let adminDataService: any;
  let toastService: any;
  let changeDetectorRef: any;

  const mockUpdate = {
    id: 'update-123',
    content: 'Test Update Content',
    prayer_id: 'prayer-123'
  } as any;

  beforeEach(() => {
    adminDataService = {
      editUpdate: vi.fn()
    };

    toastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    changeDetectorRef = {
      markForCheck: vi.fn()
    };

    component = new AdminUpdateEditModalComponent(
      adminDataService,
      toastService,
      changeDetectorRef
    );
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty form data', () => {
      expect(component.formData.content).toBe('');
    });

    it('should initialize with isOpen false', () => {
      expect(component.isOpen).toBe(false);
    });
  });

  describe('ngOnChanges', () => {
    it('should populate form data when modal opens with update', () => {
      component.isOpen = true;
      component.update = mockUpdate;
      
      component.ngOnChanges();

      expect(component.formData.content).toBe('Test Update Content');
    });

    it('should not populate form data if not open', () => {
      component.isOpen = false;
      component.update = mockUpdate;
      
      component.ngOnChanges();

      expect(component.formData.content).toBe('');
    });
  });

  describe('handleSubmit', () => {
    beforeEach(() => {
      component.update = mockUpdate;
      component.formData = {
        content: 'Updated Content'
      };
    });

    it('should call adminDataService.editUpdate with correct data', async () => {
      adminDataService.editUpdate.mockResolvedValue(undefined);

      await component.handleSubmit();

      expect(adminDataService.editUpdate).toHaveBeenCalledWith('update-123', {
        content: 'Updated Content'
      });
    });

    it('should emit save and close events on success', async () => {
      adminDataService.editUpdate.mockResolvedValue(undefined);
      const saveSpy = vi.fn();
      const closeSpy = vi.fn();
      component.save.subscribe(saveSpy);
      component.close.subscribe(closeSpy);

      await component.handleSubmit();

      expect(saveSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should show error toast on failure', async () => {
      adminDataService.editUpdate.mockRejectedValue(new Error('Save failed'));

      await component.handleSubmit();

      expect(toastService.error).toHaveBeenCalledWith('Failed to update. Please try again.');
    });
  });

  describe('cancel', () => {
    it('should reset form data and emit close', () => {
      component.formData = {
        content: 'Test Content'
      };
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.cancel();

      expect(component.formData.content).toBe('');
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
