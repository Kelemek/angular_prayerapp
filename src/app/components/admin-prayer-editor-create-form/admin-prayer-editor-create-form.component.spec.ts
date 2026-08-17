import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPrayerEditorCreateFormComponent } from './admin-prayer-editor-create-form.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PrayerService } from '../../services/prayer.service';
import { ChangeDetectorRef } from '@angular/core';

describe('AdminPrayerEditorCreateFormComponent', () => {
  let component: AdminPrayerEditorCreateFormComponent;
  let mockSupabaseService: {
    getClient: ReturnType<typeof vi.fn>;
  };
  let mockToastService: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let mockPrayerService: {
    loadPrayers: ReturnType<typeof vi.fn>;
  };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn> };

  const mockPrayer = {
    id: 'new-1',
    title: 'Prayer for Peace',
    requester: 'John Doe',
    email: 'john@example.com',
    status: 'current',
    created_at: '2024-01-15T10:30:00Z',
    prayer_for: 'Peace',
    description: 'Test',
    approval_status: 'approved',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseService = {
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockPrayer, error: null }),
            }),
          }),
        }),
      }),
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    mockPrayerService = {
      loadPrayers: vi.fn().mockResolvedValue(undefined),
    };

    mockCdr = { markForCheck: vi.fn() };

    component = new AdminPrayerEditorCreateFormComponent(
      mockSupabaseService as unknown as SupabaseService,
      mockToastService as unknown as ToastService,
      mockPrayerService as unknown as PrayerService,
      mockCdr as unknown as ChangeDetectorRef,
    );
  });

  it('resetForm clears create fields', () => {
    component.createForm.firstName = 'Jane';
    component.resetForm();
    expect(component.createForm.firstName).toBe('');
    expect(component.createForm.status).toBe('current');
  });

  it('onCreateSubscriberSelected fills name and email', () => {
    component.onCreateSubscriberSelected({
      name: 'Jane Marie Doe',
      email: 'jane@example.com',
    });

    expect(component.createForm.firstName).toBe('Jane');
    expect(component.createForm.lastName).toBe('Marie Doe');
    expect(component.createForm.email).toBe('jane@example.com');
  });

  it('onCreateClick rejects invalid form', async () => {
    await component.onCreateClick(new Event('submit'));

    expect(mockToastService.error).toHaveBeenCalledWith('All fields are required');
    expect(mockSupabaseService.getClient().from).not.toHaveBeenCalled();
  });

  it('onCreateClick creates prayer with trimmed fields', async () => {
    component.createForm = {
      firstName: '  John  ',
      lastName: '  Doe  ',
      email: '  john@example.com  ',
      prayer_for: '  Guidance  ',
      description: '  Test  ',
      status: 'current',
      is_anonymous: false,
    };

    const created = vi.fn();
    component.created.subscribe(created);

    await component.onCreateClick(new Event('submit'));

    const insertCall = mockSupabaseService.getClient().from().insert.mock.calls[0][0];
    expect(insertCall.title).toBe('Prayer for Guidance');
    expect(insertCall.approval_status).toBe('approved');
    expect(insertCall.approved_at).toBeDefined();
    expect(mockToastService.success).toHaveBeenCalled();
    expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    expect(created).toHaveBeenCalled();
    expect(component.createForm.firstName).toBe('');
  });

  it('onCreateClick surfaces insert errors', async () => {
    mockSupabaseService.getClient = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Insert failed'),
            }),
          }),
        }),
      }),
    });
    component = new AdminPrayerEditorCreateFormComponent(
      mockSupabaseService as unknown as SupabaseService,
      mockToastService as unknown as ToastService,
      mockPrayerService as unknown as PrayerService,
      mockCdr as unknown as ChangeDetectorRef,
    );

    component.createForm = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      prayer_for: 'Peace',
      description: 'Test',
      status: 'current',
      is_anonymous: false,
    };

    await component.onCreateClick(new Event('submit'));

    expect(mockToastService.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create prayer'),
    );
  });

  it('onCancelClick resets and emits cancel', () => {
    const cancel = vi.fn();
    component.cancel.subscribe(cancel);
    component.createForm.firstName = 'John';

    component.onCancelClick();

    expect(component.createForm.firstName).toBe('');
    expect(cancel).toHaveBeenCalled();
  });
});
