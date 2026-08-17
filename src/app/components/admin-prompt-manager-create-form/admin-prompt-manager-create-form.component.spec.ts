import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationRef, ChangeDetectorRef } from '@angular/core';
import { AdminPromptManagerCreateFormComponent } from './admin-prompt-manager-create-form.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

describe('AdminPromptManagerCreateFormComponent', () => {
  let component: AdminPromptManagerCreateFormComponent;
  let mockSupabase: { client: { from: ReturnType<typeof vi.fn> } };
  let mockToast: { warning: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: vi.fn(() => ({
          insert: vi.fn(() => Promise.resolve({ error: null })),
        })),
      },
    };
    mockToast = {
      warning: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
    };

    const cdr = { markForCheck: vi.fn(), detectChanges: vi.fn() } as unknown as ChangeDetectorRef;
    const appRef = { tick: vi.fn() } as unknown as ApplicationRef;

    component = new AdminPromptManagerCreateFormComponent(
      mockSupabase as unknown as SupabaseService,
      mockToast as unknown as ToastService,
      cdr,
      appRef,
    );
    component.prayerTypes = [
      {
        id: '1',
        name: 'Prayer',
        display_order: 1,
        is_active: true,
        include_in_booklet: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];
    component.type = 'Prayer';
  });

  it('should reject empty fields', async () => {
    const errors: string[] = [];
    component.reportError.subscribe((e) => errors.push(e));
    await component.savePrompt();
    expect(errors[0]).toBe('All fields are required');
    expect(mockToast.warning).toHaveBeenCalled();
  });

  it('should insert prompt on valid save', async () => {
    component.title = 'New Prayer';
    component.description = 'Description';
    const saved: unknown[] = [];
    component.saved.subscribe((e) => saved.push(e));
    await component.savePrompt();
    expect(mockSupabase.client.from).toHaveBeenCalledWith('prayer_prompts');
    expect(saved.length).toBe(1);
    expect(mockToast.success).toHaveBeenCalledWith('Prompt added.');
  });
});
