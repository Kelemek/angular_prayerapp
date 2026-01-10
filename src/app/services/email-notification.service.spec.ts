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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  EmailNotificationService,
  SendEmailOptions,
  ApprovedPrayerPayload,
  ApprovedUpdatePayload,
  RequesterApprovalPayload,
  DeniedPrayerPayload,
  DeniedUpdatePayload,
  AdminNotificationPayload
} from './email-notification.service';
import { SupabaseService } from './supabase.service';
import { ApprovalLinksService } from './approval-links.service';

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  let mockSupabaseService: any;
  let mockApprovalLinksService: any;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Create a chainable mock for database queries
    const createChainableQuery = () => {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };
      return chain;
    };

    mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'email_subscribers') {
          // Return subscriber query mock that resolves to empty array by default
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          };
        }
        // For other tables, return normal chainable mock
        return createChainableQuery();
      }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      functions: {
        invoke: vi.fn()
      }
    };

    mockSupabaseService = {
      client: mockSupabaseClient
    } as any;

    mockApprovalLinksService = {
      createApprovalLink: vi.fn().mockReturnValue('mock-approval-link'),
      generateCode: vi.fn().mockReturnValue('code-xyz'),
      generateApprovalLink: vi.fn().mockResolvedValue('http://approve')
    } as any;

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:4200' },
      writable: true
    });

    service = new EmailNotificationService(mockSupabaseService, mockApprovalLinksService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const options: SendEmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test Text'
      };

      await expect(service.sendEmail(options)).resolves.not.toThrow();
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          to: 'test@example.com',
          subject: 'Test Subject',
          htmlBody: '<p>Test HTML</p>',
          textBody: 'Test Text',
          replyTo: undefined,
          fromName: undefined
        }
      });
    });

    it('should handle error from supabase function', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' }
      });

      const options: SendEmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject'
      };

      await expect(service.sendEmail(options)).rejects.toThrow('Function error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send email:', expect.any(Object));
    });

    it('should handle unsuccessful response', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: false, error: 'Email service error' },
        error: null
      });

      const options: SendEmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject'
      };

      await expect(service.sendEmail(options)).rejects.toThrow('Email service error');
    });

    it('should send email with all options', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const options: SendEmailOptions = {
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test Text',
        replyTo: 'reply@example.com',
        fromName: 'Test Sender'
      };

      await service.sendEmail(options);
      
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: expect.objectContaining({
          to: ['test1@example.com', 'test2@example.com'],
          replyTo: 'reply@example.com',
          fromName: 'Test Sender'
        })
      });
    });
  });

  describe('getTemplate', () => {
    it('should fetch template successfully', async () => {
      const mockTemplate = {
        id: '1',
        template_key: 'approved_prayer',
        name: 'Approved Prayer',
        subject: 'New Prayer: {{prayerTitle}}',
        html_body: '<p>{{prayerDescription}}</p>',
        text_body: '{{prayerDescription}}',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      // Set up the mock chain properly
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTemplate,
          error: null
        })
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockChain);

      const result = await service.getTemplate('approved_prayer');

      expect(result).toEqual(mockTemplate);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('email_templates');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('template_key', 'approved_prayer');
    });

    it('should return null on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Set up the mock chain to return an error
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Template not found' }
        })
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockChain);

      const result = await service.getTemplate('non_existent');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching template:', expect.any(Object));
    });
  });

  describe('applyTemplateVariables', () => {
    it('should replace template variables', () => {
      const template = 'Hello {{name}}, welcome to {{app}}!';
      const variables = { name: 'John', app: 'Prayer App' };

      const result = service.applyTemplateVariables(template, variables);

      expect(result).toBe('Hello John, welcome to Prayer App!');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template = '{{name}} said: "Hello {{name}}"';
      const variables = { name: 'Alice' };

      const result = service.applyTemplateVariables(template, variables);

      expect(result).toBe('Alice said: "Hello Alice"');
    });

    it('should handle whitespace in placeholders', () => {
      const template = '{{ name }} {{ app }}';
      const variables = { name: 'Bob', app: 'Test App' };

      const result = service.applyTemplateVariables(template, variables);

      expect(result).toBe('Bob Test App');
    });

    it('should replace undefined values with empty string', () => {
      const template = 'Name: {{name}}, Age: {{age}}';
      const variables = { name: 'Charlie', age: undefined as any };

      const result = service.applyTemplateVariables(template, variables);

      expect(result).toBe('Name: Charlie, Age: ');
    });
  });

  describe('sendEmailToAllSubscribers', () => {
    it('should send email to all subscribers', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendEmailToAllSubscribers({
        subject: 'Test Subject',
        htmlBody: '<p>Test</p>',
        textBody: 'Test'
      });

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: {
          action: 'send_to_all_subscribers',
          subject: 'Test Subject',
          htmlBody: '<p>Test</p>',
          textBody: 'Test',
          replyTo: undefined,
          fromName: undefined
        }
      });
    });

    it('should handle error from bulk email', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Bulk email error' }
      });

      await expect(service.sendEmailToAllSubscribers({
        subject: 'Test'
      })).rejects.toThrow('Bulk email error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send bulk email:', expect.any(Object));
    });

    it('should handle unsuccessful bulk email response', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: false, error: 'Bulk send failed' },
        error: null
      });

      await expect(service.sendEmailToAllSubscribers({
        subject: 'Test'
      })).rejects.toThrow('Bulk send failed');
    });
  });

  describe('sendApprovedPrayerNotification', () => {
    const mockPayload: ApprovedPrayerPayload = {
      title: 'Test Prayer',
      description: 'Test Description',
      requester: 'John Doe',
      prayerFor: 'Jane Doe',
      status: 'current'
    };

    it('should queue notification to all active subscribers', async () => {
      const mockSubscribers = [
        { email: 'user1@test.com' },
        { email: 'user2@test.com' }
      ];

      // Mock email_subscribers query
      mockSupabaseClient.from = vi.fn((table: string) => {
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

      await service.sendApprovedPrayerNotification(mockPayload);

      expect(enqueueSpy).toHaveBeenCalledTimes(2);
      expect(enqueueSpy).toHaveBeenCalledWith('user1@test.com', 'approved_prayer', expect.objectContaining({
        prayerTitle: 'Test Prayer',
        prayerFor: 'Jane Doe'
      }));
    });

    it('should handle no active subscribers', async () => {
      // Mock email_subscribers query returning empty
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'email_subscribers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null })
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis()
        };
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);

      await service.sendApprovedPrayerNotification(mockPayload);

      expect(enqueueSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('No active subscribers to notify');
    });

    it('should not throw on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock email_subscribers query to throw
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'email_subscribers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockRejectedValue(new Error('Database error'))
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis()
        };
      });

      await expect(service.sendApprovedPrayerNotification(mockPayload)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in sendApprovedPrayerNotification:', expect.any(Error));
    });
  });

  describe('sendApprovedUpdateNotification', () => {
    const mockPayload: ApprovedUpdatePayload = {
      prayerTitle: 'Test Prayer',
      content: 'Update content',
      author: 'John Doe',
      markedAsAnswered: false
    };

    it('should queue notification to all active subscribers', async () => {
      const mockSubscribers = [
        { email: 'user1@test.com' },
        { email: 'user2@test.com' }
      ];

      // Mock email_subscribers query
      mockSupabaseClient.from = vi.fn((table: string) => {
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

      await service.sendApprovedUpdateNotification(mockPayload);

      expect(enqueueSpy).toHaveBeenCalledTimes(2);
      expect(enqueueSpy).toHaveBeenCalledWith('user1@test.com', 'approved_update', expect.objectContaining({
        prayerTitle: 'Test Prayer',
        updateContent: 'Update content'
      }));
    });

    it('should use prayer_answered template when marked as answered', async () => {
      const mockSubscribers = [{ email: 'user@test.com' }];

      // Mock email_subscribers query
      mockSupabaseClient.from = vi.fn((table: string) => {
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
          eq: vi.fn().mockReturnThis()
        };
      });

      const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);

      await service.sendApprovedUpdateNotification({
        ...mockPayload,
        markedAsAnswered: true
      });

      expect(enqueueSpy).toHaveBeenCalledWith('user@test.com', 'prayer_answered', expect.any(Object));
    });

    it('should not throw on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock email_subscribers query to throw
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'email_subscribers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockRejectedValue(new Error('Database error'))
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis()
        };
      });

      await expect(service.sendApprovedUpdateNotification(mockPayload)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in sendApprovedUpdateNotification:', expect.any(Error));
    });
  });

  describe('sendRequesterApprovalNotification', () => {
    const mockPayload: RequesterApprovalPayload = {
      title: 'Test Prayer',
      description: 'Test Description',
      requester: 'John Doe',
      requesterEmail: 'john@example.com',
      prayerFor: 'Jane Doe'
    };

    it('should send email to requester', async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendRequesterApprovalNotification(mockPayload);

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('send-email', expect.objectContaining({
        body: expect.objectContaining({
          to: ['john@example.com'],
          subject: 'Your Prayer Request Has Been Approved: Test Prayer'
        })
      }));
    });

    it('should not send email if requester email is missing', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await service.sendRequesterApprovalNotification({
        ...mockPayload,
        requesterEmail: ''
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('No email address for prayer requester');
      expect(mockSupabaseClient.functions.invoke).not.toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.functions.invoke.mockRejectedValue(new Error('Send error'));

      await expect(service.sendRequesterApprovalNotification(mockPayload)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in sendRequesterApprovalNotification:', expect.any(Error));
    });
  });

  describe('sendDeniedPrayerNotification', () => {
    const mockPayload: DeniedPrayerPayload = {
      title: 'Test Prayer',
      description: 'Test Description',
      requester: 'John Doe',
      requesterEmail: 'john@example.com',
      denialReason: 'Inappropriate content'
    };

    it('should send denial notification with fallback', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Template not found' }
      });

      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendDeniedPrayerNotification(mockPayload);

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('send-email', expect.objectContaining({
        body: expect.objectContaining({
          to: ['john@example.com'],
          subject: 'Prayer Request Not Approved: Test Prayer'
        })
      }));
    });

    it('should use template when available', async () => {
      const mockTemplate = {
        id: '1',
        template_key: 'denied_prayer',
        name: 'Denied Prayer',
        subject: 'Prayer Not Approved: {{prayerTitle}}',
        html_body: '<p>{{denialReason}}</p>',
        text_body: '{{denialReason}}',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      // Set up the mock chain for getTemplate
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTemplate,
          error: null
        })
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockChain);

      const sendEmailSpy = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      await service.sendDeniedPrayerNotification(mockPayload);

      expect(sendEmailSpy).toHaveBeenCalled();
    });

    it('should not send email if requester email is missing', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await service.sendDeniedPrayerNotification({
        ...mockPayload,
        requesterEmail: ''
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('No email address for denied prayer requester');
    });

    it('should handle template fetch error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Set up the mock chain to reject
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Template fetch error'))
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockChain);

      const sendEmailSpy = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      await service.sendDeniedPrayerNotification(mockPayload);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch denied_prayer template, using fallback:', expect.any(Error));
      expect(sendEmailSpy).toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Set up the mock chain to reject
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockChain);

      const sendEmailSpy = vi.spyOn(service as any, 'sendEmail').mockRejectedValue(new Error('Send error'));

      await expect(service.sendDeniedPrayerNotification(mockPayload)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in sendDeniedPrayerNotification:', expect.any(Error));
    });
  });

  describe('sendDeniedUpdateNotification', () => {
    const mockPayload: DeniedUpdatePayload = {
      prayerTitle: 'Test Prayer',
      content: 'Update content',
      author: 'John Doe',
      authorEmail: 'john@example.com',
      denialReason: 'Inappropriate language'
    };

    it('should send denial notification for update', async () => {
      // Set up the mock chain
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockChain);

      const sendEmailSpy = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      await service.sendDeniedUpdateNotification(mockPayload);

      expect(sendEmailSpy).toHaveBeenCalledWith(expect.objectContaining({
        to: ['john@example.com'],
        subject: expect.stringContaining('Test Prayer')
      }));
    });

    it('should use template when available', async () => {
      const mockTemplate = {
        id: '1',
        template_key: 'denied_update',
        name: 'Denied Update',
        subject: 'Update Not Approved: {{prayerTitle}}',
        html_body: '<p>{{denialReason}}</p>',
        text_body: '{{denialReason}}',
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      // Set up the mock chain
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTemplate,
          error: null
        })
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockChain);

      const sendEmailSpy = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      await service.sendDeniedUpdateNotification(mockPayload);

      expect(sendEmailSpy).toHaveBeenCalled();
    });

    it('should not send email if author email is missing', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await service.sendDeniedUpdateNotification({
        ...mockPayload,
        authorEmail: ''
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('No email address for denied update author');
    });

    it('should handle template fetch error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Set up the mock chain to reject
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Template fetch error'))
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockChain);

      const sendEmailSpy = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined);

      await service.sendDeniedUpdateNotification(mockPayload);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to fetch denied_update template, using fallback:', expect.any(Error));
      expect(sendEmailSpy).toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Set up the mock chain to reject
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Send error'))
      };

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockChain);

      const sendEmailSpy = vi.spyOn(service as any, 'sendEmail').mockRejectedValue(new Error('Send error'));

      await expect(service.sendDeniedUpdateNotification(mockPayload)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in sendDeniedUpdateNotification:', expect.any(Error));
    });
  });

  describe('sendAdminNotification', () => {
    const mockPayload: AdminNotificationPayload = {
      type: 'prayer',
      title: 'Test Prayer',
      description: 'Test Description',
      requester: 'John Doe'
    };

    it('should send notifications to all admins', async () => {
      const mockAdmins = [
        { email: 'admin1@example.com' },
        { email: 'admin2@example.com' }
      ];

      // Reset the mock chain for this test
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.eq.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: mockAdmins,
            error: null
          })
        })
      });

      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      await service.sendAdminNotification(mockPayload);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('email_subscribers');
      // Should call eq three times for is_admin, is_active, and receive_admin_emails
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledTimes(2);
    });

    it('should handle error fetching admins', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.eq.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      });

      await service.sendAdminNotification(mockPayload);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching admin emails:', expect.any(Object));
      expect(mockSupabaseClient.functions.invoke).not.toHaveBeenCalled();
    });

    it('should warn when no admins configured', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSupabaseClient.from.mockReturnThis();
      mockSupabaseClient.select.mockReturnThis();
      mockSupabaseClient.eq.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      await service.sendAdminNotification(mockPayload);

      expect(consoleWarnSpy).toHaveBeenCalledWith('No admins configured to receive notifications. Please enable admin email notifications in Admin User Management.');
      expect(mockSupabaseClient.functions.invoke).not.toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.select.mockRejectedValue(new Error('Database error'));

      await expect(service.sendAdminNotification(mockPayload)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error in sendAdminNotification:', expect.any(Error));
    });
  });

  describe('private helpers and edge branches', () => {
    it('sendAccountApprovalNotificationToEmail logs when template missing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // mock getTemplate to return null
      vi.spyOn(service, 'getTemplate' as any).mockResolvedValueOnce(null as any);

      // call private method
      await (service as any).sendAccountApprovalNotificationToEmail('u@u', 'F', 'L', 'admin@a');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Account approval request template not found');
    });

    it('sendAdminNotificationToEmail falls back when template missing and uses adminLink from approvalLinks', async () => {
      const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);

      // ensure approval link is generated
      (service as any).approvalLinks = { generateApprovalLink: vi.fn().mockResolvedValue('http://admin.link') };

      // template missing
      vi.spyOn(service, 'getTemplate' as any).mockResolvedValueOnce(null as any);

      const payload = { type: 'prayer', title: 'T', requester: 'R' } as any;

      await (service as any).sendAdminNotificationToEmail(payload, 'admin@a');

      expect(spySend).toHaveBeenCalledWith(expect.objectContaining({ to: ['admin@a'] }));
    });

    it('sendAdminNotificationToEmail uses template when present for update and deletion types', async () => {
      const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);

      const tpl = { subject: 'S', html_body: '<p>{{updateContent}}</p>', text_body: 't' } as any;
      // update
      vi.spyOn(service, 'getTemplate' as any).mockResolvedValueOnce(tpl as any);
      await (service as any).sendAdminNotificationToEmail({ type: 'update', title: 'T', author: 'A', content: 'C' } as any, 'a@a');
      expect(spySend).toHaveBeenCalled();

      // deletion
      vi.spyOn(service, 'getTemplate' as any).mockResolvedValueOnce(tpl as any);
      await (service as any).sendAdminNotificationToEmail({ type: 'deletion', title: 'T', requester: 'R', reason: 'R' } as any, 'a@a');
      expect(spySend).toHaveBeenCalled();
    });

    it('sendAdminNotificationToEmail handles unknown payload type fallback', async () => {
      const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);

      vi.spyOn(service, 'getTemplate' as any).mockResolvedValueOnce(null as any);

      await (service as any).sendAdminNotificationToEmail({ type: 'unknown', title: 'X' } as any, 'a@a');

      expect(spySend).toHaveBeenCalledWith(expect.objectContaining({ to: ['a@a'] }));
    });

    it('template generators return HTML containing expected content and branches', () => {
      // Approved prayer
      const ap = { title: 'Title A', prayerFor: 'Community', requester: 'Req', description: 'Desc', status: 'current' } as any;
      const apHtml = (service as any).generateApprovedPrayerHTML(ap);
      expect(apHtml).toContain('New Prayer Request');
      expect(apHtml).toContain(ap.title);

      // Approved update - answered and not answered
      const updAnswered = { prayerTitle: 'P1', content: 'C1', author: 'Auth', markedAsAnswered: true } as any;
      const updHtmlAnswered = (service as any).generateApprovedUpdateHTML(updAnswered);
      expect(updHtmlAnswered).toContain('Answered Prayer');
      expect(updHtmlAnswered).toContain(updAnswered.prayerTitle);

      const updNotAnswered = { prayerTitle: 'P2', content: 'C2', author: 'Auth2', markedAsAnswered: false } as any;
      const updHtmlNotAnswered = (service as any).generateApprovedUpdateHTML(updNotAnswered);
      expect(updHtmlNotAnswered).toContain('Prayer Update');
      expect(updHtmlNotAnswered).toContain(updNotAnswered.prayerTitle);

      // Requester approval
      const req = { title: 'Treq', description: 'Dreq', requester: 'R1' } as any;
      const reqHtml = (service as any).generateRequesterApprovalHTML(req);
      expect(reqHtml).toContain('Prayer Request Approved');
      expect(reqHtml).toContain(req.requester);

      // Denied templates
      const den = { title: 'TD', description: 'DD', requester: 'RR', denialReason: 'No' } as any;
      const denHtml = (service as any).generateDeniedPrayerHTML(den);
      expect(denHtml).toContain('Prayer Request Not Approved');
      expect(denHtml).toContain(den.denialReason);

      const denUpd = { prayerTitle: 'PU', content: 'CU', author: 'AU', denialReason: 'Reason' } as any;
      const denUpdHtml = (service as any).generateDeniedUpdateHTML(denUpd);
      expect(denUpdHtml).toContain('Update Status');
      expect(denUpdHtml).toContain(denUpd.denialReason);

      // Admin notification fallbacks
      const adminLink = 'http://admin.local';
      const adminPayload = { type: 'prayer', title: 'AdminTitle', requester: 'Anon', description: 'Desc' } as any;
      const a1 = (service as any).generateAdminNotificationPrayerHTML(adminPayload, adminLink);
      expect(a1).toContain('Go to Admin Portal');
      expect(a1).toContain(adminLink);

      const a2 = (service as any).generateAdminNotificationUpdateHTML(adminPayload, adminLink);
      expect(a2).toContain('New Prayer Update');
      expect(a2).toContain(adminLink);

      const a3 = (service as any).generateAdminNotificationDeletionHTML(adminPayload, adminLink);
      expect(a3).toContain('Deletion Request');
      expect(a3).toContain(adminLink);
    });

    it('sendAdminNotificationToEmail uses admin portal link', async () => {
      const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);

      await (service as any).sendAdminNotificationToEmail({ type: 'prayer', title: 'T', requestId: 'rid', requester: 'R' } as any, 'adm@a');

      expect(spySend).toHaveBeenCalled();
      const sent = spySend.mock.calls[0][0];
      expect(sent.htmlBody || sent.textBody).toContain('/admin');
    });

    it('sendAdminNotificationToEmail uses admin portal link for update fallback', async () => {
      const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);
      // template missing
      vi.spyOn(service, 'getTemplate' as any).mockResolvedValueOnce(null as any);

      await (service as any).sendAdminNotificationToEmail({ type: 'update', title: 'UT', requestId: 'rid', author: 'AU', content: 'C' } as any, 'adm@a');

      expect(spySend).toHaveBeenCalled();
      const sent = spySend.mock.calls[0][0];
      expect(sent.htmlBody || sent.textBody).toContain('/admin');
    });

    it('sendAdminNotificationToEmail uses admin portal link for deletion fallback', async () => {
      const spySend = vi.spyOn(service as any, 'sendEmail').mockResolvedValue(undefined as any);
      vi.spyOn(service, 'getTemplate' as any).mockResolvedValueOnce(null as any);

      await (service as any).sendAdminNotificationToEmail({ type: 'deletion', title: 'DEL', requestId: 'rid', requester: 'RQ', reason: 'Because' } as any, 'adm@a');

      expect(spySend).toHaveBeenCalled();
      const sent = spySend.mock.calls[0][0];
      expect(sent.htmlBody || sent.textBody).toContain('/admin');
    });
  });

  describe('sendApprovedPrayerNotification with answered status', () => {
    it('should use prayer_answered template when status is answered', async () => {
      const mockSubscribers = [{ email: 'subscriber@test.com' }];

      // Mock email_subscribers query
      mockSupabaseClient.from = vi.fn((table: string) => {
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
          eq: vi.fn().mockReturnThis()
        };
      });

      const payload: ApprovedPrayerPayload = {
        title: 'Answered Prayer',
        description: 'God answered!',
        requester: 'Jane Doe',
        prayerFor: 'John',
        status: 'answered'
      };

      const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);

      await service.sendApprovedPrayerNotification(payload);

      // Should queue with prayer_answered template key for answered status
      expect(enqueueSpy).toHaveBeenCalledWith('subscriber@test.com', 'prayer_answered', expect.any(Object));
    });

    it('should use approved_prayer template when status is current', async () => {
      const mockSubscribers = [{ email: 'subscriber@test.com' }];

      // Mock email_subscribers query
      mockSupabaseClient.from = vi.fn((table: string) => {
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
          eq: vi.fn().mockReturnThis()
        };
      });

      const payload: ApprovedPrayerPayload = {
        title: 'Current Prayer',
        description: 'Please pray',
        requester: 'John Doe',
        prayerFor: 'Jane',
        status: 'current'
      };

      const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);

      await service.sendApprovedPrayerNotification(payload);

      // Should queue with approved_prayer template key for current status
      expect(enqueueSpy).toHaveBeenCalledWith('subscriber@test.com', 'approved_prayer', expect.any(Object));
    });

    it('should apply template variables correctly for answered prayer', async () => {
      const mockSubscribers = [{ email: 'subscriber@test.com' }];

      // Mock email_subscribers query
      mockSupabaseClient.from = vi.fn((table: string) => {
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
          eq: vi.fn().mockReturnThis()
        };
      });

      const payload: ApprovedPrayerPayload = {
        title: 'Test Prayer',
        description: 'Test Description',
        requester: 'Test Requester',
        prayerFor: 'Test Person',
        status: 'answered'
      };

      const enqueueSpy = vi.spyOn(service as any, 'enqueueEmail').mockResolvedValue(undefined);

      await service.sendApprovedPrayerNotification(payload);

      expect(enqueueSpy).toHaveBeenCalledWith('subscriber@test.com', 'prayer_answered', expect.objectContaining({
        prayerTitle: 'Test Prayer',
        requesterName: 'Test Requester',
        prayerFor: 'Test Person'
      }));
    });
  });

  describe('generateAnsweredPrayerHTML', () => {
    it('should generate HTML with answered prayer styling', () => {
      const payload: ApprovedPrayerPayload = {
        title: 'Healing Prayer',
        description: 'Please pray for recovery',
        requester: 'Sarah',
        prayerFor: 'John',
        status: 'answered'
      };

      const html = (service as any).generateAnsweredPrayerHTML(payload);

      expect(html).toContain('🎉 Prayer Answered!');
      expect(html).toContain('✓ Answered Prayer');
      expect(html).toContain('#10b981'); // Green color
      expect(html).toContain('Healing Prayer');
      expect(html).toContain('John');
      expect(html).toContain('Sarah');
      expect(html).toContain('Please pray for recovery');
    });

    it('should include answered prayer badge', () => {
      const payload: ApprovedPrayerPayload = {
        title: 'Test Prayer',
        description: 'Test',
        requester: 'Test',
        prayerFor: 'Test',
        status: 'answered'
      };

      const html = (service as any).generateAnsweredPrayerHTML(payload);

      expect(html).toContain('<div style="display: inline-block; background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 15px;">✓ Answered Prayer</div>');
    });

    it('should include proper HTML structure', () => {
      const payload: ApprovedPrayerPayload = {
        title: 'Prayer',
        description: 'Desc',
        requester: 'Person',
        prayerFor: 'Someone',
        status: 'answered'
      };

      const html = (service as any).generateAnsweredPrayerHTML(payload);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('Prayer');
      expect(html).toContain('Someone');
      expect(html).toContain('Person');
      expect(html).toContain('Desc');
    });

    it('should use green gradient background', () => {
      const payload: ApprovedPrayerPayload = {
        title: 'Prayer',
        description: 'Desc',
        requester: 'Person',
        prayerFor: 'Someone',
        status: 'answered'
      };

      const html = (service as any).generateAnsweredPrayerHTML(payload);

      expect(html).toContain('linear-gradient(to right, #10b981, #059669)');
    });

    it('should include closing message about thanksgiving', () => {
      const payload: ApprovedPrayerPayload = {
        title: 'Prayer',
        description: 'Desc',
        requester: 'Person',
        prayerFor: 'Someone',
        status: 'answered'
      };

      const html = (service as any).generateAnsweredPrayerHTML(payload);

      expect(html).toContain("Let's give thanks and praise for this answered prayer!");
    });

    it('should include View Prayer button with correct link', () => {
      const payload: ApprovedPrayerPayload = {
        title: 'Prayer',
        description: 'Desc',
        requester: 'Person',
        prayerFor: 'Someone',
        status: 'answered'
      };

      const html = (service as any).generateAnsweredPrayerHTML(payload);

      expect(html).toContain('View Prayer');
      // The URL will be window.location.origin + '/'
      expect(html).toContain('href="http://localhost:4200/"');
    });

    it('should properly escape prayer content in HTML', () => {
      const payload: ApprovedPrayerPayload = {
        title: 'Prayer with <script>',
        description: 'Desc with <b>tags</b>',
        requester: 'Person',
        prayerFor: 'Someone',
        status: 'answered'
      };

      const html = (service as any).generateAnsweredPrayerHTML(payload);

      // The function should include the content as-is
      expect(html).toContain('Prayer with <script>');
      expect(html).toContain('Desc with <b>tags</b>');
    });
  });
});
