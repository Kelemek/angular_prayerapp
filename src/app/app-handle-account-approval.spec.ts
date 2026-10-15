import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wireGatedSupabaseMock } from './testing/supabase-service-mock';
import { AppComponent } from './app.component';
import { NavigationEnd } from '@angular/router';
import { Subject, of } from 'rxjs';

const decodeAccountCodeMock = vi.fn();
const supabaseDirectQueryMock = vi.fn();
const supabaseDirectMutationMock = vi.fn();
const supabaseRpcMock = vi.fn();
const lookupPersonByEmailMock = vi.fn();
const emailGetTemplateMock = vi.fn();
const emailApplyTemplateVariablesMock = vi.fn();
const emailSendEmailMock = vi.fn();
const toastShowToastMock = vi.fn();

vi.mock('./services/approval-links.service', () => ({
  ApprovalLinksService: class {
    decodeAccountCode() {
      return decodeAccountCodeMock();
    }
  },
}));

vi.mock('./services/supabase.service', () => ({
  SupabaseService: class {
    client = {
      rpc: (...args: unknown[]) => supabaseRpcMock(...args),
    };

    rpc(...args: unknown[]) {
      return supabaseRpcMock(...args);
    }

    async db() {
      return this.client;
    }

    async getClientWhenReady() {
      return this.client;
    }

    directQuery(...args: unknown[]) {
      return supabaseDirectQueryMock(...args);
    }
    directMutation(...args: unknown[]) {
      return supabaseDirectMutationMock(...args);
    }
    getRestAuthorizationBearer() {
      return Promise.resolve('admin-jwt');
    }
  },
}));

vi.mock('./services/email-notification.service', () => ({
  EmailNotificationService: class {
    getTemplate(templateName: string) {
      return emailGetTemplateMock(templateName);
    }
    applyTemplateVariables(template: string, vars: Record<string, string> = {}) {
      return emailApplyTemplateVariablesMock(template, vars);
    }
    sendEmail(payload: unknown) {
      return emailSendEmailMock(payload);
    }
    getEmailBaseUrl() {
      return 'https://example.com';
    }
  },
}));

vi.mock('./services/toast.service', () => ({
  ToastService: class {
    showToast(message: string, type: string) {
      return toastShowToastMock(message, type);
    }
  },
}));

vi.mock('./services/planning-center-rest.service', () => ({
  PlanningCenterRestService: class {
    lookupPersonByEmail(...args: unknown[]) {
      return lookupPersonByEmailMock(...args);
    }
  },
}));

vi.mock('../environments/environment', () => ({
  environment: {
    production: false,
    supabaseUrl: 'https://example.supabase',
    supabaseAnonKey: 'anon-key',
    posthogKey: '',
    posthogHost: 'https://us.i.posthog.com',
    appUrl: 'https://example.com',
  },
}));

describe('AppComponent handleAccountApprovalCode', () => {
  const routerEventsSubject = new Subject<unknown>();
  const mockRouter = {
    events: routerEventsSubject.asObservable(),
    navigate: vi.fn().mockResolvedValue(true),
  };
  const mockNgZone = { run: vi.fn((fn: () => void) => fn()) };
  const mockCdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };
  const mockInjector = {
    get: vi.fn((token: { name?: string }) => {
      const name = typeof token?.name === 'string' ? token.name : '';
      if (name === 'PlanningCenterRestService') {
        return {
          lookupPersonByEmail: (...args: unknown[]) =>
            lookupPersonByEmailMock(...args),
        };
      }
      if (name === 'ApprovalLinksService') {
        return { decodeAccountCode: () => decodeAccountCodeMock() };
      }
      if (name === 'SupabaseService') {
        const client = { rpc: (...args: unknown[]) => supabaseRpcMock(...args) };
        return wireGatedSupabaseMock({
          client,
          directQuery: (...args: unknown[]) => supabaseDirectQueryMock(...args),
          directMutation: (...args: unknown[]) => supabaseDirectMutationMock(...args),
          getRestAuthorizationBearer: () => Promise.resolve('admin-jwt'),
        });
      }
      if (name === 'EmailNotificationService') {
        return {
          getTemplate: (templateName: string) => emailGetTemplateMock(templateName),
          applyTemplateVariables: (template: string, vars: Record<string, string> = {}) =>
            emailApplyTemplateVariablesMock(template, vars),
          sendEmail: (payload: unknown) => emailSendEmailMock(payload),
          getEmailBaseUrl: () => 'https://example.com',
        };
      }
      if (name === 'ToastService') {
        return { showToast: (message: string, type: string) => toastShowToastMock(message, type) };
      }
      return { decodeAccountCode: () => decodeAccountCodeMock() };
    }),
  };
  const mockHelpDriverTour = { fullGuidedTourProgress$: of(null) };
  const mockPosthogService = {};

  function createComponent(): AppComponent {
    return new AppComponent(
      mockRouter as never,
      mockInjector as never,
      mockNgZone as never,
      mockCdr as never,
      mockHelpDriverTour as never,
      mockPosthogService as never
    );
  }

  const createRequest = (status = 'pending') => ({
    id: 'req-123',
    email: 'test@example.com',
    first_name: 'Jane',
    last_name: 'Doe',
    approval_status: status,
  });

  let component: AppComponent;

  beforeEach(() => {
    mockRouter.navigate.mockClear();
    decodeAccountCodeMock.mockReset().mockReturnValue({
      email: 'test@example.com',
      type: 'approve',
    });
    supabaseDirectQueryMock.mockReset().mockResolvedValue({
      data: [createRequest()],
      error: null,
    });
    supabaseDirectMutationMock.mockReset().mockResolvedValue({ error: null });
    supabaseRpcMock.mockReset().mockResolvedValue({ error: null });
    lookupPersonByEmailMock.mockReset().mockResolvedValue({ count: 0 });
    emailGetTemplateMock.mockReset().mockResolvedValue({
      subject: 'Welcome {{firstName}}',
      html_body: '<p>{{firstName}}</p>',
      text_body: 'Hi {{firstName}}',
    });
    emailApplyTemplateVariablesMock.mockReset().mockImplementation(
      (template: string, vars: Record<string, string> = {}) => {
        let output = template;
        Object.entries(vars).forEach(([key, value]) => {
          output = output.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        return output;
      }
    );
    emailSendEmailMock.mockReset().mockResolvedValue({});
    toastShowToastMock.mockReset();
    component = createComponent();
  });

  const callHandler = async (code = 'account_approve_test') => {
    await (component as unknown as { handleAccountApprovalCode: (c: string) => Promise<void> })
      .handleAccountApprovalCode(code);
  };

  it('approves a pending request and notifies success', async () => {
    await callHandler();
    expect(toastShowToastMock).toHaveBeenCalledWith(
      expect.stringContaining('Account approved'),
      'success'
    );
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    expect(lookupPersonByEmailMock).toHaveBeenCalled();
  });

  it('denies a pending request and sends a denial email', async () => {
    decodeAccountCodeMock.mockReturnValue({ email: 'deny@example.com', type: 'deny' });
    emailGetTemplateMock.mockResolvedValueOnce({
      subject: 'Denied {{firstName}}',
      html_body: '<p>Denied {{firstName}}</p>',
      text_body: 'Denied {{firstName}}',
    });
    await callHandler('account_deny_test');
    expect(emailGetTemplateMock).toHaveBeenCalledWith('account_denied');
    expect(toastShowToastMock).toHaveBeenCalledWith(
      expect.stringContaining('Account denied'),
      'info'
    );
  });

  it('falls back to a generic toast when an exception occurs', async () => {
    supabaseDirectQueryMock.mockRejectedValueOnce(new Error('boom'));
    await callHandler();
    expect(toastShowToastMock).toHaveBeenCalledWith('Failed to process approval', 'error');
  });
});
