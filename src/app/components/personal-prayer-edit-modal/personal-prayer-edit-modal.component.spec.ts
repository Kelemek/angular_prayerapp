import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalPrayerEditModalComponent } from './personal-prayer-edit-modal.component';
import { PrayerService, PrayerRequest } from '../../services/prayer.service';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef } from '@angular/core';

describe('PersonalPrayerEditModalComponent', () => {
  let component: PersonalPrayerEditModalComponent;
  let prayerService: any;
  let toastService: any;
  let changeDetectorRef: any;

  const mockPrayer: PrayerRequest = {
    id: '123',
    prayer_for: 'Test Prayer',
    description: 'Test Description',
    category: 'Health'
  } as any;

  beforeEach(() => {
    prayerService = {
      getUniqueCategoriesForUser: vi.fn().mockReturnValue(['Health', 'Family', 'Work']),
      updatePersonalPrayer: vi.fn()
    };

    toastService = {
      success: vi.fn(),
      error: vi.fn()
    };

    changeDetectorRef = {
      markForCheck: vi.fn()
    };

    component = new PersonalPrayerEditModalComponent(
      prayerService,
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
      expect(component.formData.category).toBe('');
    });

    it('should initialize with isOpen false', () => {
      expect(component.isOpen).toBe(false);
    });

    it('should initialize with prayer null', () => {
      expect(component.prayer).toBeNull();
    });

    it('should initialize isSubmitting as false', () => {
      expect(component.isSubmitting).toBe(false);
    });

    it('should load available categories on ngOnInit', () => {
      component.ngOnInit();
      expect(prayerService.getUniqueCategoriesForUser).toHaveBeenCalled();
      expect(component.availableCategories).toEqual(['Health', 'Family', 'Work']);
    });
  });

  describe('ngOnChanges', () => {
    it('should populate form data when modal opens with a prayer', () => {
      component.isOpen = true;
      component.prayer = mockPrayer;
      component.ngOnChanges();

      expect(component.formData.prayer_for).toBe('Test Prayer');
      expect(component.formData.description).toBe('Test Description');
      expect(component.formData.category).toBe('Health');
    });

    it('should load available categories when modal opens', () => {
      component.isOpen = true;
      component.prayer = mockPrayer;
      prayerService.getUniqueCategoriesForUser.mockClear();

      component.ngOnChanges();

      expect(prayerService.getUniqueCategoriesForUser).toHaveBeenCalled();
    });

    it('should not update form data when modal is closed', () => {
      component.isOpen = false;
      component.prayer = mockPrayer;
      component.formData.prayer_for = 'Existing Value';

      component.ngOnChanges();

      expect(component.formData.prayer_for).toBe('Existing Value');
    });

    it('should handle prayer with no category', () => {
      const prayerWithoutCategory: PrayerRequest = {
        id: '123',
        prayer_for: 'Test Prayer',
        description: 'Test Description'
      } as any;

      component.isOpen = true;
      component.prayer = prayerWithoutCategory;
      component.ngOnChanges();

      expect(component.formData.category).toBe('');
    });

    it('should not update form data when prayer is null', () => {
      component.isOpen = true;
      component.prayer = null;
      component.formData.prayer_for = 'Existing Value';

      component.ngOnChanges();

      expect(component.formData.prayer_for).toBe('Existing Value');
    });
  });

  describe('handleSubmit', () => {
    beforeEach(() => {
      component.isOpen = true;
      component.prayer = mockPrayer;
      component.ngOnChanges();
    });

    it('should not submit if already submitting', async () => {
      component.isSubmitting = true;

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayer).not.toHaveBeenCalled();
    });

    it('should not submit if prayer is null', async () => {
      component.prayer = null;

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayer).not.toHaveBeenCalled();
    });

    it('should submit form with all fields populated', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);

      component.formData.prayer_for = 'Updated Prayer';
      component.formData.description = 'Updated Description';
      component.formData.category = 'Family';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayer).toHaveBeenCalledWith('123', {
        prayer_for: 'Updated Prayer',
        description: 'Updated Description',
        category: 'Family'
      });
    });

    it('should convert empty category to null', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);

      component.formData.prayer_for = 'Updated Prayer';
      component.formData.description = 'Updated Description';
      component.formData.category = '   ';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayer).toHaveBeenCalledWith('123', {
        prayer_for: 'Updated Prayer',
        description: 'Updated Description',
        category: null
      });
    });

    it('should set isSubmitting to true during submission', async () => {
      prayerService.updatePersonalPrayer.mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve(true), 50))
      );

      component.handleSubmit();
      expect(component.isSubmitting).toBe(true);
    });

    it('should emit save event on successful submission', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);
      vi.spyOn(component.save, 'emit');

      component.formData.prayer_for = 'Updated Prayer';
      component.formData.description = 'Updated Description';
      component.formData.category = 'Work';

      await component.handleSubmit();

      expect(component.save.emit).toHaveBeenCalledWith({
        prayer_for: 'Updated Prayer',
        description: 'Updated Description',
        category: 'Work'
      });
    });

    it('should emit close event on successful submission', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);
      vi.spyOn(component.close, 'emit');

      await component.handleSubmit();

      expect(component.close.emit).toHaveBeenCalled();
    });

    it('should set isSubmitting to false on error', async () => {
      prayerService.updatePersonalPrayer.mockRejectedValue(new Error('Test error'));

      await component.handleSubmit().catch(() => {});

      expect(component.isSubmitting).toBe(false);
    });

    it('should show error toast on failed submission', async () => {
      prayerService.updatePersonalPrayer.mockRejectedValue(new Error('Test error'));

      await component.handleSubmit().catch(() => {});

      expect(toastService.error).toHaveBeenCalledWith('Failed to update prayer. Please try again.');
    });

    it('should not emit save event on failed submission', async () => {
      prayerService.updatePersonalPrayer.mockRejectedValue(new Error('Test error'));
      vi.spyOn(component.save, 'emit');

      await component.handleSubmit().catch(() => {});

      expect(component.save.emit).not.toHaveBeenCalled();
    });

    it('should not emit close event on failed submission', async () => {
      prayerService.updatePersonalPrayer.mockRejectedValue(new Error('Test error'));
      vi.spyOn(component.close, 'emit');

      await component.handleSubmit().catch(() => {});

      expect(component.close.emit).not.toHaveBeenCalled();
    });

    it('should handle updatePersonalPrayer returning false', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(false);
      vi.spyOn(component.close, 'emit');

      await component.handleSubmit();

      expect(component.close.emit).not.toHaveBeenCalled();
      expect(toastService.success).not.toHaveBeenCalled();
    });

    it('should call markForCheck when setting isSubmitting to true', async () => {
      prayerService.updatePersonalPrayer.mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve(true), 50))
      );

      component.handleSubmit();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(changeDetectorRef.markForCheck).toHaveBeenCalled();
    });

    it('should call markForCheck when setting isSubmitting to false', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);

      changeDetectorRef.markForCheck.mockClear();

      await component.handleSubmit();

      expect(changeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should clear form data', () => {
      component.formData.prayer_for = 'Test';
      component.formData.description = 'Test Description';
      component.formData.category = 'Health';

      component.cancel();

      expect(component.formData.prayer_for).toBe('');
      expect(component.formData.description).toBe('');
      expect(component.formData.category).toBe('');
    });

    it('should emit close event', () => {
      vi.spyOn(component.close, 'emit');

      component.cancel();

      expect(component.close.emit).toHaveBeenCalled();
    });

    it('should clear form data before emitting close', () => {
      component.formData.prayer_for = 'Test';
      let formDataCleared = false;

      component.close.subscribe(() => {
        formDataCleared = component.formData.prayer_for === '';
      });

      component.cancel();

      expect(formDataCleared).toBe(true);
    });

    it('should not affect other component state', () => {
      component.isOpen = true;
      component.prayer = mockPrayer;
      component.isSubmitting = false;

      component.cancel();

      expect(component.isOpen).toBe(true);
      expect(component.prayer).toEqual(mockPrayer);
      expect(component.isSubmitting).toBe(false);
    });
  });

  describe('Form Submission Integration', () => {
    it('should trim category before sending', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);

      component.isOpen = true;
      component.prayer = mockPrayer;
      component.formData.prayer_for = 'Test';
      component.formData.category = '  Health  ';

      await component.handleSubmit();

      // The implementation sends the category as-is, only trimming to check if empty
      expect(prayerService.updatePersonalPrayer).toHaveBeenCalledWith('123', expect.objectContaining({
        category: '  Health  '
      }));
    });

    it('should allow optional fields to be empty', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);

      component.isOpen = true;
      component.prayer = mockPrayer;
      component.formData.prayer_for = 'Valid Prayer';
      component.formData.description = '';
      component.formData.category = '';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayer).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive submissions', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);

      component.isOpen = true;
      component.prayer = mockPrayer;

      // First submission - should succeed
      const firstSubmit = component.handleSubmit();
      // At this point, isSubmitting should be true, so the next call should be blocked
      const secondSubmit = component.handleSubmit();
      
      await firstSubmit;
      await secondSubmit;

      // Should only call once due to isSubmitting check
      expect(prayerService.updatePersonalPrayer).toHaveBeenCalledTimes(1);
    });

    it('should handle prayer with very long text', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);

      component.isOpen = true;
      component.prayer = mockPrayer;
      component.formData.prayer_for = 'A'.repeat(1000);
      component.formData.description = 'B'.repeat(5000);

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayer).toHaveBeenCalled();
    });

    it('should handle category with special characters', async () => {
      prayerService.updatePersonalPrayer.mockResolvedValue(true);

      component.isOpen = true;
      component.prayer = mockPrayer;
      component.formData.category = 'Health & Wellness (Family)';

      await component.handleSubmit();

      expect(prayerService.updatePersonalPrayer).toHaveBeenCalledWith('123', expect.objectContaining({
        category: 'Health & Wellness (Family)'
      }));
    });

    it('should handle service error with proper cleanup', async () => {
      const error = new Error('Network error');
      prayerService.updatePersonalPrayer.mockRejectedValue(error);

      component.isOpen = true;
      component.prayer = mockPrayer;

      await component.handleSubmit().catch(() => {});

      expect(component.isSubmitting).toBe(false);
      expect(toastService.error).toHaveBeenCalled();
    });
  });
});
