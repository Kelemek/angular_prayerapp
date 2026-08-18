import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import { PromptManagerComponent } from './prompt-manager.component';

describe('PromptManagerComponent', () => {
  let component: PromptManagerComponent;
  let mockSupabaseService: {
    directQuery: ReturnType<typeof vi.fn>;
    client: { from: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseService = {
      directQuery: vi.fn().mockResolvedValue({ data: [], error: null }),
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      },
    };

    const mockChangeDetectorRef = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
    } as unknown as ChangeDetectorRef;

    component = new PromptManagerComponent(
      mockSupabaseService as never,
      { success: vi.fn(), error: vi.fn() } as never,
      mockChangeDetectorRef,
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
    component.onPromptSearchQueryChange('ab');
    vi.advanceTimersByTime(100);
    component.ngOnDestroy();
    vi.advanceTimersByTime(400);
    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('emits onSave when a child mutation completes', async () => {
    const onSave = vi.fn();
    component.onSave.subscribe(onSave);
    await component.onPromptCreated({ successMessage: 'Saved' });
    expect(onSave).toHaveBeenCalled();
  });
});
