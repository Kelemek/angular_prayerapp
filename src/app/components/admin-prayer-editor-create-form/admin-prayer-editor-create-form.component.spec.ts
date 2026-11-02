import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPrayerEditorCreateFormComponent } from './admin-prayer-editor-create-form.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PrayerService } from '../../services/prayer.service';
import { AdminCreatedEmailSubscriberService } from '../../services/admin-created-email-subscriber.service';
import { ChangeDetectorRef } from '@angular/core';

describe('AdminPrayerEditorCreateFormComponent', () => {
  let component: AdminPrayerEditorCreateFormComponent;
  let mockSupabaseService: {
    getClientWhenReady: ReturnType<typeof vi.fn>;
  };
  let mockAdminCreatedSubscriber: {
    validateEmailFormat: ReturnType<typeof vi.fn>;
    ensure: ReturnType<typeof vi.fn>;
  };
  let mockToastService: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let mockPrayerService: {
    loadPrayers: ReturnType<typeof vi.fn>;
  };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn> };
  let prayersInsert: ReturnType<typeof vi.fn>;

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

  const validForm = {
    firstName: '  John  ',
    lastName: '  Doe  ',
    email: '  john@example.com  ',
    prayer_for: '  Guidance  ',
    description: '  Test  ',
    status: 'current' as const,
    is_anonymous: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    prayersInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockPrayer, error: null }),
      }),
    });

    mockSupabaseService = {
      getClientWhenReady: vi.fn().mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === 'prayers') {
            return { insert: prayersInsert };
          }
          throw new Error(`unexpected table ${table}`);
        }),
      }),
    };

    mockAdminCreatedSubscriber = {
      validateEmailFormat: vi.fn().mockReturnValue(null),
      ensure: vi.fn().mockResolvedValue({
        status: 'created',
        normalizedEmail: 'john@example.com',
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
      mockAdminCreatedSubscriber as unknown as AdminCreatedEmailSubscriberService,
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
    expect(mockSupabaseService.getClientWhenReady).not.toHaveBeenCalled();
  });

  it('onCreateClick creates prayer with normalized email and deferred subscriber toast', async () => {
    component.createForm = { ...validForm };

    const created = vi.fn();
    component.created.subscribe(created);

    await component.onCreateClick(new Event('submit'));

    const insertCall = prayersInsert.mock.calls[0][0];
    expect(insertCall.title).toBe('Prayer for Guidance');
    expect(insertCall.email).toBe('john@example.com');
    expect(mockToastService.success).toHaveBeenCalledWith('Subscriber added for this requester');
    expect(mockToastService.success).toHaveBeenCalledWith('Prayer created successfully');
    expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    expect(created).toHaveBeenCalled();
  });

  it('onCreateClick rejects invalid email before creating prayer', async () => {
    mockAdminCreatedSubscriber.validateEmailFormat.mockReturnValue(
      'Please enter a valid email address',
    );
    component.createForm = { ...validForm, email: 'not-an-email' };

    await component.onCreateClick(new Event('submit'));

    expect(mockToastService.error).toHaveBeenCalledWith('Please enter a valid email address');
    expect(mockSupabaseService.getClientWhenReady).not.toHaveBeenCalled();
  });

  it('onCreateClick skips subscriber toast when requester already exists', async () => {
    mockAdminCreatedSubscriber.ensure.mockResolvedValue({
      status: 'exists',
      normalizedEmail: 'john@example.com',
    });
    component.createForm = { ...validForm };

    await component.onCreateClick(new Event('submit'));

    expect(mockToastService.success).toHaveBeenCalledWith('Prayer created successfully');
    expect(mockToastService.success).not.toHaveBeenCalledWith('Subscriber added for this requester');
  });

  it('onCreateClick does not toast subscriber added when prayer insert fails', async () => {
    prayersInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Insert failed'),
        }),
      }),
    });
    component.createForm = { ...validForm };

    await component.onCreateClick(new Event('submit'));

    expect(mockToastService.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create prayer'),
    );
    expect(mockToastService.success).not.toHaveBeenCalledWith('Subscriber added for this requester');
    expect(mockToastService.success).not.toHaveBeenCalledWith('Prayer created successfully');
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
