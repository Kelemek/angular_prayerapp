import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { PrayerSearchComponent } from './prayer-search.component';

describe('PrayerSearchComponent', () => {
  let component: PrayerSearchComponent;
  let mockSupabaseService: {
    getSupabaseUrl: ReturnType<typeof vi.fn>;
    getSupabaseKey: ReturnType<typeof vi.fn>;
    getClient: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseService = {
      getSupabaseUrl: vi.fn().mockReturnValue('https://test.supabase.co'),
      getSupabaseKey: vi.fn().mockReturnValue('test-key'),
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    const mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
    } as unknown as ChangeDetectorRef;

    component = new PrayerSearchComponent(
      mockSupabaseService as never,
      { success: vi.fn(), error: vi.fn(), warning: vi.fn() } as never,
      mockChangeDetectorRef,
      { loadPrayers: vi.fn().mockResolvedValue(undefined) } as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnDestroy cancels pending debounced search', () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
    component.onMainSearchTermChange('ab');
    vi.advanceTimersByTime(100);
    component.ngOnDestroy();
    vi.advanceTimersByTime(400);
    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('preparePrayerEditorTourInitialState expands section', () => {
    const spy = vi.spyOn(component, 'handleSearch').mockResolvedValue();
    component.preparePrayerEditorTourInitialState();
    expect(component.sectionExpanded).toBe(true);
    expect(spy).toHaveBeenCalled();
  });
});
