import { TestBed } from '@angular/core/testing';
import { AdminUserManagementComponent } from './admin-user-management.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { ChangeDetectorRef } from '@angular/core';
import { vi, describe, it, beforeEach, expect } from 'vitest';

describe('AdminUserManagementComponent', () => {
  let component: AdminUserManagementComponent;
  let fixture: any;

  // Mock client that can queue responses for successive calls
  const createMockClient = () => {
    const client: any = {
      responses: [] as any[],
      setResponses(resps: any[]) { this.responses = resps.slice(); },
      from() { return this; },
      select() { return this; },
      eq() { return this; },
      order() {
        const r = this.responses.shift();
        return Promise.resolve(r);
      },
      maybeSingle() {
        const r = this.responses.shift();
        return Promise.resolve(r);
      },
      upsert() {
        const r = this.responses.shift();
        return Promise.resolve(r);
      },
      update() {
        const r = this.responses.shift();
        return { eq: () => Promise.resolve(r) };
      }
    };
    return client;
  };

  let mockClient: any;
  let mockSupabase: any;
  let mockToast: any;
  let mockEmailService: any;
  let mockCdr: any;

  beforeEach(() => {
    mockClient = createMockClient();
    mockSupabase = { client: mockClient };

    mockToast = {
      success: vi.fn()
    };

    mockEmailService = {
      getTemplate: vi.fn().mockResolvedValue(null),
      applyTemplateVariables: vi.fn((t: string) => t),
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };

    mockCdr = { markForCheck: vi.fn() };

    // Instantiate component directly to avoid Angular DI complexity for standalone component
    component = new AdminUserManagementComponent(
      mockSupabase as any,
      mockToast as any,
      mockCdr as any,
      mockEmailService as any
    );
  });

  it('loads admins successfully', async () => {
    const admins = [{ email: 'a@b.com', name: 'A', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: true }];
    mockClient.setResponses([{ data: admins, error: null }]);

    await component.loadAdmins();

    expect(component.loading).toBe(false);
    expect(component.admins).toEqual(admins);
    expect(component.error).toBeNull();
    expect(mockCdr.markForCheck).toHaveBeenCalled();
  });

  it('handles loadAdmins error', async () => {
    mockClient.setResponses([{ data: null, error: { message: 'db error' } }]);

    await component.loadAdmins();

    expect(component.loading).toBe(false);
    expect(component.admins).toEqual([]);
    expect(component.error).toBe('Failed to load admin users');
  });

  it('validates addAdmin inputs (empty)', async () => {
    component.newAdminEmail = '';
    component.newAdminName = '';

    await component.addAdmin();

    expect(component.error).toBe('Email and name are required');
  });

  it('validates addAdmin inputs (invalid email)', async () => {
    component.newAdminEmail = 'bad-email';
    component.newAdminName = 'Name';

    await component.addAdmin();

    expect(component.error).toBe('Please enter a valid email address');
  });

  it('prevents adding existing admin', async () => {
    component.newAdminEmail = 'test@x.com';
    component.newAdminName = 'Test';

    // maybeSingle response indicates existing admin
    mockClient.setResponses([{ data: { email: 'test@x.com' } }]);

    await component.addAdmin();

    expect(component.error).toBe('This email is already an admin');
    expect(component.adding).toBe(false);
  });

  it('handles upsert error when adding admin', async () => {
    component.newAdminEmail = 'new@x.com';
    component.newAdminName = 'New';

    // maybeSingle -> null, upsert -> error
    mockClient.setResponses([
      { data: null },
      { error: { message: 'upsert failed' } }
    ]);

    await component.addAdmin();

    expect(component.error).toBe('Failed to add admin user');
    expect(component.adding).toBe(false);
  });

  it('adds admin successfully and emits onSave', async () => {
    component.newAdminEmail = 'ok@x.com';
    component.newAdminName = 'Ok';

    // maybeSingle -> null, upsert -> no error, loadAdmins -> return list
    mockClient.setResponses([
      { data: null },
      { error: null },
      { data: [{ email: 'ok@x.com', name: 'Ok', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: false }], error: null }
    ]);

    // spy on sendInvitationEmail and onSave.emit
    const sendSpy = vi.spyOn(component as any, 'sendInvitationEmail').mockResolvedValue(undefined);
    const emitSpy = vi.spyOn(component.onSave, 'emit');

    await component.addAdmin();

    expect(sendSpy).toHaveBeenCalled();
    expect(component.success).toContain('Admin added successfully');
    expect(mockToast.success).toHaveBeenCalled();
    expect(component.newAdminEmail).toBe('');
    expect(component.newAdminName).toBe('');
    expect(component.showAddForm).toBe(false);
    expect(emitSpy).toHaveBeenCalled();
  });

  it('addAdmin continues when sendInvitationEmail fails (logs and proceeds)', async () => {
    component.newAdminEmail = 'f@x.com';
    component.newAdminName = 'FailEmail';

    // maybeSingle -> null, upsert -> no error, loadAdmins -> return list
    mockClient.setResponses([
      { data: null },
      { error: null },
      { data: [{ email: 'f@x.com', name: 'FailEmail', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: false }], error: null }
    ]);

    // let sendInvitationEmail reject so the component's internal .catch runs
    const sendSpy = vi.spyOn(component as any, 'sendInvitationEmail').mockRejectedValue(new Error('email fail'));

    await component.addAdmin();

    expect(sendSpy).toHaveBeenCalled();
    expect(component.success).toContain('Admin added successfully');
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('sendInvitationEmail throws when sendEmail fails', async () => {
    mockEmailService.getTemplate.mockResolvedValue(null);
    mockEmailService.sendEmail.mockRejectedValue(new Error('send fail'));

    await expect(component.sendInvitationEmail('x@y.com', 'Name')).rejects.toThrow('send fail');
  });

  it('sendInvitationEmail uses template when available', async () => {
    const template = { subject: 'S', html_body: 'H', text_body: 'T' };
    mockEmailService.getTemplate.mockResolvedValue(template);
    mockEmailService.applyTemplateVariables.mockImplementation((t: string) => `${t}-applied`);

    await component.sendInvitationEmail('x@y.com', 'Name');

    expect(mockEmailService.getTemplate).toHaveBeenCalledWith('admin_invitation');
    expect(mockEmailService.applyTemplateVariables).toHaveBeenCalled();
    expect(mockEmailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'x@y.com' }));
  });

  it('sendInvitationEmail falls back when template missing', async () => {
    mockEmailService.getTemplate.mockResolvedValue(null);

    await component.sendInvitationEmail('z@y.com', 'Zed');

    expect(mockEmailService.sendEmail).toHaveBeenCalled();
    const sent = mockEmailService.sendEmail.mock.calls[0][0];
    expect(sent.to).toBe('z@y.com');
    expect(sent.htmlBody).toContain('Zed');
    expect(sent.textBody).toContain('Zed');
  });

  it('deleteAdmin prevents deleting last admin', async () => {
    component.admins = [{ email: 'only@x.com', name: 'Only', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: false }];

    await component.deleteAdmin('only@x.com');

    expect(component.error).toBe('Cannot delete the last admin user');
  });

  it('deleteAdmin success', async () => {
    component.admins = [
      { email: 'a@x.com', name: 'A', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: false },
      { email: 'b@x.com', name: 'B', created_at: '2020-01-02', last_sign_in_at: null, receive_admin_emails: false }
    ];

    mockClient.setResponses([
      { error: null }, // update
      { data: [], error: null } // loadAdmins
    ]);

    const emitSpy = vi.spyOn(component.onSave, 'emit');

    await component.deleteAdmin('a@x.com');

    expect(mockToast.success).toHaveBeenCalledWith('Admin access removed for a@x.com');
    expect(component.deletingEmail).toBeNull();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('deleteAdmin handles error', async () => {
    component.admins = [
      { email: 'a@x.com', name: 'A', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: false },
      { email: 'b@x.com', name: 'B', created_at: '2020-01-02', last_sign_in_at: null, receive_admin_emails: false }
    ];

    mockClient.setResponses([{ error: { message: 'boom' } }]);

    await component.deleteAdmin('a@x.com');

    expect(component.error).toBe('Failed to remove admin access');
  });

  it('deleteAdmin handles non-object error (primitive)', async () => {
    component.admins = [
      { email: 'a@x.com', name: 'A', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: false },
      { email: 'b@x.com', name: 'B', created_at: '2020-01-02', last_sign_in_at: null, receive_admin_emails: false }
    ];

    // Simulate client that rejects with a primitive (string) to cover non-object error branch
    mockSupabase.client = {
      from: () => ({ update: () => ({ eq: () => Promise.reject('primitive error') }) })
    } as any;

    await component.deleteAdmin('a@x.com');

    expect(component.error).toBe('Failed to remove admin access');
  });

  it('loadAdmins handles non-object error (primitive)', async () => {
    // Simulate client that rejects with a primitive during order()
    mockSupabase.client = {
      from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.reject('load-prim') }) }) })
    } as any;

    await component.loadAdmins();

    expect(component.error).toBe('Failed to load admin users');
    expect(component.admins).toEqual([]);
  });

  it('toggleReceiveEmails success and error', async () => {
    component.admins = [
      { email: 'a@x.com', name: 'A', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: false },
      { email: 'b@x.com', name: 'B', created_at: '2020-01-02', last_sign_in_at: null, receive_admin_emails: true }
    ];

    // success: update -> no error, then loadAdmins
    mockClient.setResponses([{ error: null }, { data: component.admins, error: null }]);
    await component.toggleReceiveEmails('a@x.com', false);
    expect(mockToast.success).toHaveBeenCalled();

    // error path
    mockClient.setResponses([{ error: { message: 'fail' } }]);
    await component.toggleReceiveEmails('a@x.com', false);
    expect(component.error).toBe('Failed to update email preference');
  });

  it('toggleReceiveEmails handles non-object error (primitive)', async () => {
    component.admins = [
      { email: 'a@x.com', name: 'A', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: false }
    ];

    mockSupabase.client = {
      from: () => ({ update: () => ({ eq: () => Promise.reject('primitive') }) })
    } as any;

    await component.toggleReceiveEmails('a@x.com', false);

    expect(component.error).toBe('Failed to update email preference');
  });

  it('toggleReceiveEmails shows disabled message when currentStatus is true', async () => {
    component.admins = [
      { email: 'x@x.com', name: 'X', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: true }
    ];

    // update -> no error
    mockSupabase.client = {
      from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) })
    } as any;

    await component.toggleReceiveEmails('x@x.com', true);

    expect(mockToast.success).toHaveBeenCalled();
  });

  it('addAdmin handles upsert rejection with object error', async () => {
    component.newAdminEmail = 'up@x.com';
    component.newAdminName = 'Up';

    // maybeSingle resolves null, upsert rejects with an object error
    mockSupabase.client = {
      from: (table: string) => {
        if (table === 'email_subscribers') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
            upsert: () => Promise.reject({ message: 'upsert-thrown' })
          } as any;
        }
        return null as any;
      }
    } as any;

    await component.addAdmin();

    expect(component.error).toBe('Failed to add admin user');
    expect(component.adding).toBe(false);
  });

  it('addAdmin handles thrown object without message property', async () => {
    component.newAdminEmail = 'nomsg@x.com';
    component.newAdminName = 'NoMsg';

    // maybeSingle rejects with object that lacks 'message' property
    mockSupabase.client = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject({ code: 'NO_MSG' }) }) }) })
    } as any;

    await component.addAdmin();

    expect(component.error).toBe('Failed to add admin user');
    expect(component.adding).toBe(false);
  });

  it('addAdmin handles thrown undefined error', async () => {
    component.newAdminEmail = 'undef@x.com';
    component.newAdminName = 'Undef';

    // maybeSingle rejects with undefined to exercise falsy error branch
    mockSupabase.client = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(undefined) }) }) })
    } as any;

    await component.addAdmin();

    expect(component.error).toBe('Failed to add admin user');
    expect(component.adding).toBe(false);
  });

  it('addAdmin handles synchronous throw inside try block', async () => {
    component.newAdminEmail = 'sync@x.com';
    component.newAdminName = 'SyncErr';

    // Simulate a synchronous throw when calling maybeSingle/select
    mockSupabase.client = {
      from: () => ({ select: () => { throw new Error('sync-fail'); } })
    } as any;

    await component.addAdmin();

    expect(component.error).toBe('Failed to add admin user');
    expect(component.adding).toBe(false);
  });

  it('addAdmin handles null rejection error', async () => {
    component.newAdminEmail = 'null@x.com';
    component.newAdminName = 'NullErr';

    // maybeSingle rejects with null
    mockSupabase.client = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(null) }) }) })
    } as any;

    await component.addAdmin();

    expect(component.error).toBe('Failed to add admin user');
    expect(component.adding).toBe(false);
  });

  it('addAdmin handles non-object error (primitive)', async () => {
    component.newAdminEmail = 'prim@x.com';
    component.newAdminName = 'Prim';

    // Simulate maybeSingle -> null, upsert rejects with primitive
    mockSupabase.client = {
      from: (table: string) => {
        if (table === 'email_subscribers') {
          return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }), upsert: () => Promise.reject('upsert-prim') };
        }
        return null as any;
      }
    } as any;

    await component.addAdmin();

    expect(component.error).toBe('Failed to add admin user');
    expect(component.adding).toBe(false);
  });

  it('cancelAddForm clears fields', () => {
    component.showAddForm = true;
    component.newAdminEmail = 'x';
    component.newAdminName = 'y';
    component.error = 'e';

    component.cancelAddForm();

    expect(component.showAddForm).toBe(false);
    expect(component.newAdminEmail).toBe('');
    expect(component.newAdminName).toBe('');
    expect(component.error).toBeNull();
  });

  it('formatDate and getReceivingEmailsCount', () => {
    const fmt = component.formatDate('2020-01-01T00:00:00Z');
    expect(typeof fmt).toBe('string');

    component.admins = [
      { email: 'a', name: 'A', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: true },
      { email: 'b', name: 'B', created_at: '2020-01-02', last_sign_in_at: null, receive_admin_emails: false }
    ];
    expect(component.getReceivingEmailsCount()).toBe(1);
  });

  it('ngOnInit calls loadAdmins', async () => {
    const loadSpy = vi.spyOn(component as any, 'loadAdmins').mockResolvedValue(undefined);

    component.ngOnInit();

    expect(loadSpy).toHaveBeenCalled();
  });

  it('loadAdmins handles null data (no error) and sets empty admins', async () => {
    // response with no data and no error should set admins to []
    mockClient.setResponses([{ data: null, error: null }]);

    await component.loadAdmins();

    expect(component.admins).toEqual([]);
    expect(component.loading).toBe(false);
    expect(component.error).toBeNull();
  });

  it('addAdmin handles thrown object error from maybeSingle', async () => {
    component.newAdminEmail = 'throw@x.com';
    component.newAdminName = 'Throw';

    // Simulate maybeSingle rejecting with an object (different error path)
    mockSupabase.client = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject({ message: 'maybe failed' }) }) }) })
    } as any;

    await component.addAdmin();

    expect(component.error).toBe('Failed to add admin user');
    expect(component.adding).toBe(false);
  });

  it('toggleReceiveEmails triggers toast.success and reloads admins', async () => {
    component.admins = [
      { email: 'a@x.com', name: 'A', created_at: '2020-01-01', last_sign_in_at: null, receive_admin_emails: false }
    ];

    // update -> no error, then loadAdmins -> return list
    mockClient.setResponses([
      { error: null },
      { data: component.admins, error: null }
    ]);

    const loadSpy = vi.spyOn(component as any, 'loadAdmins').mockResolvedValue(undefined);

    await component.toggleReceiveEmails('a@x.com', false);

    expect(mockToast.success).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();
  });
});

