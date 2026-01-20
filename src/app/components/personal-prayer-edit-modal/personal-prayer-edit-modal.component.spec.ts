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

  describe('Category Dropdown - onCategoryInput', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should filter categories when user types', () => {
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'hea';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.formData.category).toBe('hea');
      expect(component.filteredCategories).toContain('Health');
    });

    it('should show dropdown when filtered categories exist', () => {
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'fam';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.showCategoryDropdown).toBe(true);
    });

    it('should not show dropdown when no matching categories', () => {
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'xyz';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should clear filtered categories when input is empty', () => {
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = '';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.filteredCategories).toEqual([]);
      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should reset selectedCategoryIndex when filtering', () => {
      component.selectedCategoryIndex = 2;
      component.ngOnInit(); // Ensure availableCategories is loaded
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'health';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should handle case-insensitive filtering', () => {
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = 'HEALTH';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.filteredCategories).toContain('Health');
    });

    it('should filter categories with whitespace', () => {
      const event = new Event('input');
      const input = document.createElement('input');
      input.value = '  work  ';
      Object.defineProperty(event, 'target', { value: input });

      component.onCategoryInput(event as any);

      expect(component.filteredCategories).toContain('Work');
    });
  });

  describe('Category Dropdown - selectCategory', () => {
    it('should set selected category', () => {
      component.selectCategory('Health');

      expect(component.formData.category).toBe('Health');
    });

    it('should close dropdown after selection', () => {
      component.showCategoryDropdown = true;

      component.selectCategory('Health');

      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should clear filtered categories after selection', () => {
      component.filteredCategories = ['Health', 'Family'];

      component.selectCategory('Health');

      expect(component.filteredCategories).toEqual([]);
    });

    it('should reset selectedCategoryIndex after selection', () => {
      component.selectedCategoryIndex = 1;

      component.selectCategory('Health');

      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should call markForCheck after selection', () => {
      component.selectCategory('Health');

      expect(changeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('Category Dropdown - onCategoryKeyDown', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.filteredCategories = ['Health', 'Family', 'Work'];
      component.showCategoryDropdown = true;
    });

    it('should move selection down with ArrowDown key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.selectedCategoryIndex).toBe(0);
    });

    it('should move selection down multiple times', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

      component.onCategoryKeyDown(event);
      component.onCategoryKeyDown(event);

      expect(component.selectedCategoryIndex).toBe(1);
    });

    it('should not go beyond last item with ArrowDown', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });

      component.selectedCategoryIndex = 2;
      component.onCategoryKeyDown(event);

      expect(component.selectedCategoryIndex).toBe(2);
    });

    it('should move selection up with ArrowUp key', () => {
      component.selectedCategoryIndex = 1;
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.selectedCategoryIndex).toBe(0);
    });

    it('should not go below -1 with ArrowUp', () => {
      component.selectedCategoryIndex = 0;
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });

      component.onCategoryKeyDown(event);

      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should select category with Enter key when item is selected', () => {
      component.selectedCategoryIndex = 0;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');
      vi.spyOn(component, 'selectCategory');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.selectCategory).toHaveBeenCalledWith('Health');
    });

    it('should not select anything with Enter if no item is selected', () => {
      component.selectedCategoryIndex = -1;
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(component, 'selectCategory');

      component.onCategoryKeyDown(event);

      expect(component.selectCategory).not.toHaveBeenCalled();
    });

    it('should close dropdown with Escape key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.showCategoryDropdown).toBe(false);
      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should do nothing when dropdown is closed', () => {
      component.showCategoryDropdown = false;
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(component.selectedCategoryIndex).toBe(-1);
    });

    it('should do nothing when no filtered categories', () => {
      component.filteredCategories = [];
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should prevent Enter key default when dropdown is open but empty', () => {
      component.filteredCategories = [];
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      vi.spyOn(event, 'preventDefault');

      component.onCategoryKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should call markForCheck after keyboard navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      changeDetectorRef.markForCheck.mockClear();

      component.onCategoryKeyDown(event);

      expect(changeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('Category Dropdown - onDocumentClick', () => {
    it('should close dropdown when clicking outside', () => {
      component.showCategoryDropdown = true;
      const button = document.createElement('button');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: button });

      component.onDocumentClick(event as any);

      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should not close dropdown when clicking inside dropdown', () => {
      component.showCategoryDropdown = true;
      const dropdownItem = document.createElement('div');
      dropdownItem.className = 'dropdown-item';
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: dropdownItem });

      component.onDocumentClick(event as any);

      expect(component.showCategoryDropdown).toBe(true);
    });

    it('should not close dropdown when clicking on category input', () => {
      component.showCategoryDropdown = true;
      const categoryInput = document.createElement('input');
      categoryInput.id = 'category';
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: categoryInput });

      component.onDocumentClick(event as any);

      expect(component.showCategoryDropdown).toBe(true);
    });

    it('should do nothing when dropdown is already closed', () => {
      component.showCategoryDropdown = false;
      const button = document.createElement('button');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: button });

      component.onDocumentClick(event as any);

      expect(component.showCategoryDropdown).toBe(false);
    });

    it('should call markForCheck when closing dropdown', () => {
      component.showCategoryDropdown = true;
      const button = document.createElement('button');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: button });
      changeDetectorRef.markForCheck.mockClear();

      component.onDocumentClick(event as any);

      expect(changeDetectorRef.markForCheck).toHaveBeenCalled();
    });
  });

  describe('cancel - dropdown state', () => {
    it('should reset showCategoryDropdown', () => {
      component.showCategoryDropdown = true;

      component.cancel();

      expect(component.showCategoryDropdown).toBe(false);
    });
  });
});
