import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { PersonalPrayerAnsweredStatusModalComponent } from './personal-prayer-answered-status-modal.component';
import { PrayerService } from '../../services/prayer.service';

describe('PersonalPrayerAnsweredStatusModalComponent', () => {
  let component: PersonalPrayerAnsweredStatusModalComponent;
  let prayerService: {
    getUniqueCategoriesForUser: ReturnType<typeof vi.fn>;
  };
  let cdr: { markForCheck: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prayerService = {
      getUniqueCategoriesForUser: vi
        .fn()
        .mockResolvedValue(['Health', 'Answered', 'Family']),
    };
    cdr = { markForCheck: vi.fn() };
    component = new PersonalPrayerAnsweredStatusModalComponent(
      prayerService as unknown as PrayerService,
      cdr as unknown as ChangeDetectorRef
    );
  });

  it('emits confirmMark in mark mode', () => {
    const confirmMark = vi.fn();
    component.mode = 'mark';
    component.confirmMark.subscribe(confirmMark);

    component.onConfirm();

    expect(confirmMark).toHaveBeenCalledTimes(1);
  });

  it('loads categories excluding Answered in unmark mode', async () => {
    component.mode = 'unmark';
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    await Promise.resolve();

    expect(prayerService.getUniqueCategoriesForUser).toHaveBeenCalled();
    expect(component.availableCategories).toEqual(['Health', 'Family']);
  });

  it('emits trimmed category on unmark confirm', () => {
    component.mode = 'unmark';
    const confirmUnmark = vi.fn();
    component.confirmUnmark.subscribe(confirmUnmark);
    component.category = '  Health  ';

    component.onConfirm();

    expect(confirmUnmark).toHaveBeenCalledWith('Health');
  });

  it('emits null when unmark category is blank', () => {
    component.mode = 'unmark';
    const confirmUnmark = vi.fn();
    component.confirmUnmark.subscribe(confirmUnmark);
    component.category = '   ';

    component.onConfirm();

    expect(confirmUnmark).toHaveBeenCalledWith(null);
  });

  it('blocks confirming Answered as unmark category', () => {
    component.mode = 'unmark';
    component.category = 'Answered';

    expect(component.canConfirm).toBe(false);
  });
});
