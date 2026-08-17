import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminEmailSubscribersAddFormComponent } from './admin-email-subscribers-add-form.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef, ApplicationRef } from '@angular/core';

describe('AdminEmailSubscribersAddFormComponent', () => {
  let component: AdminEmailSubscribersAddFormComponent;
  let mockSupabase: { client: { from: ReturnType<typeof vi.fn> } };
  let mockToast: { error: ReturnType<typeof vi.fn>; info: ReturnType<typeof vi.fn> };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn>; detectChanges: ReturnType<typeof vi.fn> };
  let mockAppRef: { tick: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
          insert: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    };
    mockToast = { error: vi.fn(), info: vi.fn() };
    mockCdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };
    mockAppRef = { tick: vi.fn() };

    component = new AdminEmailSubscribersAddFormComponent(
      mockSupabase as unknown as SupabaseService,
      mockToast as unknown as ToastService,
      mockCdr as unknown as ChangeDetectorRef,
      mockAppRef as unknown as ApplicationRef,
    );
  });

  it('resetForm clears fields', () => {
    component.newName = 'Jane';
    component.resetForm();
    expect(component.newName).toBe('');
    expect(component.pcSearchTab).toBe(false);
  });

  it('onCreateClick rejects empty form', async () => {
    const reportError = vi.fn();
    component.reportError.subscribe(reportError);
    await component.handleAddSubscriber();
    expect(reportError).toHaveBeenCalledWith('Name and email are required');
  });
});
