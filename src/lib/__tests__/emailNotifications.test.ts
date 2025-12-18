import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the email service and supabase client
vi.mock('../emailService', () => ({
  sendEmail: vi.fn(),
  sendEmailToAllSubscribers: vi.fn(),
  getTemplate: vi.fn(),
  applyTemplateVariables: (content: string, variables: Record<string, string>) => {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return result;
  }
}));

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import * as emailNotifications from '../emailNotifications';
import { supabase } from '../supabase';
import { sendEmail, sendEmailToAllSubscribers } from '../emailService';

describe('emailNotifications', () => {
  let consoleError: any;
  let consoleWarn: any;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // ensure window.location.origin exists for HTML generation
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { origin: 'http://localhost' }
      });
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('sends admin notification when admins exist and sendEmail resolves', async () => {
    // Arrange: make a chainable supabase.from(...).select().eq().eq().eq() => Promise<{data, error}>
    const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
    const chain3 = { eq: () => finalResult };
    const chain2 = { eq: () => chain3 };
    const chain1 = { eq: () => chain2 };
    const selectChain = { select: () => chain1 };
    (supabase.from as any).mockReturnValue(selectChain);

    (sendEmail as any).mockResolvedValue(undefined);

    // Act
    await emailNotifications.sendAdminNotification({ type: 'prayer', title: 'Test Prayer' });

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('email_subscribers');
    expect(sendEmail).toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('warns and returns when no admins are configured', async () => {
    const finalResult = Promise.resolve({ data: [], error: null });
    const chain3 = { eq: () => finalResult };
    const chain2 = { eq: () => chain3 };
    const chain1 = { eq: () => chain2 };
    const selectChain = { select: () => chain1 };
    (supabase.from as any).mockReturnValue(selectChain);

    await emailNotifications.sendAdminNotification({ type: 'prayer', title: 'No Admins' });

    expect(consoleWarn).toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('warns when requester email is missing for requester approval', async () => {
    await emailNotifications.sendRequesterApprovalNotification({
      title: 'T',
      description: 'D',
      requester: 'Bob',
      requesterEmail: '' as any,
      prayerFor: 'All'
    });

    expect(consoleWarn).toHaveBeenCalled();
  });

  it('logs error when sendEmail throws for requester approval', async () => {
    (sendEmail as any).mockRejectedValue(new Error('send-failed'));

    await emailNotifications.sendRequesterApprovalNotification({
      title: 'T',
      description: 'D',
      requester: 'Bob',
      requesterEmail: 'bob@example.com',
      prayerFor: 'All'
    });

    // The internal invokeSendNotification should catch and return an error which causes logging
    expect(consoleError).toHaveBeenCalled();
  });

  it('calls sendEmailToAllSubscribers for approved prayer notification', async () => {
    (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

    await emailNotifications.sendApprovedPrayerNotification({
      title: 'T',
      description: 'D',
      requester: 'Alice',
      prayerFor: 'World',
      status: 'open'
    });

    expect(sendEmailToAllSubscribers).toHaveBeenCalled();
  });

  it('warns when denied prayer requester email is missing', async () => {
    await emailNotifications.sendDeniedPrayerNotification({
      title: 'Bad',
      description: 'D',
      requester: 'NoEmail',
      requesterEmail: '' as any,
      denialReason: 'reason'
    });

    expect(consoleWarn).toHaveBeenCalled();
  });

  it('warns when denied update author email is missing', async () => {
    await emailNotifications.sendDeniedUpdateNotification({
      prayerTitle: 'P',
      content: 'C',
      author: 'X',
      authorEmail: '' as any,
      denialReason: 'nope'
    });

    expect(consoleWarn).toHaveBeenCalled();
  });

  it('sends preference change admin notification when subscribers exist', async () => {
    // Mock supabase.from(...).select().eq().eq().eq() chain
    const finalResult = Promise.resolve({ data: [{ email: 'admin2@example.com' }], error: null });
    const mockSelect = {
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(finalResult)
        })
      })
    };
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(mockSelect)
    });

    (sendEmail as any).mockResolvedValue(undefined);

    await emailNotifications.sendPreferenceChangeNotification({ name: 'Sam', email: 'sam@example.com', receiveNotifications: true });

    expect(sendEmail).toHaveBeenCalled();
  });

  it('sends approved update notification via sendEmailToAllSubscribers and logs on failure', async () => {
    // Mock getTemplate to return a template
    const { getTemplate } = await import('../emailService');
    (getTemplate as any).mockResolvedValue({
      id: 'test-id',
      template_key: 'approved_update',
      name: 'Approved Update',
      subject: 'Prayer Update: {{prayerTitle}}',
      html_body: 'Update: {{updateContent}}',
      text_body: 'Update: {{updateContent}}',
      description: 'Test template'
    });

    // success path
    (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

    await emailNotifications.sendApprovedUpdateNotification({
      prayerTitle: 'PT',
      content: 'C',
      author: 'A',
      markedAsAnswered: false
    });

    expect(sendEmailToAllSubscribers).toHaveBeenCalled();

    // failure path - force it to throw and expect console.error
    (sendEmailToAllSubscribers as any).mockRejectedValue(new Error('bulk-fail'));
    
    // Mock getTemplate again for the second call
    (getTemplate as any).mockResolvedValue({
      id: 'test-id-2',
      template_key: 'prayer_answered',
      name: 'Prayer Answered',
      subject: 'Prayer Answered: {{prayerTitle}}',
      html_body: 'Prayer answered: {{updateContent}}',
      text_body: 'Prayer answered: {{updateContent}}',
      description: 'Test template'
    });

    await emailNotifications.sendApprovedUpdateNotification({
      prayerTitle: 'PT2',
      content: 'C2',
      author: 'A2',
      markedAsAnswered: true
    });

    expect(consoleError).toHaveBeenCalled();
  });

  it('sends approved preference change notification and handles send errors', async () => {
    (sendEmail as any).mockResolvedValue(undefined);
    await emailNotifications.sendApprovedPreferenceChangeNotification({ name: 'N', email: 'n@example.com', receiveNotifications: true });
    expect(sendEmail).toHaveBeenCalled();

    (sendEmail as any).mockRejectedValue(new Error('boom'));
    await emailNotifications.sendApprovedPreferenceChangeNotification({ name: 'N2', email: 'n2@example.com', receiveNotifications: false });
    expect(consoleError).toHaveBeenCalled();
  });

  it('sends denied preference change notification and handles send errors', async () => {
    (sendEmail as any).mockResolvedValue(undefined);
    await emailNotifications.sendDeniedPreferenceChangeNotification({ name: 'D', email: 'd@example.com', receiveNotifications: true, denialReason: 'r' });
    expect(sendEmail).toHaveBeenCalled();

    (sendEmail as any).mockRejectedValue(new Error('boom2'));
    await emailNotifications.sendDeniedPreferenceChangeNotification({ name: 'D2', email: 'd2@example.com', receiveNotifications: false, denialReason: 'r2' });
    expect(consoleError).toHaveBeenCalled();
  });

  describe('sendAdminNotification - Additional Coverage', () => {
    it('uses provided adminEmails instead of querying database', async () => {
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendAdminNotification({
        type: 'prayer',
        title: 'Test Prayer',
        adminEmails: ['provided@example.com', 'also-provided@example.com']
      });

      expect(supabase.from).not.toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });

    it('handles error when fetching admin emails from database', async () => {
      const finalResult = Promise.resolve({ data: null, error: new Error('DB Error') });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      await emailNotifications.sendAdminNotification({
        type: 'prayer',
        title: 'Test Prayer'
      });

      expect(consoleError).toHaveBeenCalled();
    });

    it('logs and returns when admins data is null from database', async () => {
      const finalResult = Promise.resolve({ data: null, error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      await emailNotifications.sendAdminNotification({
        type: 'prayer',
        title: 'No Admin Result'
      });

      expect(consoleWarn).toHaveBeenCalled();
    });

    it('generates approval link for prayer requests with requestId', async () => {
      (sendEmail as any).mockResolvedValue(undefined);
      const { getTemplate } = await import('../emailService');
      (getTemplate as any).mockResolvedValue(null); // Will use fallback

      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      await emailNotifications.sendAdminNotification({
        type: 'prayer',
        title: 'Prayer with Link',
        requestId: 'prayer-123'
      });

      expect(sendEmail).toHaveBeenCalled();
    });

    it('skips approval link generation for status-change type', async () => {
      (sendEmail as any).mockResolvedValue(undefined);

      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      await emailNotifications.sendAdminNotification({
        type: 'status-change',
        title: 'Status Change',
        requestId: 'req-123'
      });

      // Should send email with default link since status-change type skips approval code
      expect(sendEmail).toHaveBeenCalled();
    });

    it('uses fallback HTML generation when template is missing', async () => {
      (sendEmail as any).mockResolvedValue(undefined);
      const { getTemplate } = await import('../emailService');
      (getTemplate as any).mockResolvedValue(null);

      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      await emailNotifications.sendAdminNotification({
        type: 'prayer',
        title: 'Test',
        description: 'Desc'
      });

      expect(sendEmail).toHaveBeenCalled();
      const call = (sendEmail as any).mock.calls[0][0];
      expect(call.htmlBody).toBeTruthy();
    });

    it('handles sendEmail error gracefully', async () => {
      (sendEmail as any).mockRejectedValue(new Error('Send failed'));

      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      await emailNotifications.sendAdminNotification({
        type: 'prayer',
        title: 'Will Fail'
      });

      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('sendRequesterApprovalNotification', () => {
    it('sends approval notification to requester with valid email', async () => {
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendRequesterApprovalNotification({
        title: 'Prayer Title',
        description: 'Prayer Description',
        requester: 'John',
        requesterEmail: 'john@example.com',
        prayerFor: 'Peace'
      });

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['john@example.com']
        })
      );
    });

    it('warns when requesterEmail is empty string', async () => {
      await emailNotifications.sendRequesterApprovalNotification({
        title: 'T',
        description: 'D',
        requester: 'NoEmail',
        requesterEmail: '',
        prayerFor: 'All'
      });

      expect(consoleWarn).toHaveBeenCalled();
    });

    it('handles sendEmail errors in approval notification', async () => {
      (sendEmail as any).mockRejectedValue(new Error('Send error'));

      await emailNotifications.sendRequesterApprovalNotification({
        title: 'T',
        description: 'D',
        requester: 'User',
        requesterEmail: 'user@example.com',
        prayerFor: 'Health'
      });

      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('sendApprovedPrayerNotification', () => {
    it('sends to all subscribers when prayer is approved', async () => {
      (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

      await emailNotifications.sendApprovedPrayerNotification({
        title: 'Approved Prayer',
        description: 'Now showing to everyone',
        requester: 'John',
        prayerFor: 'World',
        status: 'open'
      });

      expect(sendEmailToAllSubscribers).toHaveBeenCalled();
    });

    it('handles sendEmailToAllSubscribers errors', async () => {
      (sendEmailToAllSubscribers as any).mockRejectedValue(new Error('Bulk send failed'));

      await emailNotifications.sendApprovedPrayerNotification({
        title: 'T',
        description: 'D',
        requester: 'R',
        prayerFor: 'All',
        status: 'open'
      });

      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('sendDeniedPrayerNotification', () => {
    it('sends denial notification to requester with reason', async () => {
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendDeniedPrayerNotification({
        title: 'Denied Prayer',
        description: 'Did not meet guidelines',
        requester: 'Jane',
        requesterEmail: 'jane@example.com',
        denialReason: 'Inappropriate content'
      });

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['jane@example.com']
        })
      );
    });

    it('warns when requesterEmail is empty for denial', async () => {
      await emailNotifications.sendDeniedPrayerNotification({
        title: 'Denied',
        description: 'Content',
        requester: 'NoEmail',
        requesterEmail: '',
        denialReason: 'Nope'
      });

      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe('sendDeniedUpdateNotification', () => {
    it('sends denial to update author', async () => {
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendDeniedUpdateNotification({
        prayerTitle: 'Prayer Title',
        content: 'Update content',
        author: 'UpdateAuthor',
        authorEmail: 'author@example.com',
        denialReason: 'Spelling errors'
      });

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['author@example.com']
        })
      );
    });

    it('warns when authorEmail is empty for update denial', async () => {
      await emailNotifications.sendDeniedUpdateNotification({
        prayerTitle: 'P',
        content: 'C',
        author: 'NoEmail',
        authorEmail: '',
        denialReason: 'Bad update'
      });

      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe('sendApprovedUpdateNotification', () => {
    it('sends approved update notification to subscribers', async () => {
      const { getTemplate } = await import('../emailService');
      (getTemplate as any).mockResolvedValue({
        id: 'id-1',
        template_key: 'approved_update',
        subject: 'Update: {{prayerTitle}}',
        html_body: 'HTML: {{updateContent}}',
        text_body: 'Text: {{updateContent}}',
        description: 'Template'
      });

      (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

      await emailNotifications.sendApprovedUpdateNotification({
        prayerTitle: 'Prayer',
        content: 'Update text',
        author: 'Author',
        markedAsAnswered: false
      });

      expect(sendEmailToAllSubscribers).toHaveBeenCalled();
    });

    it('uses answered template when markedAsAnswered is true', async () => {
      const { getTemplate } = await import('../emailService');
      (getTemplate as any).mockResolvedValue({
        id: 'id-2',
        template_key: 'prayer_answered',
        subject: 'Answered: {{prayerTitle}}',
        html_body: 'Answered HTML',
        text_body: 'Answered text',
        description: 'Template'
      });

      (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

      await emailNotifications.sendApprovedUpdateNotification({
        prayerTitle: 'Prayer',
        content: 'Update',
        author: 'Author',
        markedAsAnswered: true
      });

      expect(sendEmailToAllSubscribers).toHaveBeenCalled();
    });
  });

  describe('sendPreferenceChangeNotification', () => {
    it('sends preference change notification to admins', async () => {
      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const mockSelect = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(finalResult)
          })
        })
      };
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue(mockSelect)
      });

      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendPreferenceChangeNotification({
        name: 'John',
        email: 'john@example.com',
        receiveNotifications: true
      });

      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe('sendApprovedPreferenceChangeNotification', () => {
    it('sends approval for enabled notifications', async () => {
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendApprovedPreferenceChangeNotification({
        name: 'Jane',
        email: 'jane@example.com',
        receiveNotifications: true
      });

      expect(sendEmail).toHaveBeenCalled();
    });

    it('sends approval for disabled notifications', async () => {
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendApprovedPreferenceChangeNotification({
        name: 'Jack',
        email: 'jack@example.com',
        receiveNotifications: false
      });

      expect(sendEmail).toHaveBeenCalled();
    });
  });
});
