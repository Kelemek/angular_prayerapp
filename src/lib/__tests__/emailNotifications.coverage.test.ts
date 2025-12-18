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

vi.mock('../approvalLinks', () => ({
  generateApprovalLink: vi.fn()
}));

import * as emailNotifications from '../emailNotifications';
import { supabase } from '../supabase';
import { sendEmail, sendEmailToAllSubscribers, getTemplate } from '../emailService';
import { generateApprovalLink } from '../approvalLinks';

describe('emailNotifications - Additional Coverage Tests', () => {
  let consoleError: any;
  let consoleWarn: any;
  let consoleLog: any;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Ensure window.location.origin exists for HTML generation
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { origin: 'http://localhost:3000' }
      });
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    consoleLog.mockRestore();
  });

  describe('sendAdminNotification - update type with templates', () => {
    it('sends update notification using template', async () => {
      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      (getTemplate as any).mockResolvedValue({
        id: 'update-template',
        template_key: 'admin_notification_update',
        subject: 'New Update: {{prayerTitle}}',
        html_body: '<p>{{updateContent}}</p>',
        text_body: 'Update: {{updateContent}}',
        description: 'Update template'
      });

      (sendEmail as any).mockResolvedValue(undefined);
      (generateApprovalLink as any).mockResolvedValue('http://localhost:3000/approve-update');

      await emailNotifications.sendAdminNotification({
        type: 'update',
        title: 'Prayer Title',
        author: 'John Doe',
        content: 'This is an update',
        requestId: 'update-123'
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(generateApprovalLink).toHaveBeenCalledWith('update', 'update-123', 'admin@example.com');
    });

    it('sends update notification using fallback when template fails', async () => {
      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockResolvedValue(undefined);
      (generateApprovalLink as any).mockResolvedValue(null);

      await emailNotifications.sendAdminNotification({
        type: 'update',
        title: 'Update Prayer',
        author: 'Jane Smith',
        content: 'Update content here',
        requestId: 'update-456'
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe('sendAdminNotification - deletion type', () => {
    it('sends deletion notification using template', async () => {
      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      (getTemplate as any).mockResolvedValue({
        id: 'deletion-template',
        template_key: 'admin_notification_deletion',
        subject: 'Deletion Request: {{prayerTitle}}',
        html_body: '<p>Reason: {{reason}}</p>',
        text_body: 'Reason: {{reason}}',
        description: 'Deletion template'
      });

      (sendEmail as any).mockResolvedValue(undefined);
      (generateApprovalLink as any).mockResolvedValue('http://localhost:3000/approve-deletion');

      await emailNotifications.sendAdminNotification({
        type: 'deletion',
        title: 'Prayer to Delete',
        requestedBy: 'User Name',
        reason: 'No longer needed',
        requestId: 'deletion-789'
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(generateApprovalLink).toHaveBeenCalledWith('deletion', 'deletion-789', 'admin@example.com');
    });

    it('sends deletion notification using fallback when template fails', async () => {
      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendAdminNotification({
        type: 'deletion',
        title: 'Delete This',
        requestedBy: 'Bob',
        reason: 'Test reason',
        requestId: 'del-123'
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe('sendAdminNotification - status-change type', () => {
    it('sends status-change notification without template', async () => {
      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendAdminNotification({
        type: 'status-change',
        title: 'Status Change Prayer',
        currentStatus: 'open',
        requestedStatus: 'answered',
        requestedBy: 'User',
        reason: 'Prayer answered'
      });

      expect(sendEmail).toHaveBeenCalled();
      const call = (sendEmail as any).mock.calls[0][0];
      expect(call.subject).toContain('Status Change Request');
    });
  });

  describe('sendApprovedPrayerNotification - template handling', () => {
    it('uses template when available', async () => {
      (getTemplate as any).mockResolvedValue({
        id: 'approved-template',
        template_key: 'approved_prayer',
        subject: 'New Prayer: {{prayerTitle}}',
        html_body: '<p>{{prayerDescription}}</p>',
        text_body: 'Prayer: {{prayerDescription}}',
        description: 'Approved prayer template'
      });

      (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

      await emailNotifications.sendApprovedPrayerNotification({
        title: 'New Prayer Request',
        description: 'Please pray for...',
        requester: 'Alice',
        prayerFor: 'Family',
        status: 'open'
      });

      expect(sendEmailToAllSubscribers).toHaveBeenCalled();
    });

    it('uses fallback HTML when template is not available', async () => {
      (getTemplate as any).mockResolvedValue(null);
      (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

      await emailNotifications.sendApprovedPrayerNotification({
        title: 'Fallback Prayer',
        description: 'Description text',
        requester: 'Bob',
        prayerFor: 'Health',
        status: 'open'
      });

      expect(sendEmailToAllSubscribers).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();
    });

    it('uses fallback when template loading throws error', async () => {
      (getTemplate as any).mockRejectedValue(new Error('Template load error'));
      (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

      await emailNotifications.sendApprovedPrayerNotification({
        title: 'Error Case Prayer',
        description: 'Desc',
        requester: 'Charlie',
        prayerFor: 'World',
        status: 'open'
      });

      expect(sendEmailToAllSubscribers).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe('sendApprovedUpdateNotification - template not found', () => {
    it('returns early when template is not found', async () => {
      (getTemplate as any).mockResolvedValue(null);

      await emailNotifications.sendApprovedUpdateNotification({
        prayerTitle: 'Prayer',
        content: 'Update',
        author: 'Author',
        markedAsAnswered: false
      });

      expect(consoleError).toHaveBeenCalled();
      expect(sendEmailToAllSubscribers).not.toHaveBeenCalled();
    });
  });

  describe('sendDeniedPrayerNotification - template handling', () => {
    it('uses template when available', async () => {
      (getTemplate as any).mockResolvedValue({
        id: 'denied-prayer-template',
        template_key: 'denied_prayer',
        subject: 'Prayer Not Approved: {{prayerTitle}}',
        html_body: '<p>Reason: {{denialReason}}</p>',
        text_body: 'Reason: {{denialReason}}',
        description: 'Denied prayer template'
      });

      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendDeniedPrayerNotification({
        title: 'Denied Prayer',
        description: 'Prayer description',
        requester: 'David',
        requesterEmail: 'david@example.com',
        denialReason: 'Does not meet guidelines'
      });

      expect(sendEmail).toHaveBeenCalled();
    });

    it('uses fallback when template is not available', async () => {
      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendDeniedPrayerNotification({
        title: 'Denied No Template',
        description: 'Desc',
        requester: 'Eve',
        requesterEmail: 'eve@example.com',
        denialReason: 'Reason here'
      });

      expect(sendEmail).toHaveBeenCalled();
      // No warning is logged when template is null (just uses fallback)
    });

    it('uses fallback when template loading throws', async () => {
      (getTemplate as any).mockRejectedValue(new Error('Template error'));
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendDeniedPrayerNotification({
        title: 'Error Prayer',
        description: 'Desc',
        requester: 'Frank',
        requesterEmail: 'frank@example.com',
        denialReason: 'Error reason'
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe('sendDeniedUpdateNotification - template handling', () => {
    it('uses template when available', async () => {
      (getTemplate as any).mockResolvedValue({
        id: 'denied-update-template',
        template_key: 'denied_update',
        subject: 'Update Not Approved: {{prayerTitle}}',
        html_body: '<p>Reason: {{denialReason}}</p>',
        text_body: 'Reason: {{denialReason}}',
        description: 'Denied update template'
      });

      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendDeniedUpdateNotification({
        prayerTitle: 'Prayer Title',
        content: 'Update content',
        author: 'Grace',
        authorEmail: 'grace@example.com',
        denialReason: 'Inappropriate language'
      });

      expect(sendEmail).toHaveBeenCalled();
    });

    it('uses fallback when template is not available', async () => {
      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendDeniedUpdateNotification({
        prayerTitle: 'Prayer',
        content: 'Update',
        author: 'Harry',
        authorEmail: 'harry@example.com',
        denialReason: 'Spam'
      });

      expect(sendEmail).toHaveBeenCalled();
      // No warning is logged when template is null (just uses fallback)
    });

    it('uses fallback when template loading throws', async () => {
      (getTemplate as any).mockRejectedValue(new Error('Load failed'));
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendDeniedUpdateNotification({
        prayerTitle: 'Prayer X',
        content: 'Content X',
        author: 'Iris',
        authorEmail: 'iris@example.com',
        denialReason: 'Test reason'
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe('sendPreferenceChangeNotification - additional paths', () => {
    it('sends notification with provided adminEmails', async () => {
      (sendEmail as any).mockResolvedValue(undefined);
      (generateApprovalLink as any).mockResolvedValue('http://localhost:3000/approve-pref');

      await emailNotifications.sendPreferenceChangeNotification({
        name: 'Jack',
        email: 'jack@example.com',
        receiveNotifications: true,
        adminEmails: ['custom-admin@example.com'],
        requestId: 'pref-123'
      });

      expect(supabase.from).not.toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });

    it('handles database error when fetching admin emails', async () => {
      const finalResult = Promise.resolve({ data: null, error: new Error('DB Error') });
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

      await emailNotifications.sendPreferenceChangeNotification({
        name: 'Kate',
        email: 'kate@example.com',
        receiveNotifications: false
      });

      expect(consoleError).toHaveBeenCalled();
    });

    it('warns when no admins are configured for preference change', async () => {
      const finalResult = Promise.resolve({ data: [], error: null });
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

      await emailNotifications.sendPreferenceChangeNotification({
        name: 'Leo',
        email: 'leo@example.com',
        receiveNotifications: true
      });

      expect(consoleWarn).toHaveBeenCalled();
    });

    it('uses template for preference change notification', async () => {
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

      (getTemplate as any).mockResolvedValue({
        id: 'pref-template',
        template_key: 'admin_notification_preference_change',
        subject: 'Preference Change: {{name}}',
        html_body: '<p>{{preferenceDescription}}</p>',
        text_body: 'Preference: {{preferenceDescription}}',
        description: 'Pref change template'
      });

      (sendEmail as any).mockResolvedValue(undefined);
      (generateApprovalLink as any).mockResolvedValue('http://localhost:3000/approve');

      await emailNotifications.sendPreferenceChangeNotification({
        name: 'Maria',
        email: 'maria@example.com',
        receiveNotifications: true,
        requestId: 'pref-456'
      });

      expect(sendEmail).toHaveBeenCalled();
    });

    it('uses fallback when preference change template is not found', async () => {
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

      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendPreferenceChangeNotification({
        name: 'Nina',
        email: 'nina@example.com',
        receiveNotifications: false
      });

      expect(sendEmail).toHaveBeenCalled();
      expect(consoleWarn).toHaveBeenCalled();
    });

    it('handles sendEmail error in preference change notification', async () => {
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

      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockRejectedValue(new Error('Email send failed'));

      await emailNotifications.sendPreferenceChangeNotification({
        name: 'Oscar',
        email: 'oscar@example.com',
        receiveNotifications: true
      });

      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('HTML generation functions - coverage', () => {
    it('generates default HTML for unknown notification type', async () => {
      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockResolvedValue(undefined);

      // Use an unknown type to trigger default HTML generation
      await emailNotifications.sendAdminNotification({
        type: 'unknown-type' as any,
        title: 'Unknown'
      });

      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe('Edge cases for approval link generation', () => {
    it('logs when approval link returns null', async () => {
      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockResolvedValue(undefined);
      (generateApprovalLink as any).mockResolvedValue(null);

      await emailNotifications.sendAdminNotification({
        type: 'prayer',
        title: 'Prayer with null link',
        requestId: 'prayer-null'
      });

      expect(consoleWarn).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });

    it('generates approval link for preference change with requestId', async () => {
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

      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockResolvedValue(undefined);
      (generateApprovalLink as any).mockResolvedValue(null);

      await emailNotifications.sendPreferenceChangeNotification({
        name: 'Paul',
        email: 'paul@example.com',
        receiveNotifications: true,
        requestId: 'pref-789'
      });

      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe('Environment variable handling', () => {
    it('handles missing window.location in approval link generation', async () => {
      const originalWindow = global.window;
      
      // Temporarily remove window
      delete (global as any).window;

      const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
      const chain3 = { eq: () => finalResult };
      const chain2 = { eq: () => chain3 };
      const chain1 = { eq: () => chain2 };
      const selectChain = { select: () => chain1 };
      (supabase.from as any).mockReturnValue(selectChain);

      (getTemplate as any).mockResolvedValue(null);
      (sendEmail as any).mockResolvedValue(undefined);

      await emailNotifications.sendAdminNotification({
        type: 'prayer',
        title: 'No Window Test'
      });

      expect(sendEmail).toHaveBeenCalled();

      // Restore window
      (global as any).window = originalWindow;
    });
  });
});
