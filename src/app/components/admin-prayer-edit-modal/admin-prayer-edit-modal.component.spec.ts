import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPrayerEditModalComponent } from './admin-prayer-edit-modal.component';
import { AdminDataService } from '../../services/admin-data.service';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef } from '@angular/core';

describe('AdminPrayerEditModalComponent', () => {
  let component: AdminPrayerEditModalComponent;
  let adminDataService: any;
  let toastService: any;
  let changeDetectorRef: any;

  const mockPrayer = {
    id: '123',
    prayer_for: 'Test Prayer',
    description: 'Test Description'
  } as any;

  beforeEach(() => {
    adminDataService = {
      editPrayer: vi.fn()
    };

    toastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    changeDetectorRef = {
      markForCheck: vi.fn()
    };

    component = new AdminPrayerEditModalComponent(
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
      expect(component.formData.prayer_for).toBe('');
      expect(component.formData.description).toBe('');
    });

    it('should initialize with isOpen false', () => {
      expect(component.isOpen).toBe(false);
    });
  });

  describe('ngOnChanges', () => {
    it('should populate form data when modal opens with prayer', () => {
      component.isOpen = true;
      component.prayer = mockPrayer;
      
      component.ngOnChanges();

      expect(component.formData.prayer_for).toBe('Test Prayer');
      expect(component.formData.description).toBe('Test Description');
    });

    it('should not populate form data if not open', () => {
      component.isOpen = false;
      component.prayer = mockPrayer;
      
      component.ngOnChanges();

      expect(component.formData.prayer_for).toBe('');
      expect(component.formData.description).toBe('');
    });
  });

  describe('handleSubmit', () => {
    beforeEach(() => {
      component.prayer = mockPrayer;
      component.formData = {
        prayer_for: 'Updated Prayer',
        description: 'Updated Description'
      };
    });

    it('should call adminDataService.editPrayer with correct data', async () => {
      adminDataService.editPrayer.mockResolvedValue(undefined);

      await component.handleSubmit();

      expect(adminDataService.editPrayer).toHaveBeenCalledWith('123', {
        prayer_for: 'Updated Prayer',
        description: 'Updated Description'
      });
    });

    it('should emit save and close events on success', async () => {
      adminDataService.editPrayer.mockResolvedValue(undefined);
      const saveSpy = vi.fn();
      const closeSpy = vi.fn();
      component.save.subscribe(saveSpy);
      component.close.subscribe(closeSpy);

      await component.handleSubmit();

      expect(saveSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should show error toast on failure', async () => {
      adminDataService.editPrayer.mockRejectedValue(new Error('Save failed'));

      await component.handleSubmit();

      expect(toastService.error).toHaveBeenCalledWith('Failed to update prayer. Please try again.');
    });
  });

  describe('cancel', () => {
    it('should reset form data and emit close', () => {
      component.formData = {
        prayer_for: 'Test',
        description: 'Test Description'
      };
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.cancel();

      expect(component.formData.prayer_for).toBe('');
      expect(component.formData.description).toBe('');
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
