import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendAdminInvitationEmail } from './admin-user-management-invitation';

describe('admin-user-management-invitation', () => {
  const emailService = {
    getTemplate: vi.fn(),
    getEmailBaseUrl: vi.fn(() => 'http://localhost:4200'),
    applyTemplateVariables: vi.fn((t: string) => `${t}-applied`),
    sendEmail: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses database template when available', async () => {
    emailService.getTemplate.mockResolvedValue({
      subject: 'S',
      html_body: 'H',
      text_body: 'T',
    });

    await sendAdminInvitationEmail(
      emailService as never,
      'x@y.com',
      'Name',
    );

    expect(emailService.getTemplate).toHaveBeenCalledWith('admin_invitation');
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'x@y.com' }),
    );
  });

  it('falls back when template missing', async () => {
    emailService.getTemplate.mockResolvedValue(null);

    await sendAdminInvitationEmail(
      emailService as never,
      'z@y.com',
      'Zed',
    );

    const sent = emailService.sendEmail.mock.calls[0][0];
    expect(sent.to).toBe('z@y.com');
    expect(sent.htmlBody).toContain('Zed');
    expect(sent.textBody).toContain('Zed');
  });

  it('rethrows when template lookup fails', async () => {
    emailService.getTemplate.mockRejectedValue(new Error('template fail'));

    await expect(
      sendAdminInvitationEmail(emailService as never, 'z@y.com', 'Zed'),
    ).rejects.toThrow('template fail');
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('throws when sendEmail fails', async () => {
    emailService.getTemplate.mockResolvedValue(null);
    emailService.sendEmail.mockRejectedValue(new Error('send fail'));

    await expect(
      sendAdminInvitationEmail(emailService as never, 'x@y.com', 'Name'),
    ).rejects.toThrow('send fail');
  });
});
