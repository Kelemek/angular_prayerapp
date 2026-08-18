import { describe, it, expect, vi } from 'vitest';
import {
  declineEmailSubscriberWelcomeEmail,
  sendEmailSubscriberWelcomeEmail,
} from './admin-email-subscribers-welcome-email';

describe('sendEmailSubscriberWelcomeEmail', () => {
  it('no-ops when pending email is empty', async () => {
    const result = await sendEmailSubscriberWelcomeEmail(
      { sendSubscriberWelcomeEmail: vi.fn() },
      { success: vi.fn(), error: vi.fn() },
      undefined,
      '',
    );

    expect(result).toEqual({
      sent: false,
      clearPending: false,
      hideAddForm: false,
    });
  });

  it('sends welcome email and closes dialog on success', async () => {
    const adminDataService = {
      sendSubscriberWelcomeEmail: vi.fn().mockResolvedValue(undefined),
    };
    const toast = { success: vi.fn(), error: vi.fn() };
    const host = { closeWelcomeEmailDialog: vi.fn() };

    const result = await sendEmailSubscriberWelcomeEmail(
      adminDataService,
      toast,
      host,
      'a@b.com',
    );

    expect(adminDataService.sendSubscriberWelcomeEmail).toHaveBeenCalledWith(
      'a@b.com',
    );
    expect(toast.success).toHaveBeenCalledWith('Welcome email sent to subscriber');
    expect(host.closeWelcomeEmailDialog).toHaveBeenCalled();
    expect(result).toEqual({ sent: true, clearPending: true, hideAddForm: true });
  });

  it('shows toast error when send fails', async () => {
    const adminDataService = {
      sendSubscriberWelcomeEmail: vi.fn().mockRejectedValue(new Error('fail')),
    };
    const toast = { success: vi.fn(), error: vi.fn() };

    const result = await sendEmailSubscriberWelcomeEmail(
      adminDataService,
      toast,
      undefined,
      'a@b.com',
    );

    expect(toast.error).toHaveBeenCalledWith('Failed to send welcome email');
    expect(result).toEqual({
      sent: false,
      clearPending: false,
      hideAddForm: false,
    });
  });
});

describe('declineEmailSubscriberWelcomeEmail', () => {
  it('closes dialog and signals cleanup', () => {
    const host = { closeWelcomeEmailDialog: vi.fn() };

    const result = declineEmailSubscriberWelcomeEmail(host);

    expect(host.closeWelcomeEmailDialog).toHaveBeenCalled();
    expect(result).toEqual({ clearPending: true, hideAddForm: true });
  });
});
