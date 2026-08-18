import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApplicationRef, ChangeDetectorRef } from '@angular/core';
import { PrayerTypesManagerComponent } from './prayer-types-manager.component';

describe('PrayerTypesManagerComponent', () => {
  let component: PrayerTypesManagerComponent;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
    } as unknown as ChangeDetectorRef;

    const mockApplicationRef = {
      tick: vi.fn(),
    } as unknown as ApplicationRef;

    component = new PrayerTypesManagerComponent(
      {
        client: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        },
        getClient: vi.fn(),
        directQuery: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as never,
      { success: vi.fn(), error: vi.fn() } as never,
      { loadPrompts: vi.fn().mockResolvedValue(undefined) } as never,
      mockChangeDetectorRef,
      mockApplicationRef,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits onSave when a child mutation completes', async () => {
    const onSave = vi.fn();
    component.onSave.subscribe(onSave);
    vi.spyOn(component, 'fetchTypes').mockResolvedValue(undefined);

    await component.onTypeSaved({ successMessage: 'Prayer type saved!' });

    expect(onSave).toHaveBeenCalled();
  });
});
