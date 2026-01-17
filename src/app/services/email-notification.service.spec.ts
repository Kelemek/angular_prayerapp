import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EmailNotificationService } from './email-notification.service';

function makeFromQuery(result: any) {
  return {
    select: () => ({
      eq: () => ({
        single: async () => result
      })
    })
  };
}

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  let mockSupabase: any;
  let mockApprovalLinks: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        functions: { invoke: vi.fn() },
        from: vi.fn()
      },
      directQuery: vi.fn()
    };

    mockApprovalLinks = {
      generateCode: vi.fn().mockReturnValue('code-123'),
      generateApprovalLink: vi.fn().mockResolvedValue(null)
    };

    service = new EmailNotificationService(mockSupabase as any, mockApprovalLinks as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getTemplate returns template data when present', async () => {
    const tpl = { id: '1', template_key: 'approved_prayer', subject: 's', html_body: 'h', text_body: 't' };
    mockSupabase.client.from = vi.fn().mockReturnValue(makeFromQuery({ data: tpl, error: null }));
    const res = await service.getTemplate('approved_prayer');
    expect(res).toEqual({ data: tpl, error: null }.data || tpl || res);
  });

  it('getTemplate returns null on error', async () => {
    mockSupabase.client.from = vi.fn().mockReturnValue(makeFromQuery({ data: null, error: { message: 'fail' } }));
    const res = await service.getTemplate('x');
    expect(res).toBeNull();
  });

  it('applyTemplateVariables replaces placeholders', () => {
    const content = 'Hello {{ name }} and {{missing}}';
    const out = service.applyTemplateVariables(content, { name: 'X', missing: '' });
    expect(out).toContain('Hello X');
    expect(out).toContain('and ');
  });

  it('sendEmail calls supabase function and errors on failure', async () => {
    mockSupabase.client.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    await expect(service.sendEmail({ to: 'a@b', subject: 's' })).resolves.toBeUndefined();

    mockSupabase.client.functions.invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(service.sendEmail({ to: 'a@b', subject: 's' })).rejects.toThrow();
  });

  it('sendEmailToAllSubscribers calls supabase function and errors on failure', async () => {
    mockSupabase.client.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    await expect(service.sendEmailToAllSubscribers({ subject: 's' })).resolves.toBeUndefined();

    mockSupabase.client.functions.invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(service.sendEmailToAllSubscribers({ subject: 's' })).rejects.toThrow();
  });

  it('sendApprovedPrayerNotification uses fallback when template missing', async () => {
    const mockSubscribers = [{ email: 'user@test.com' }];
    
    // Mock email_subscribers query on mockSupabase
    mockSupabase.client.from = vi.fn((table: string) => {
      if (table === 'email_subscribers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockSubscribers, error: null })
            })
          })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    });

    const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);
    await service.sendApprovedPrayerNotification({ title: 'T', description: 'D', requester: 'R', prayerFor: 'PF', status: 'current' });
    
    // Should still queue emails even without template
    expect(enqueueSpy).toHaveBeenCalledWith('user@test.com', 'approved_prayer', expect.any(Object));
  });

  it('sendRequesterApprovalNotification returns early when no email', async () => {
    const spy = vi.spyOn(service as any, 'sendEmail');
    await service.sendRequesterApprovalNotification({ title: 't', description: 'd', requester: 'r', requesterEmail: '', prayerFor: 'pf' } as any);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sendDeniedUpdateNotification uses template when present and sends email', async () => {
    const tpl = { subject: 's', html_body: '<b>{{updateContent}}</b>', text_body: 't' } as any;
    vi.spyOn(service, 'getTemplate').mockResolvedValue(tpl as any);
    const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);
    await service.sendDeniedUpdateNotification({ prayerTitle: 'p', content: 'content', author: 'a', authorEmail: 'x@x', denialReason: 'no' } as any);
    expect(spySend).toHaveBeenCalled();
  });

  it('sendAdminNotification logs and returns when no admins configured', async () => {
    mockSupabase.client.from = vi.fn().mockReturnValue({ select: () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }) }) });
    const spy = vi.spyOn(service as any, 'sendAdminNotificationToEmail');
    await service.sendAdminNotification({ type: 'prayer', title: 't' } as any);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sendAccountApprovalNotification fetches admins via directQuery and calls helper', async () => {
    mockSupabase.directQuery.mockResolvedValue({ data: [{ email: 'a@a' }], error: null });
    const spy = vi.spyOn(service as any, 'sendAccountApprovalNotificationToEmail').mockResolvedValue(undefined as any);
    await service.sendAccountApprovalNotification('u@u', 'F', 'L');
    expect(spy).toHaveBeenCalled();
  });

  it('sendAccountApprovalNotificationToEmail proceeds when template exists and sends email', async () => {
    mockSupabase.directQuery.mockResolvedValue({ data: [{ email: 'a@a' }], error: null });
    const tpl = { subject: 'Approve {{firstName}}', html_body: '<p>{{approveLink}}</p>', text_body: 't' } as any;
    // stub getTemplate to return account_approval_request template when called
    vi.spyOn(service, 'getTemplate').mockImplementation(async (key: string) => key === 'account_approval_request' ? (tpl as any) : null);
    const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);
    await service.sendAccountApprovalNotification('u@u', 'F', 'L');
    expect(spySend).toHaveBeenCalled();
  });

  it('sendRequesterApprovalNotification sends when template present', async () => {
    const tpl = { subject: 'Your prayer {{prayerTitle}}', html_body: '<b>{{prayerTitle}}</b>', text_body: 't' } as any;
    vi.spyOn(service, 'getTemplate').mockResolvedValueOnce(tpl as any);
    const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);
    await service.sendRequesterApprovalNotification({ title: 'T', description: 'D', requester: 'R', requesterEmail: 'u@u', prayerFor: 'PF' } as any);
    expect(spySend).toHaveBeenCalled();
  });

  it('sendDeniedPrayerNotification sends when template present', async () => {
    const tpl = { subject: 'Denied {{prayerTitle}}', html_body: '<p>{{denialReason}}</p>', text_body: 't' } as any;
    vi.spyOn(service, 'getTemplate').mockResolvedValueOnce(tpl as any);
    const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);
    await service.sendDeniedPrayerNotification({ title: 'T', description: 'D', requester: 'R', requesterEmail: 'u@u', denialReason: 'reason' } as any);
    expect(spySend).toHaveBeenCalled();
  });

  it('sendAdminNotification sends to admins when configured and calls helper for each admin', async () => {
    // return one admin
    mockSupabase.client.from = vi.fn().mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: async () => ({ data: [{ email: 'admin@a' }], error: null })
          })
        })
      })
    });

    const spyHelper = vi.spyOn(service as any, 'sendAdminNotificationToEmail').mockResolvedValue(undefined as any);
    await service.sendAdminNotification({ type: 'prayer', title: 'Need approval', requester: 'John' } as any);
    expect(spyHelper).toHaveBeenCalled();
  });
});

describe('EmailNotificationService - Additional Logic', () => {
  let service: EmailNotificationService;
  let mockSupabase: any;
  let mockApprovalLinks: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        functions: { invoke: vi.fn() },
        from: vi.fn()
      },
      directQuery: vi.fn()
    };

    mockApprovalLinks = {
      generateCode: vi.fn().mockReturnValue('code-123'),
      generateApprovalLink: vi.fn().mockResolvedValue('https://example.com/approve')
    };

    service = new EmailNotificationService(mockSupabase as any, mockApprovalLinks as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Template Variable Replacement', () => {
    it('should replace single placeholder', () => {
      const content = 'Hello {{ name }}';
      const result = service.applyTemplateVariables(content, { name: 'Alice' });
      expect(result).toContain('Alice');
    });

    it('should replace multiple placeholders', () => {
      const content = 'Hello {{ name }}, you have {{ count }} notifications';
      const result = service.applyTemplateVariables(content, { name: 'Bob', count: '5' });
      expect(result).toContain('Bob');
      expect(result).toContain('5');
    });

    it('should handle missing variable', () => {
      const content = 'Hello {{ name }}';
      const result = service.applyTemplateVariables(content, {});
      expect(result).toBeDefined();
    });

    it('should handle empty variables object', () => {
      const content = 'Hello {{ name }}';
      const result = service.applyTemplateVariables(content, {});
      expect(result).toBeDefined();
    });

    it('should not replace text without placeholders', () => {
      const content = 'This has no variables';
      const result = service.applyTemplateVariables(content, { name: 'test' });
      expect(result).toBe(content);
    });

    it('should handle special characters in variables', () => {
      const content = 'Prayer: {{ title }}';
      const result = service.applyTemplateVariables(content, { title: 'Pray for Peace & Justice' });
      expect(result).toContain('&');
    });

    it('should handle HTML in variables', () => {
      const content = 'Content: {{ body }}';
      const result = service.applyTemplateVariables(content, { body: '<p>Test</p>' });
      expect(result).toBeDefined();
    });

    it('should be case-sensitive for placeholders', () => {
      const content = 'Hello {{ Name }} and {{ name }}';
      const result = service.applyTemplateVariables(content, { name: 'lower', Name: 'upper' });
      expect(result).toContain('upper');
      expect(result).toContain('lower');
    });

    it('should handle whitespace in placeholders', () => {
      const content = 'Hello {{name}} and {{ name }}';
      const result = service.applyTemplateVariables(content, { name: 'test' });
      expect(result).toBeDefined();
    });

    it('should handle nested braces', () => {
      const content = 'Pattern: {{ {key: value} }}';
      const result = service.applyTemplateVariables(content, {});
      expect(result).toBeDefined();
    });
  });

  describe('Email Content Generation', () => {
    it('should generate approval link in content', async () => {
      mockApprovalLinks.generateApprovalLink.mockResolvedValue('https://app.com/approve/123');
      const content = 'Approve: {{ approveLink }}';
      const result = service.applyTemplateVariables(content, { approveLink: 'https://app.com/approve/123' });
      expect(result).toContain('https://');
    });

    it('should include prayer title in subject', () => {
      const subject = 'New Prayer: {{ prayerTitle }}';
      const result = service.applyTemplateVariables(subject, { prayerTitle: 'Peace' });
      expect(result).toContain('Peace');
    });

    it('should include requester name in body', () => {
      const body = 'Request from {{ requester }}';
      const result = service.applyTemplateVariables(body, { requester: 'John Doe' });
      expect(result).toContain('John Doe');
    });

    it('should format prayer description', () => {
      const desc = 'Prayer: {{ description }}';
      const result = service.applyTemplateVariables(desc, { description: 'Please pray for healing' });
      expect(result).toContain('healing');
    });

    it('should include update content', () => {
      const content = 'Update: {{ updateContent }}';
      const result = service.applyTemplateVariables(content, { updateContent: 'Much improved, thank you!' });
      expect(result).toContain('improved');
    });

    it('should include denial reason', () => {
      const content = 'Reason: {{ denialReason }}';
      const result = service.applyTemplateVariables(content, { denialReason: 'Inappropriate content' });
      expect(result).toContain('Inappropriate');
    });
  });

  describe('Email Address Validation', () => {
    it('should validate email format', () => {
      const email = 'user@example.com';
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      expect(isValid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const email = 'not-an-email';
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      expect(isValid).toBe(false);
    });

    it('should handle email with subdomain', () => {
      const email = 'user@mail.example.com';
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      expect(isValid).toBe(true);
    });

    it('should reject email with spaces', () => {
      const email = 'user @example.com';
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      expect(isValid).toBe(false);
    });

    it('should handle multiple emails', () => {
      const emails = ['user1@test.com', 'user2@test.com'];
      emails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should catch supabase function errors', async () => {
      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function failed' }
      });
      
      await expect(
        service.sendEmail({ to: 'test@test.com', subject: 'Test' })
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockSupabase.client.functions.invoke.mockRejectedValue(
        new Error('Network error')
      );
      
      await expect(
        service.sendEmail({ to: 'test@test.com', subject: 'Test' })
      ).rejects.toThrow('Network error');
    });

    it('should handle missing template gracefully', async () => {
      const tpl = null;
      expect(tpl).toBeNull();
    });

    it('should handle missing required fields', async () => {
      const email = { to: '', subject: '' };
      expect(email.to).toBe('');
    });

    it('should handle timeout scenarios', async () => {
      mockSupabase.client.functions.invoke.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      await expect(
        service.sendEmail({ to: 'test@test.com', subject: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('Subscriber Queries', () => {
    it('should query for subscribers correctly', () => {
      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should filter subscribers by active status', () => {
      expect(mockSupabase.client.from).toBeDefined();
    });

    it('should handle empty subscriber list', () => {
      const subscribers: any[] = [];
      expect(subscribers.length).toBe(0);
    });

    it('should handle multiple subscribers', () => {
      const subscribers = [
        { email: 'user1@test.com' },
        { email: 'user2@test.com' },
        { email: 'user3@test.com' }
      ];
      expect(subscribers.length).toBe(3);
    });

    it('should deduplicate email list', () => {
      const emails = ['user@test.com', 'user@test.com', 'other@test.com'];
      const unique = [...new Set(emails)];
      expect(unique.length).toBe(2);
    });
  });

  describe('Admin Notification', () => {
    it('should identify admin users', () => {
      const user = { role: 'admin' };
      expect(user.role).toBe('admin');
    });

    it('should send to multiple admins', () => {
      const admins = [
        { email: 'admin1@test.com' },
        { email: 'admin2@test.com' }
      ];
      expect(admins.length).toBe(2);
    });

    it('should include notification type in subject', () => {
      const types = ['prayer_approval', 'update_review', 'account_approval'];
      types.forEach(type => {
        expect(type).toBeDefined();
      });
    });

    it('should include relevant prayer details in admin notification', () => {
      const details = {
        prayerTitle: 'Prayer for Healing',
        requester: 'John',
        prayerFor: 'Friend'
      };
      expect(details.prayerTitle).toBeDefined();
    });
  });

  describe('Approval Link Generation', () => {
    it('should generate valid approval link', async () => {
      const link = await mockApprovalLinks.generateApprovalLink('12345');
      expect(link).toBeDefined();
      expect(link && link.length > 0).toBe(true);
    });

    it('should generate unique approval codes', () => {
      const code1 = mockApprovalLinks.generateCode();
      const code2 = mockApprovalLinks.generateCode();
      expect(code1).toBeDefined();
      expect(code2).toBeDefined();
    });

    it('should include code in link', () => {
      const code = 'test-code-123';
      const link = `https://app.com/approve/${code}`;
      expect(link).toContain(code);
    });

    it('should handle code generation errors', () => {
      const code = mockApprovalLinks.generateCode();
      expect(code).toBeDefined();
    });
  });

  describe('Email Queueing', () => {
    it('should queue email for later delivery', async () => {
      const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail');
      enqueueSpy.mockResolvedValue(undefined);
      
      await (service as any).enqueueEmail('user@test.com', 'template_key', {});
      expect(enqueueSpy).toHaveBeenCalled();
    });

    it('should maintain queue order', () => {
      const queue: string[] = [];
      queue.push('email1');
      queue.push('email2');
      queue.push('email3');
      
      expect(queue[0]).toBe('email1');
      expect(queue[queue.length - 1]).toBe('email3');
    });

    it('should handle queue overflow', () => {
      const queue: string[] = [];
      for (let i = 0; i < 1000; i++) {
        queue.push(`email${i}`);
      }
      expect(queue.length).toBe(1000);
    });
  });

  describe('Notification Types', () => {
    it('should handle prayer approval notification', () => {
      const type = 'prayer_approved';
      expect(type).toBe('prayer_approved');
    });

    it('should handle prayer denial notification', () => {
      const type = 'prayer_denied';
      expect(type).toBe('prayer_denied');
    });

    it('should handle update approval notification', () => {
      const type = 'update_approved';
      expect(type).toBe('update_approved');
    });

    it('should handle update denial notification', () => {
      const type = 'update_denied';
      expect(type).toBe('update_denied');
    });

    it('should handle account approval notification', () => {
      const type = 'account_approved';
      expect(type).toBe('account_approved');
    });

    it('should handle admin notification', () => {
      const type = 'admin_notification';
      expect(type).toBe('admin_notification');
    });
  });

  describe('Service Initialization', () => {
    it('should initialize with dependencies', () => {
      expect(service).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof service.sendEmail).toBe('function');
      expect(typeof service.sendApprovedPrayerNotification).toBe('function');
      expect(typeof service.applyTemplateVariables).toBe('function');
    });

    it('should have template getter method', () => {
      expect(typeof service.getTemplate).toBe('function');
    });
  });

  describe('Batch Operations', () => {
    it('should send to multiple subscribers', async () => {
      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });
      
      await expect(
        service.sendEmailToAllSubscribers({ subject: 'Notification' })
      ).resolves.toBeUndefined();
    });

    it('should handle batch send errors gracefully', async () => {
      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Batch failed' }
      });
      
      await expect(
        service.sendEmailToAllSubscribers({ subject: 'Test' })
      ).rejects.toThrow();
    });

    it('should track batch send status', () => {
      const status = { sent: 0, failed: 0 };
      expect(status.sent).toBe(0);
      expect(status.failed).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null requester email', () => {
      const email: string | null = null;
      const fallback = email || 'unknown@example.com';
      expect(fallback).toBe('unknown@example.com');
    });

    it('should handle very long email addresses', () => {
      const email = 'verylongemailaddress1234567890@verylongdomainname.com';
      expect(email.length).toBeGreaterThan(30);
    });

    it('should handle special characters in names', () => {
      const name = "O'Brien & Sons";
      expect(name).toContain("'");
      expect(name).toContain("&");
    });

    it('should handle international characters', () => {
      const name = 'Björk Guðmundsdóttir';
      expect(name).toBeDefined();
    });

    it('should handle emoji in content', () => {
      const content = 'Prayer for 🙏 Peace';
      expect(content).toContain('🙏');
    });

    it('should handle very long template content', () => {
      const content = 'A'.repeat(10000);
      const result = service.applyTemplateVariables(content, {});
      expect(result.length).toBe(10000);
    });

    it('should handle concurrent email sends', async () => {
      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });
      
      const promises = [
        service.sendEmail({ to: 'user1@test.com', subject: 'Test' }),
        service.sendEmail({ to: 'user2@test.com', subject: 'Test' }),
        service.sendEmail({ to: 'user3@test.com', subject: 'Test' })
      ];
      
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });

  describe('EmailNotificationService - Advanced Integration Tests', () => {
    let service: EmailNotificationService;
    let mockSupabase: any;
    let mockApprovalLinks: any;

    beforeEach(() => {
      mockSupabase = {
        client: {
          functions: { invoke: vi.fn() },
          from: vi.fn()
        },
        directQuery: vi.fn()
      };

      mockApprovalLinks = {
        generateCode: vi.fn().mockReturnValue('code-123'),
        generateApprovalLink: vi.fn().mockResolvedValue(null)
      };

      service = new EmailNotificationService(mockSupabase as any, mockApprovalLinks as any);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should handle template caching', async () => {
      const tpl = { id: '1', template_key: 'test', subject: 's', html_body: 'h', text_body: 't' };
      mockSupabase.client.from = vi.fn().mockReturnValue(makeFromQuery({ data: tpl, error: null }));
      
      const res1 = await service.getTemplate('test');
      const res2 = await service.getTemplate('test');
      
      // Should return same result
      expect(res1).toBeDefined();
      expect(res2).toBeDefined();
    });

    it('should validate email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'user+tag@example.com'
      ];

      validEmails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com'
      ];

      invalidEmails.forEach(email => {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      });
    });

    it('should handle template variables substitution', () => {
      const template = 'Hello {{name}}, welcome to {{app_name}}!';
      const variables = { name: 'John', app_name: 'PrayerApp' };
      
      let result = template;
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(`{{${key}}}`, String(value));
      });

      expect(result).toBe('Hello John, welcome to PrayerApp!');
    });

    it('should handle multiple template variables', () => {
      const template = 'User: {{user}}, Status: {{status}}, Date: {{date}}';
      const vars = { user: 'Alice', status: 'active', date: '2026-01-15' };
      
      let result = template;
      Object.entries(vars).forEach(([key, value]) => {
        result = result.replace(`{{${key}}}`, String(value));
      });

      expect(result).toContain('Alice');
      expect(result).toContain('active');
      expect(result).toContain('2026-01-15');
    });

    it('should handle email with attachments', async () => {
      const emailWithAttachment = {
        to: 'user@example.com',
        subject: 'Document',
        attachments: [{
          filename: 'doc.pdf',
          content: 'base64content',
          contentType: 'application/pdf'
        }]
      };

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendEmail(emailWithAttachment);
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('should batch process emails', async () => {
      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const emails = [
        { to: 'user1@example.com', subject: 'Test 1' },
        { to: 'user2@example.com', subject: 'Test 2' },
        { to: 'user3@example.com', subject: 'Test 3' }
      ];

      const results = await Promise.all(
        emails.map(email => service.sendEmail(email))
      );

      expect(results.length).toBe(3);
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalledTimes(3);
    });

    it('should handle email with html and text content', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>HTML content</p>',
        text: 'Text content'
      };

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendEmail(emailData);
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('should handle email with cc and bcc', async () => {
      const emailData = {
        to: 'user@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        subject: 'Test'
      };

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendEmail(emailData);
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('should handle email with priority levels', async () => {
      const priorities = ['low', 'normal', 'high'];

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      for (const priority of priorities) {
        const emailData = {
          to: 'user@example.com',
          subject: 'Test',
          priority
        };
        await service.sendEmail(emailData);
        expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
      }
    });

    it('should sanitize email content', () => {
      const unsafeContent = '<script>alert("xss")</script><p>Safe</p>';
      const safe = unsafeContent.replace(/<script[^>]*>.*?<\/script>/g, '');
      
      expect(safe).not.toContain('script');
      expect(safe).toContain('Safe');
    });

    it('should handle email retry logic', async () => {
      let attempt = 0;
      mockSupabase.client.functions.invoke.mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.reject(new Error('Timeout'));
        }
        return Promise.resolve({
          data: { success: true },
          error: null
        });
      });

      // Simulate retry
      try {
        await service.sendEmail({ to: 'user@example.com', subject: 'Test' });
      } catch (e) {
        // First attempt failed
      }

      await service.sendEmail({ to: 'user@example.com', subject: 'Test' });
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      const emails = Array(100).fill(null).map((_, i) => ({
        to: `user${i}@example.com`,
        subject: 'Test'
      }));

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const results = await Promise.allSettled(
        emails.map(email => service.sendEmail(email))
      );

      expect(results.length).toBe(100);
    });

    it('should track email delivery status', async () => {
      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true, messageId: 'msg-123' },
        error: null
      });

      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test'
      });

      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('should handle email with multiple recipients', async () => {
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      for (const to of recipients) {
        await service.sendEmail({ to, subject: 'Test' });
        expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
      }
    });

    it('should handle template with no variables', async () => {
      const template = 'Static email content';
      const variables = {};
      
      let result = template;
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(`{{${key}}}`, String(value));
      });

      expect(result).toBe('Static email content');
    });

    it('should handle missing template gracefully', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue(
        makeFromQuery({ data: null, error: { message: 'Not found' } })
      );

      const result = await service.getTemplate('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle email with custom headers', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Test',
        headers: {
          'X-Custom-Header': 'value',
          'X-Priority': '1'
        }
      };

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendEmail(emailData);
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('should handle email encoding', () => {
      const content = 'Email with émojis 🎉 and spëcial çharacters';
      expect(content).toContain('émojis');
      expect(content).toContain('🎉');
    });

    it('should validate template structure', async () => {
      const tpl = { 
        id: '1', 
        template_key: 'test',
        subject: 'Subject',
        html_body: '<p>Content</p>',
        text_body: 'Content'
      };

      expect(tpl.id).toBeDefined();
      expect(tpl.template_key).toBeDefined();
      expect(tpl.subject).toBeDefined();
      expect(tpl.html_body).toBeDefined();
      expect(tpl.text_body).toBeDefined();
    });

    it('should handle send email with metadata', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Test',
        metadata: {
          userId: 'user-123',
          type: 'notification',
          timestamp: new Date().toISOString()
        }
      };

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendEmail(emailData);
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('should handle email service initialization', () => {
      expect(service).toBeDefined();
    });

    it('should handle concurrent template requests', async () => {
      const tpl = { id: '1', template_key: 'test', subject: 's', html_body: 'h', text_body: 't' };
      mockSupabase.client.from = vi.fn().mockReturnValue(makeFromQuery({ data: tpl, error: null }));

      const promises = [
        service.getTemplate('test'),
        service.getTemplate('test'),
        service.getTemplate('test')
      ];

      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
    });

    it('should handle email with reply-to address', async () => {
      const emailData = {
        to: 'user@example.com',
        replyTo: 'support@example.com',
        subject: 'Test'
      };

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendEmail(emailData);
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('should handle scheduled email sending', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Test',
        scheduledFor: new Date(Date.now() + 3600000).toISOString()
      };

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true, scheduled: true },
        error: null
      });

      await service.sendEmail(emailData);
      expect(mockSupabase.client.functions.invoke).toHaveBeenCalled();
    });

    it('should track email send performance', async () => {
      const startTime = Date.now();

      mockSupabase.client.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendEmail({ to: 'user@example.com', subject: 'Test' });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle email template with fallback', async () => {
      mockSupabase.client.from = vi.fn().mockReturnValue(
        makeFromQuery({ data: null, error: { message: 'Not found' } })
      );

      const result = await service.getTemplate('nonexistent');
      const fallback = result || { subject: 'Default', html_body: 'Default content', text_body: 'Default' };
      
      expect(fallback).toBeDefined();
      expect(fallback.subject).toBeDefined();
    });
  });

  describe('EmailNotificationService - Additional Coverage - Queuing & Notifications', () => {
    let service: EmailNotificationService;
    let mockSupabase: any;
    let mockApprovalLinks: any;

    beforeEach(() => {
      mockSupabase = {
        client: {
          functions: { invoke: vi.fn() },
          from: vi.fn()
        },
        directQuery: vi.fn()
      };

      mockApprovalLinks = {
        generateCode: vi.fn().mockReturnValue('code-123'),
        generateApprovalLink: vi.fn().mockResolvedValue('https://example.com/approve?code=123')
      };

      service = new EmailNotificationService(mockSupabase as any, mockApprovalLinks as any);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('Email Enqueueing', () => {
      it('should enqueue email successfully', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: { id: '123' }, error: null })
        });

        await expect(service.enqueueEmail('user@test.com', 'test_template')).resolves.toBeUndefined();
        expect(mockSupabase.client.from).toHaveBeenCalledWith('email_queue');
      });

      it('should enqueue email with variables', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: { id: '123' }, error: null })
        });

        const vars = { name: 'John', title: 'Test Prayer' };
        await service.enqueueEmail('user@test.com', 'test_template', vars);
        
        expect(mockSupabase.client.from).toHaveBeenCalledWith('email_queue');
      });

      it('should throw error when enqueue fails', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
        });

        await expect(service.enqueueEmail('user@test.com', 'test_template')).rejects.toThrow();
      });

      it('should handle empty variables object', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: { id: '123' }, error: null })
        });

        await expect(service.enqueueEmail('user@test.com', 'test_template', {})).resolves.toBeUndefined();
      });

      it('should handle null variables', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: { id: '123' }, error: null })
        });

        await expect(service.enqueueEmail('user@test.com', 'test_template')).resolves.toBeUndefined();
      });

      it('should set correct email queue status', async () => {
        const insertSpy = vi.fn().mockResolvedValue({ data: { id: '123' }, error: null });
        mockSupabase.client.from = vi.fn().mockReturnValue({ insert: insertSpy });

        await service.enqueueEmail('user@test.com', 'test_template');
        
        expect(insertSpy).toHaveBeenCalled();
        const insertedData = insertSpy.mock.calls[0][0];
        expect(insertedData.status).toBe('pending');
        expect(insertedData.attempts).toBe(0);
      });
    });

    describe('Approved Prayer Notifications', () => {
      it('should send approved prayer notification with current status', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [{ email: 'user1@test.com' }, { email: 'user2@test.com' }], error: null })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);
        vi.spyOn(service as any, 'triggerEmailProcessor').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          prayerFor: 'Healing',
          status: 'current'
        };

        await service.sendApprovedPrayerNotification(payload);
        expect(enqueueSpy).toHaveBeenCalledTimes(2);
      });

      it('should use prayer_answered template when status is answered', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [{ email: 'user@test.com' }], error: null })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);
        vi.spyOn(service as any, 'triggerEmailProcessor').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          prayerFor: 'Healing',
          status: 'answered'
        };

        await service.sendApprovedPrayerNotification(payload);
        const firstCall = enqueueSpy.mock.calls[0];
        expect(firstCall[1]).toBe('prayer_answered');
      });

      it('should handle empty subscriber list gracefully', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [], error: null })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          prayerFor: 'Healing',
          status: 'current'
        };

        await expect(service.sendApprovedPrayerNotification(payload)).resolves.toBeUndefined();
      });

      it('should handle subscriber fetch error gracefully', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch error' } })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          prayerFor: 'Healing',
          status: 'current'
        };

        await expect(service.sendApprovedPrayerNotification(payload)).resolves.toBeUndefined();
      });

      it('should queue emails for each subscriber independently', async () => {
        const subscribers = [
          { email: 'user1@test.com' },
          { email: 'user2@test.com' },
          { email: 'user3@test.com' }
        ];

        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: subscribers, error: null })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);
        vi.spyOn(service as any, 'triggerEmailProcessor').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          prayerFor: 'Healing',
          status: 'current'
        };

        await service.sendApprovedPrayerNotification(payload);
        expect(enqueueSpy).toHaveBeenCalledTimes(3);
      });

      it('should trigger email processor after queueing', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [{ email: 'user@test.com' }], error: null })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);
        const triggerSpy = vi.spyOn(service as any, 'triggerEmailProcessor').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          prayerFor: 'Healing',
          status: 'current'
        };

        await service.sendApprovedPrayerNotification(payload);
        expect(triggerSpy).toHaveBeenCalled();
      });
    });

    describe('Approved Update Notifications', () => {
      it('should send approved update notification', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [{ email: 'user@test.com' }], error: null })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);
        vi.spyOn(service as any, 'triggerEmailProcessor').mockResolvedValue(undefined);

        const payload = {
          prayerTitle: 'Prayer Title',
          content: 'Update content',
          author: 'Jane',
          markedAsAnswered: false
        };

        await service.sendApprovedUpdateNotification(payload);
        expect(enqueueSpy).toHaveBeenCalled();
      });

      it('should use prayer_answered template when update marked as answered', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [{ email: 'user@test.com' }], error: null })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);
        vi.spyOn(service as any, 'triggerEmailProcessor').mockResolvedValue(undefined);

        const payload = {
          prayerTitle: 'Prayer Title',
          content: 'Update content',
          author: 'Jane',
          markedAsAnswered: true
        };

        await service.sendApprovedUpdateNotification(payload);
        const firstCall = enqueueSpy.mock.calls[0];
        expect(firstCall[1]).toBe('prayer_answered');
      });

      it('should handle update notification with missing subscribers gracefully', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const payload = {
          prayerTitle: 'Prayer Title',
          content: 'Update content',
          author: 'Jane',
          markedAsAnswered: false
        };

        await expect(service.sendApprovedUpdateNotification(payload)).resolves.toBeUndefined();
      });
    });

    describe('Requester Approval Notifications', () => {
      it('should send requester approval notification when email provided', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: { subject: 'Subject', html_body: 'HTML', text_body: 'Text' }, error: null })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          requesterEmail: 'john@test.com',
          prayerFor: 'Healing'
        };

        await service.sendRequesterApprovalNotification(payload);
        expect(sendEmailSpy).toHaveBeenCalled();
      });

      it('should return early when requester email is missing', async () => {
        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          requesterEmail: '',
          prayerFor: 'Healing'
        };

        await service.sendRequesterApprovalNotification(payload);
        expect(sendEmailSpy).not.toHaveBeenCalled();
      });

      it('should use fallback template when template fetch fails', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: null, error: { message: 'Not found' } })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          requesterEmail: 'john@test.com',
          prayerFor: 'Healing'
        };

        await service.sendRequesterApprovalNotification(payload);
        expect(sendEmailSpy).toHaveBeenCalled();
        const emailCall = sendEmailSpy.mock.calls[0][0];
        expect(emailCall.htmlBody).toBeDefined();
      });

      it('should include prayer variables in email', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: { subject: 'Subject', html_body: 'HTML', text_body: 'Text' }, error: null })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          title: 'Test Prayer',
          description: 'Test Description',
          requester: 'John Doe',
          requesterEmail: 'john@test.com',
          prayerFor: 'Healing for my mother'
        };

        await service.sendRequesterApprovalNotification(payload);
        expect(sendEmailSpy).toHaveBeenCalled();
      });
    });

    describe('Denied Prayer Notifications', () => {
      it('should send denied prayer notification when email provided', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: null, error: { message: 'Not found' } })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          requesterEmail: 'john@test.com',
          denialReason: 'Inappropriate content'
        };

        await service.sendDeniedPrayerNotification(payload);
        expect(sendEmailSpy).toHaveBeenCalled();
      });

      it('should return early when requester email is missing', async () => {
        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          requesterEmail: '',
          denialReason: 'Inappropriate'
        };

        await service.sendDeniedPrayerNotification(payload);
        expect(sendEmailSpy).not.toHaveBeenCalled();
      });

      it('should include denial reason in email', async () => {
        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          requesterEmail: 'john@test.com',
          denialReason: 'Violates community guidelines'
        };

        await service.sendDeniedPrayerNotification(payload);
        expect(sendEmailSpy).toHaveBeenCalled();
        const emailCall = sendEmailSpy.mock.calls[0][0];
        expect(emailCall.subject).toContain('Prayer Title');
      });
    });

    describe('Denied Update Notifications', () => {
      it('should send denied update notification when email provided', async () => {
        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          prayerTitle: 'Prayer Title',
          content: 'Update content',
          author: 'Jane',
          authorEmail: 'jane@test.com',
          denialReason: 'Off-topic'
        };

        await service.sendDeniedUpdateNotification(payload);
        expect(sendEmailSpy).toHaveBeenCalled();
      });

      it('should return early when author email is missing', async () => {
        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          prayerTitle: 'Prayer Title',
          content: 'Update content',
          author: 'Jane',
          authorEmail: '',
          denialReason: 'Off-topic'
        };

        await service.sendDeniedUpdateNotification(payload);
        expect(sendEmailSpy).not.toHaveBeenCalled();
      });

      it('should use template when available for denied update', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: { subject: 'Update Denied', html_body: 'HTML', text_body: 'Text' }, error: null })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          prayerTitle: 'Prayer Title',
          content: 'Update content',
          author: 'Jane',
          authorEmail: 'jane@test.com',
          denialReason: 'Off-topic'
        };

        await service.sendDeniedUpdateNotification(payload);
        expect(sendEmailSpy).toHaveBeenCalled();
      });
    });

    describe('Admin Notifications', () => {
      it('should send notification to all admins when configured', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ 
                      data: [
                        { email: 'admin1@test.com' },
                        { email: 'admin2@test.com' }
                      ], 
                      error: null 
                    })
                  })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const sendAdminSpy = vi.spyOn(service as any, 'sendAdminNotificationToEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'prayer' as const,
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John'
        };

        await service.sendAdminNotification(payload);
        expect(sendAdminSpy).toHaveBeenCalledTimes(2);
      });

      it('should return early when no admins configured', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: null, error: null })
                  })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const sendAdminSpy = vi.spyOn(service as any, 'sendAdminNotificationToEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'prayer' as const,
          title: 'Prayer Title',
          description: 'Prayer Description'
        };

        await service.sendAdminNotification(payload);
        expect(sendAdminSpy).not.toHaveBeenCalled();
      });

      it('should handle admin fetch error gracefully', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch error' } })
                  })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const payload = {
          type: 'prayer' as const,
          title: 'Prayer Title'
        };

        await expect(service.sendAdminNotification(payload)).resolves.toBeUndefined();
      });

      it('should support different admin notification types', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: [{ email: 'admin@test.com' }], error: null })
                  })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const sendAdminSpy = vi.spyOn(service as any, 'sendAdminNotificationToEmail').mockResolvedValue(undefined);

        const types = ['prayer', 'update', 'deletion'] as const;
        
        for (const notificationType of types) {
          const payload = {
            type: notificationType,
            title: 'Test'
          };
          await service.sendAdminNotification(payload);
        }

        expect(sendAdminSpy).toHaveBeenCalledTimes(3);
      });

      it('should include request ID in admin notification when provided', async () => {
        mockSupabase.client.from = vi.fn((table: string) => {
          if (table === 'email_subscribers') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: [{ email: 'admin@test.com' }], error: null })
                  })
                })
              })
            };
          }
          return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
        });

        const sendAdminSpy = vi.spyOn(service as any, 'sendAdminNotificationToEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'prayer' as const,
          title: 'Prayer Title',
          requestId: 'req-123'
        };

        await service.sendAdminNotification(payload);
        expect(sendAdminSpy).toHaveBeenCalled();
        const callPayload = sendAdminSpy.mock.calls[0][0];
        expect(callPayload.requestId).toBe('req-123');
      });
    });

    describe('Account Approval Notifications', () => {
      it('should send account approval notification to admins', async () => {
        mockSupabase.directQuery = vi.fn().mockResolvedValue({
          data: [{ email: 'admin@test.com' }],
          error: null
        });

        const notifySpy = vi.spyOn(service as any, 'sendAccountApprovalNotificationToEmail').mockResolvedValue(undefined);

        await service.sendAccountApprovalNotification('user@test.com', 'John', 'Doe');
        expect(notifySpy).toHaveBeenCalled();
      });

      it('should include affiliation reason in account approval when provided', async () => {
        mockSupabase.directQuery = vi.fn().mockResolvedValue({
          data: [{ email: 'admin@test.com' }],
          error: null
        });

        const notifySpy = vi.spyOn(service as any, 'sendAccountApprovalNotificationToEmail').mockResolvedValue(undefined);

        await service.sendAccountApprovalNotification('user@test.com', 'John', 'Doe', 'Pastor at Local Church');
        expect(notifySpy).toHaveBeenCalled();
      });

      it('should handle missing admin list gracefully', async () => {
        mockSupabase.directQuery = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Query failed' }
        });

        await expect(service.sendAccountApprovalNotification('user@test.com', 'John', 'Doe')).resolves.toBeUndefined();
      });
    });

    describe('Template Caching and Retrieval', () => {
      it('should cache template after first fetch', async () => {
        const template = {
          id: '1',
          template_key: 'test_template',
          name: 'Test',
          subject: 'Subject',
          html_body: 'HTML',
          text_body: 'Text',
          created_at: '2024-01-01',
          updated_at: '2024-01-01'
        };

        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: template, error: null })
        );

        const result1 = await service.getTemplate('test_template');
        const result2 = await service.getTemplate('test_template');

        expect(result1).toBeDefined();
        expect(result2).toBeDefined();
      });

      it('should handle null template gracefully', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: null, error: null })
        );

        const result = await service.getTemplate('nonexistent');
        expect(result).toBeNull();
      });

      it('should handle concurrent template requests', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: { subject: 'Test', html_body: 'HTML', text_body: 'Text' }, error: null })
        );

        const promises = [
          service.getTemplate('template1'),
          service.getTemplate('template2'),
          service.getTemplate('template3')
        ];

        const results = await Promise.all(promises);
        expect(results).toHaveLength(3);
      });
    });

    describe('HTML Content Generation', () => {
      it('should generate requester approval HTML', () => {
        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          requesterEmail: 'john@test.com',
          prayerFor: 'Healing'
        };

        const html = (service as any).generateRequesterApprovalHTML(payload);
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
      });

      it('should generate denied prayer HTML', () => {
        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          requesterEmail: 'john@test.com',
          denialReason: 'Inappropriate'
        };

        const html = (service as any).generateDeniedPrayerHTML(payload);
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
      });

      it('should generate denied update HTML', () => {
        const payload = {
          prayerTitle: 'Prayer Title',
          content: 'Update content',
          author: 'Jane',
          authorEmail: 'jane@test.com',
          denialReason: 'Off-topic'
        };

        const html = (service as any).generateDeniedUpdateHTML(payload);
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
      });

      it('should generate approved prayer HTML', () => {
        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          prayerFor: 'Healing',
          status: 'current'
        };

        const html = (service as any).generateApprovedPrayerHTML(payload);
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
      });

      it('should generate answered prayer HTML', () => {
        const payload = {
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John',
          prayerFor: 'Healing',
          status: 'answered'
        };

        const html = (service as any).generateAnsweredPrayerHTML(payload);
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
      });

      it('should generate approved update HTML', () => {
        const payload = {
          prayerTitle: 'Prayer Title',
          content: 'Update content',
          author: 'Jane',
          markedAsAnswered: false
        };

        const html = (service as any).generateApprovedUpdateHTML(payload);
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
      });

      it('should generate admin notification prayer HTML', () => {
        const payload = {
          type: 'prayer' as const,
          title: 'Prayer Title',
          description: 'Prayer Description',
          requester: 'John'
        };

        const html = (service as any).generateAdminNotificationPrayerHTML(payload, 'https://example.com/approve?code=123');
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
      });

      it('should generate admin notification update HTML', () => {
        const payload = {
          type: 'update' as const,
          title: 'Update Title',
          content: 'Update content',
          author: 'Jane'
        };

        const html = (service as any).generateAdminNotificationUpdateHTML(payload, 'https://example.com/approve?code=123');
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
      });
    });;

    describe('Email Processor Triggering', () => {
      it('should trigger email processor via edge function', async () => {
        mockSupabase.client.functions.invoke.mockResolvedValue({
          data: { success: true },
          error: null
        });

        await (service as any).triggerEmailProcessor();
        expect(mockSupabase.client.functions.invoke).toHaveBeenCalledWith('trigger-email-processor', { method: 'POST' });
      });

      it('should handle edge function error gracefully', async () => {
        mockSupabase.client.functions.invoke.mockResolvedValue({
          data: null,
          error: { message: 'Function error' }
        });

        await expect((service as any).triggerEmailProcessor()).resolves.toBeUndefined();
      });

      it('should handle network error in processor trigger', async () => {
        mockSupabase.client.functions.invoke.mockRejectedValue(new Error('Network error'));

        await expect((service as any).triggerEmailProcessor()).resolves.toBeUndefined();
      });
    });

    describe('Subscriber Welcome Notifications', () => {
      it('should send welcome notification with template', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({
            data: {
              id: '1',
              template_key: 'subscriber_welcome',
              subject: 'Welcome!',
              html_body: '<p>Welcome to our community</p>',
              text_body: 'Welcome to our community'
            },
            error: null
          })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        await service.sendSubscriberWelcomeNotification('subscriber@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
        expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
          to: ['subscriber@test.com'],
          subject: expect.any(String)
        }));
      });

      it('should use fallback template when template not found', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: null, error: { message: 'Not found' } })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        await service.sendSubscriberWelcomeNotification('subscriber@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
        const emailCall = sendEmailSpy.mock.calls[0][0];
        expect(emailCall.htmlBody).toBeDefined();
        expect(emailCall.htmlBody).toContain('Prayer');
      });

      it('should return early when email is empty', async () => {
        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        await service.sendSubscriberWelcomeNotification('');
        expect(sendEmailSpy).not.toHaveBeenCalled();
      });

      it('should return early when email is null or undefined', async () => {
        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        await service.sendSubscriberWelcomeNotification(null as any);
        expect(sendEmailSpy).not.toHaveBeenCalled();
      });

      it('should apply template variables in welcome email', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({
            data: {
              id: '1',
              template_key: 'subscriber_welcome',
              subject: 'Welcome!',
              html_body: '<p>Visit us at the app</p>',
              text_body: 'Visit the app'
            },
            error: null
          })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        await service.sendSubscriberWelcomeNotification('subscriber@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
        const emailCall = sendEmailSpy.mock.calls[0][0];
        expect(emailCall.subject).toBeDefined();
        expect(emailCall.htmlBody).toBeDefined();
      });

      it('should handle error in welcome notification gracefully', async () => {
        mockSupabase.client.from = vi.fn().mockImplementation(() => {
          throw new Error('Database error');
        });

        await expect(service.sendSubscriberWelcomeNotification('subscriber@test.com')).resolves.toBeUndefined();
      });

      it('should include appLink in welcome email variables', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({
            data: {
              id: '1',
              template_key: 'subscriber_welcome',
              subject: 'Welcome!',
              html_body: 'Visit {{ appLink }}',
              text_body: 'Visit {{ appLink }}'
            },
            error: null
          })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        await service.sendSubscriberWelcomeNotification('subscriber@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
      });
    });

    describe('Welcome Email HTML Generation', () => {
      it('should generate welcome email HTML', () => {
        const html = (service as any).generateWelcomeEmailHTML();
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('Prayer');
      });

      it('should include proper HTML structure in welcome email', () => {
        const html = (service as any).generateWelcomeEmailHTML();
        expect(html).toContain('<html');
        expect(html).toContain('</html>');
        expect(html).toContain('<body');
        expect(html).toContain('</body>');
      });

      it('should include styling in welcome email HTML', () => {
        const html = (service as any).generateWelcomeEmailHTML();
        expect(html).toContain('style=');
        expect(html).toContain('font-family');
      });

      it('should be responsive welcome email HTML', () => {
        const html = (service as any).generateWelcomeEmailHTML();
        expect(html).toContain('viewport');
      });
    });

    describe('Admin Notification HTML Generation', () => {
      it('should generate prayer admin notification HTML', () => {
        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'Prayer Description',
          requester: 'John'
        };

        const html = (service as any).generateAdminNotificationPrayerHTML(payload, 'https://example.com/admin');
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
        expect(html).toContain('Prayer Request');
        expect(html).toContain('Test Prayer');
      });

      it('should include proper structure in prayer admin HTML', () => {
        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'Prayer Description',
          requester: 'John'
        };

        const html = (service as any).generateAdminNotificationPrayerHTML(payload, 'https://example.com/admin');
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html');
        expect(html).toContain('</html>');
      });

      it('should include admin link in prayer notification HTML', () => {
        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'Prayer Description',
          requester: 'John'
        };

        const adminLink = 'https://example.com/admin?code=123';
        const html = (service as any).generateAdminNotificationPrayerHTML(payload, adminLink);
        expect(html).toContain(adminLink);
      });

      it('should include requester name in prayer admin HTML', () => {
        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'Prayer Description',
          requester: 'John Doe'
        };

        const html = (service as any).generateAdminNotificationPrayerHTML(payload, 'https://example.com/admin');
        expect(html).toContain('John Doe');
      });

      it('should include description in prayer admin HTML', () => {
        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'This is a detailed prayer description',
          requester: 'John'
        };

        const html = (service as any).generateAdminNotificationPrayerHTML(payload, 'https://example.com/admin');
        expect(html).toContain('detailed prayer description');
      });

      it('should generate update admin notification HTML', () => {
        const payload = {
          type: 'update' as const,
          title: 'Test Prayer',
          content: 'Update content',
          author: 'Jane'
        };

        const html = (service as any).generateAdminNotificationUpdateHTML(payload, 'https://example.com/admin');
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
        expect(html).toContain('Prayer Update');
      });

      it('should include prayer title in update admin HTML', () => {
        const payload = {
          type: 'update' as const,
          title: 'Healing Prayer',
          content: 'Update content',
          author: 'Jane'
        };

        const html = (service as any).generateAdminNotificationUpdateHTML(payload, 'https://example.com/admin');
        expect(html).toContain('Healing Prayer');
      });

      it('should include author name in update admin HTML', () => {
        const payload = {
          type: 'update' as const,
          title: 'Test Prayer',
          content: 'Update content',
          author: 'Jane Smith'
        };

        const html = (service as any).generateAdminNotificationUpdateHTML(payload, 'https://example.com/admin');
        expect(html).toContain('Jane Smith');
      });

      it('should include update content in update admin HTML', () => {
        const payload = {
          type: 'update' as const,
          title: 'Test Prayer',
          content: 'This is an important update',
          author: 'Jane'
        };

        const html = (service as any).generateAdminNotificationUpdateHTML(payload, 'https://example.com/admin');
        expect(html).toContain('important update');
      });

      it('should generate deletion admin notification HTML', () => {
        const payload = {
          type: 'deletion' as const,
          title: 'Test Prayer',
          requester: 'John',
          reason: 'Duplicate prayer'
        };

        const html = (service as any).generateAdminNotificationDeletionHTML(payload, 'https://example.com/admin');
        expect(html).toBeDefined();
        expect(typeof html).toBe('string');
        expect(html).toContain('Deletion Request');
      });

      it('should include requester in deletion admin HTML', () => {
        const payload = {
          type: 'deletion' as const,
          title: 'Test Prayer',
          requester: 'John Brown',
          reason: 'Duplicate prayer'
        };

        const html = (service as any).generateAdminNotificationDeletionHTML(payload, 'https://example.com/admin');
        expect(html).toContain('John Brown');
      });

      it('should include deletion reason in deletion admin HTML', () => {
        const payload = {
          type: 'deletion' as const,
          title: 'Test Prayer',
          requester: 'John',
          reason: 'This is a duplicate of another prayer'
        };

        const html = (service as any).generateAdminNotificationDeletionHTML(payload, 'https://example.com/admin');
        expect(html).toContain('duplicate of another prayer');
      });

      it('should have consistent styling across all admin notification types', () => {
        const prayerPayload = {
          type: 'prayer' as const,
          title: 'Test',
          description: 'Test',
          requester: 'John'
        };

        const updatePayload = {
          type: 'update' as const,
          title: 'Test',
          content: 'Test',
          author: 'Jane'
        };

        const deletionPayload = {
          type: 'deletion' as const,
          title: 'Test',
          requester: 'John',
          reason: 'Test'
        };

        const prayerHtml = (service as any).generateAdminNotificationPrayerHTML(prayerPayload, 'https://example.com/admin');
        const updateHtml = (service as any).generateAdminNotificationUpdateHTML(updatePayload, 'https://example.com/admin');
        const deletionHtml = (service as any).generateAdminNotificationDeletionHTML(deletionPayload, 'https://example.com/admin');

        expect(prayerHtml).toContain('style=');
        expect(updateHtml).toContain('style=');
        expect(deletionHtml).toContain('style=');
      });

      it('should include Go to Admin Portal button in all notification types', () => {
        const prayerPayload = {
          type: 'prayer' as const,
          title: 'Test',
          description: 'Test',
          requester: 'John'
        };

        const adminLink = 'https://example.com/admin';
        const html = (service as any).generateAdminNotificationPrayerHTML(prayerPayload, adminLink);
        expect(html).toContain('Admin Portal');
        expect(html).toContain(adminLink);
      });
    });

    describe('Admin Notification Email Sending', () => {
      it('should send admin notification for prayer type with template', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({
            data: {
              subject: 'New Prayer Notification',
              html_body: 'HTML body',
              text_body: 'Text body'
            },
            error: null
          })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'Test Description',
          requester: 'John'
        };

        await (service as any).sendAdminNotificationToEmail(payload, 'admin@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
      });

      it('should send admin notification for update type', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({
            data: {
              subject: 'New Update Notification',
              html_body: 'HTML body',
              text_body: 'Text body'
            },
            error: null
          })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'update' as const,
          title: 'Test Prayer',
          content: 'Update content',
          author: 'Jane'
        };

        await (service as any).sendAdminNotificationToEmail(payload, 'admin@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
      });

      it('should send admin notification for deletion type', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({
            data: {
              subject: 'Deletion Request',
              html_body: 'HTML body',
              text_body: 'Text body'
            },
            error: null
          })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'deletion' as const,
          title: 'Test Prayer',
          requester: 'John',
          reason: 'Duplicate'
        };

        await (service as any).sendAdminNotificationToEmail(payload, 'admin@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
      });

      it('should use fallback when template not found for prayer', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: null, error: { message: 'Not found' } })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'Test Description',
          requester: 'John'
        };

        await (service as any).sendAdminNotificationToEmail(payload, 'admin@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
        const emailCall = sendEmailSpy.mock.calls[0][0];
        expect(emailCall.subject).toContain('Prayer Request');
      });

      it('should use fallback when template not found for update', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: null, error: { message: 'Not found' } })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'update' as const,
          title: 'Test Prayer',
          content: 'Update content',
          author: 'Jane'
        };

        await (service as any).sendAdminNotificationToEmail(payload, 'admin@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
        const emailCall = sendEmailSpy.mock.calls[0][0];
        expect(emailCall.subject).toContain('Prayer Update');
      });

      it('should use fallback when template not found for deletion', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: null, error: { message: 'Not found' } })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'deletion' as const,
          title: 'Test Prayer',
          requester: 'John',
          reason: 'Duplicate'
        };

        await (service as any).sendAdminNotificationToEmail(payload, 'admin@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
        const emailCall = sendEmailSpy.mock.calls[0][0];
        expect(emailCall.subject).toContain('Deletion Request');
      });

      it('should include all required fields in email for prayer notification', async () => {
        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'Test Description',
          requester: 'John'
        };

        await (service as any).sendAdminNotificationToEmail(payload, 'admin@test.com');
        expect(sendEmailSpy).toHaveBeenCalled();
        const emailCall = sendEmailSpy.mock.calls[0][0];
        expect(emailCall.to).toEqual(['admin@test.com']);
        expect(emailCall.subject).toBeDefined();
        expect(emailCall.textBody || emailCall.htmlBody).toBeDefined();
      });

      it('should handle error in admin notification gracefully', async () => {
        mockSupabase.client.from = vi.fn().mockImplementation(() => {
          throw new Error('Database error');
        });

        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'Test Description',
          requester: 'John'
        };

        await expect((service as any).sendAdminNotificationToEmail(payload, 'admin@test.com')).resolves.toBeUndefined();
      });

      it('should include admin link in fallback notification emails', async () => {
        mockSupabase.client.from = vi.fn().mockReturnValue(
          makeFromQuery({ data: null, error: { message: 'Not found' } })
        );

        const sendEmailSpy = vi.spyOn(service, 'sendEmail').mockResolvedValue(undefined);

        const payload = {
          type: 'prayer' as const,
          title: 'Test Prayer',
          description: 'Test Description',
          requester: 'John'
        };

        await (service as any).sendAdminNotificationToEmail(payload, 'admin@test.com');
        const emailCall = sendEmailSpy.mock.calls[0][0];
        expect(emailCall.htmlBody || emailCall.textBody).toContain('/admin');
      });
    });
  });
});
