import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalPrayerUpdateEditModalComponent } from './personal-prayer-update-edit-modal.component';
import { PrayerService, PrayerUpdate } from '../../services/prayer.service';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { of } from 'rxjs';

describe('PersonalPrayerUpdateEditModalComponent', () => {
  let component: PersonalPrayerUpdateEditModalComponent;
  let prayerService: any;
  let toastService: any;
  let changeDetectorRef: any;
  const mockDestroyRef = { onDestroy: vi.fn() } as unknown as DestroyRef;
  const mockRichTextEditorsSettings = {
    getRichTextEditorsEnabled$: () => of(true),
  };

  const mockUpdate: PrayerUpdate = {
    id: 'update-123',
    prayer_id: 'prayer-123',
    content: 'Test Update Content',
    author: 'Test Author',
    created_at: '2024-01-01T00:00:00Z'
  } as any;

  beforeEach(() => {
    prayerService = {
      updatePersonalPrayerUpdate: vi.fn()
    };

    toastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    changeDetectorRef = {
      markForCheck: vi.fn()
    };

    component = new PersonalPrayerUpdateEditModalComponent(
      prayerService,
      toastService,
      changeDetectorRef,
      mockDestroyRef,
      mockRichTextEditorsSettings as any
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

    it('should initialize with update null', () => {
      expect(component.update).toBeNull();
    });

    it('should initialize with empty prayerId', () => {
      expect(component.prayerId).toBe('');
    });

    it('should initialize isSubmitting as false', () => {
      expect(component.isSubmitting).toBe(false);
    });

    it('should have close and save EventEmitters', () => {
      expect(component.close).toBeTruthy();
      expect(component.save).toBeTruthy();
    });

    it('should call ngOnInit without errors', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });
  });

  describe('ngOnChanges', () => {
    it('should populate form data when modal opens with an update', () => {
      component.isOpen = true;
      component.update = mockUpdate;
      component.ngOnChanges();

      expect(component.formData.content).toBe('Test Update Content');
    });

    it('should not update form data when modal is closed', () => {
      component.isOpen = false;
      component.update = mockUpdate;
      component.formData.content = 'Existing Value';

      component.ngOnChanges();

      expect(component.formData.content).toBe('Existing Value');
    });

    it('should not update form data when update is null', () => {
      component.isOpen = true;
      component.update = null;
      component.formData.content = 'Existing Value';

      component.ngOnChanges();

      expect(component.formData.content).toBe('Existing Value');
    });

    it('should not update form data when both isOpen and update are falsy', () => {
      component.isOpen = false;
      component.update = null;
      component.formData.content = 'Existing Value';

      component.ngOnChanges();

      expect(component.formData.content).toBe('Existing Value');
    });

    it('should clear form data when modal opens but update is null', () => {
      component.isOpen = true;
      component.update = null;
      component.formData.content = 'Old Content';

      component.ngOnChanges();

      // Should not clear since update is null
      expect(component.formData.content).toBe('Old Content');
    });
  });

  describe('handleSubmit', () => {
    beforeEach(() => {
      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.ngOnChanges();
    });

    it('should not submit if already submitting', async () => {
      component.isSubmitting = true;

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayerUpdate).not.toHaveBeenCalled();
    });

    it('should not submit if update is null', async () => {
      component.update = null;

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayerUpdate).not.toHaveBeenCalled();
    });

    it('should submit form with content populated', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      component.formData.content = 'Updated Content';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayerUpdate).toHaveBeenCalledWith(
        'update-123',
        'prayer-123',
        {
          content: 'Updated Content'
        }
      );
    });

    it('should set isSubmitting to true during submission', async () => {
      prayerService.updatePersonalPrayerUpdate.mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve(true), 50))
      );

      component.handleSubmit();
      expect(component.isSubmitting).toBe(true);
    });

    it('should emit save event on successful submission', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);
      vi.spyOn(component.save, 'emit');

      component.formData.content = 'Updated Content';

      await component.handleSubmit();

      expect(component.save.emit).toHaveBeenCalledWith({
        content: 'Updated Content'
      });
    });

    it('should emit close event on successful submission', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);
      vi.spyOn(component.close, 'emit');

      await component.handleSubmit();

      expect(component.close.emit).toHaveBeenCalled();
    });

    it('should emit save event on successful submission', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);
      vi.spyOn(component.save, 'emit');

      await component.handleSubmit();

      expect(component.save.emit).toHaveBeenCalled();
    });

    it('should set isSubmitting to false after successful submission', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      await component.handleSubmit();

      expect(component.isSubmitting).toBe(false);
    });

    it('should set isSubmitting to false on error', async () => {
      prayerService.updatePersonalPrayerUpdate.mockRejectedValue(new Error('Test error'));

      await component.handleSubmit().catch(() => {});

      expect(component.isSubmitting).toBe(false);
    });

    it('should show error toast on failed submission', async () => {
      prayerService.updatePersonalPrayerUpdate.mockRejectedValue(new Error('Test error'));

      await component.handleSubmit().catch(() => {});

      expect(toastService.error).toHaveBeenCalledWith('Failed to save prayer update. Please try again.');
    });

    it('should not emit save event on failed submission', async () => {
      prayerService.updatePersonalPrayerUpdate.mockRejectedValue(new Error('Test error'));
      vi.spyOn(component.save, 'emit');

      await component.handleSubmit().catch(() => {});

      expect(component.save.emit).not.toHaveBeenCalled();
    });

    it('should not emit close event on failed submission', async () => {
      prayerService.updatePersonalPrayerUpdate.mockRejectedValue(new Error('Test error'));
      vi.spyOn(component.close, 'emit');

      await component.handleSubmit().catch(() => {});

      expect(component.close.emit).not.toHaveBeenCalled();
    });

    it('should handle updatePersonalPrayerUpdate returning false', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(false);
      vi.spyOn(component.close, 'emit');

      await component.handleSubmit();

      expect(component.close.emit).not.toHaveBeenCalled();
      expect(toastService.success).not.toHaveBeenCalled();
    });

    it('should call markForCheck when setting isSubmitting to true', async () => {
      prayerService.updatePersonalPrayerUpdate.mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve(true), 50))
      );

      component.handleSubmit();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(changeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should call markForCheck when setting isSubmitting to false', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      changeDetectorRef.markForCheck.mockClear();

      await component.handleSubmit();

      expect(changeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should log error to console on exception', async () => {
      const error = new Error('Network error');
      prayerService.updatePersonalPrayerUpdate.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await component.handleSubmit().catch(() => {});

      expect(consoleSpy).toHaveBeenCalledWith('Error updating prayer update:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('cancel', () => {
    it('should clear form data', () => {
      component.formData.content = 'Test Content';

      component.cancel();

      expect(component.formData.content).toBe('');
    });

    it('should emit close event', () => {
      vi.spyOn(component.close, 'emit');

      component.cancel();

      expect(component.close.emit).toHaveBeenCalled();
    });

    it('should clear form data before emitting close', () => {
      component.formData.content = 'Test Content';
      let formDataCleared = false;

      component.close.subscribe(() => {
        formDataCleared = component.formData.content === '';
      });

      component.cancel();

      expect(formDataCleared).toBe(true);
    });

    it('should not affect other component state', () => {
      component.isOpen = true;
      component.update = mockUpdate;
      component.isSubmitting = false;
      component.prayerId = 'prayer-123';

      component.cancel();

      expect(component.isOpen).toBe(true);
      expect(component.update).toEqual(mockUpdate);
      expect(component.isSubmitting).toBe(false);
      expect(component.prayerId).toBe('prayer-123');
    });
  });

  describe('Form Submission Integration', () => {
    it('should reject empty content on submit', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.formData.content = '';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayerUpdate).not.toHaveBeenCalled();
      expect(toastService.error).toHaveBeenCalledWith('Please enter update content');
    });

    it('should submit content with special characters', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.formData.content = 'Content with special chars: @#$%^&*()';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayerUpdate).toHaveBeenCalledWith(
        'update-123',
        'prayer-123',
        {
          content: 'Content with special chars: @#$%^&*()'
        }
      );
    });

    it('should submit content with multiple lines', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.formData.content = 'Line 1\nLine 2\nLine 3';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayerUpdate).toHaveBeenCalledWith(
        'update-123',
        'prayer-123',
        {
          content: 'Line 1\nLine 2\nLine 3'
        }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive submissions', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.formData.content = 'Valid update content';

      const firstSubmit = component.handleSubmit();
      const secondSubmit = component.handleSubmit();

      await firstSubmit;
      await secondSubmit;

      // Should only call once due to isSubmitting check
      expect(prayerService.updatePersonalPrayerUpdate).toHaveBeenCalledTimes(1);
    });

    it('should handle update with very long content', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.formData.content = 'A'.repeat(5000);

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayerUpdate).toHaveBeenCalled();
    });

    it('should handle service error with proper cleanup', async () => {
      const error = new Error('Network error');
      prayerService.updatePersonalPrayerUpdate.mockRejectedValue(error);

      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';

      await component.handleSubmit().catch(() => {});

      expect(component.isSubmitting).toBe(false);
      expect(toastService.error).toHaveBeenCalled();
    });

    it('should handle update with unicode characters', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.formData.content = '你好世界 🙏 مرحبا بالعالم';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayerUpdate).toHaveBeenCalledWith(
        'update-123',
        'prayer-123',
        {
          content: '你好世界 🙏 مرحبا بالعالم'
        }
      );
    });

    it('should reject whitespace-only content', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.formData.content = '   \n  \t  ';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayerUpdate).not.toHaveBeenCalled();
      expect(toastService.error).toHaveBeenCalledWith('Please enter update content');
    });

    it('canSave returns false for whitespace-only content', () => {
      component.formData.content = '   \n  \t  ';
      expect(component.canSave()).toBe(false);
    });

    it('canSave returns false while submitting', () => {
      component.formData.content = 'Valid content';
      component.isSubmitting = true;
      expect(component.canSave()).toBe(false);
    });
  });

  describe('Modal Input/Output Binding', () => {
    it('should accept isOpen input', () => {
      component.isOpen = true;
      expect(component.isOpen).toBe(true);
    });

    it('should accept update input', () => {
      component.update = mockUpdate;
      expect(component.update).toEqual(mockUpdate);
    });

    it('should accept prayerId input', () => {
      component.prayerId = 'test-prayer-id';
      expect(component.prayerId).toBe('test-prayer-id');
    });

    it('should emit close output', () => {
      const closeSpy = vi.spyOn(component.close, 'emit');
      component.cancel();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should emit save output with correct data', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);
      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.formData.content = 'New Content';

      const saveSpy = vi.spyOn(component.save, 'emit');
      await component.handleSubmit();

      expect(saveSpy).toHaveBeenCalledWith({ content: 'New Content' });
    });
  });

  describe('State Management', () => {
    it('should maintain state across multiple operations', async () => {
      prayerService.updatePersonalPrayerUpdate.mockResolvedValue(true);

      component.isOpen = true;
      component.update = mockUpdate;
      component.prayerId = 'prayer-123';
      component.ngOnChanges();

      expect(component.formData.content).toBe('Test Update Content');

      component.formData.content = 'Modified Content';
      await component.handleSubmit();

      expect(component.isSubmitting).toBe(false);
    });

    it('should reset form data after cancel', () => {
      component.formData.content = 'Some Content';
      component.cancel();

      expect(component.formData.content).toBe('');
    });

    it('should properly handle multiple ngOnChanges calls', () => {
      component.isOpen = true;
      component.update = mockUpdate;
      component.ngOnChanges();

      expect(component.formData.content).toBe('Test Update Content');

      const anotherUpdate: PrayerUpdate = {
        ...mockUpdate,
        id: 'update-456',
        content: 'Another Update'
      } as any;

      component.update = anotherUpdate;
      component.ngOnChanges();

      expect(component.formData.content).toBe('Another Update');
    });
  });
});
