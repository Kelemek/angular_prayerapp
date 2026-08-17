import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationRef, ChangeDetectorRef } from '@angular/core';
import { AdminPrayerTypeFormComponent } from './admin-prayer-type-form.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PromptService } from '../../services/prompt.service';

describe('AdminPrayerTypeFormComponent', () => {
  let component: AdminPrayerTypeFormComponent;
  let mockSupabase: { client: { from: ReturnType<typeof vi.fn> } };
  let mockPromptService: { loadPrompts: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: vi.fn(() => ({
          insert: vi.fn(() => Promise.resolve({ error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      },
    };
    mockPromptService = { loadPrompts: vi.fn(() => Promise.resolve()) };

    const cdr = { markForCheck: vi.fn(), detectChanges: vi.fn() } as unknown as ChangeDetectorRef;
    const appRef = { tick: vi.fn() } as unknown as ApplicationRef;
    const mockToast = { warning: vi.fn(), success: vi.fn(), error: vi.fn() };

    component = new AdminPrayerTypeFormComponent(
      mockSupabase as unknown as SupabaseService,
      mockToast as unknown as ToastService,
      mockPromptService as unknown as PromptService,
      cdr,
      appRef,
    );
  });

  it('should reject empty name', async () => {
    const errors: string[] = [];
    component.reportError.subscribe((e) => errors.push(e));
    await component.saveType();
    expect(errors[0]).toBe('Please enter a type name');
  });

  it('should insert new type', async () => {
    component.name = 'Healing';
    const saved: unknown[] = [];
    component.saved.subscribe((e) => saved.push(e));
    await component.saveType();
    expect(mockSupabase.client.from).toHaveBeenCalledWith('prayer_types');
    expect(saved.length).toBe(1);
    expect(mockPromptService.loadPrompts).toHaveBeenCalled();
  });
});
