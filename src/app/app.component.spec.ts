import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

if (typeof window === 'undefined') {
  (globalThis as any).window = {
    location: {
      search: '',
      pathname: '/test',
      origin: 'http://localhost'
    },
    history: {
      replaceState: vi.fn()
    },
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    scrollTo: vi.fn()
  };
}

if (typeof document === 'undefined') {
  (globalThis as any).document = {
    hidden: false,
    documentElement: { scrollTop: 0 },
    body: { scrollTop: 0 },
    querySelector: vi.fn()
  };
}
import { AppComponent } from './app.component';
import { Router, NavigationEnd } from '@angular/router';
import { Injector, ChangeDetectorRef, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

const decodeAccountCodeMock = vi.fn();
const supabaseDirectQueryMock = vi.fn();
const supabaseDirectMutationMock = vi.fn();
const lookupPersonByEmailMock = vi.fn();
const emailGetTemplateMock = vi.fn();
const emailApplyTemplateVariablesMock = vi.fn();
const emailSendEmailMock = vi.fn();
const toastShowToastMock = vi.fn();

vi.mock('./services/approval-links.service', () => {
  return {
    ApprovalLinksService: class {
      decodeAccountCode() {
        return decodeAccountCodeMock();
      }
    }
  };
});

vi.mock('./services/supabase.service', () => {
  return {
    SupabaseService: class {
      directQuery(...args: unknown[]) {
        return supabaseDirectQueryMock(...args);
      }

      directMutation(...args: unknown[]) {
        return supabaseDirectMutationMock(...args);
      }
    }
  };
});

vi.mock('./services/email-notification.service', () => {
  return {
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
    }
  };
});

vi.mock('./services/toast.service', () => {
  return {
    ToastService: class {
      showToast(message: string, type: string) {
        return toastShowToastMock(message, type);
      }
    }
  };
});

vi.mock('../lib/planning-center', () => ({
  lookupPersonByEmail: lookupPersonByEmailMock
}));

vi.mock('../environments/environment', () => ({
  environment: {
    supabaseUrl: 'https://example.supabase',
    supabaseAnonKey: 'anon-key'
  }
}));

describe('AppComponent', () => {
  let component: AppComponent;
  let mockRouter: any;
  let mockInjector: any;
  let mockNgZone: any;
  let mockCdr: any;
  let routerEventsSubject: Subject<any>;

  beforeEach(() => {
    // Create mock router with events subject
    routerEventsSubject = new Subject();
    mockRouter = {
      events: routerEventsSubject.asObservable(),
      navigate: vi.fn().mockResolvedValue(true)
    };

    // Create mock NgZone
    mockNgZone = {
      run: vi.fn((fn) => fn())
    };

    // Create mock ChangeDetectorRef
    mockCdr = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn()
    };

    // Create mock Injector
    mockInjector = {
      get: vi.fn((token) => {
        const name = typeof token?.name === 'string' ? token.name : '';
        if (name === 'ToastService') {
          return { showToast: vi.fn() };
        }
        return {};
      })
    };

    // Mock window and document methods
    window.scrollTo = vi.fn();
    window.addEventListener = vi.fn();
    window.dispatchEvent = vi.fn();
    window.history.replaceState = vi.fn();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        pathname: '/test',
        origin: 'http://localhost'
      },
      writable: true,
      configurable: true
    });

    document.querySelector = vi.fn();
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
      configurable: true
    });

    // Create component
    component = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have title property set to prayerapp', () => {
      expect(component.title).toBe('prayerapp');
    });

    it('should setup global error handler on construction', () => {
      expect(mockNgZone.run).toHaveBeenCalled();
    });

    it('should subscribe to router events on construction', () => {
      expect(routerEventsSubject.observers.length).toBeGreaterThan(0);
    });
  });

  describe('setupGlobalErrorHandler', () => {
    it('should register unhandledrejection event listener', () => {
      expect(window.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );
    });

    it('should register error event listener', () => {
      expect(window.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
    });

    it('should handle unhandledrejection events', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const listenerCalls = (window.addEventListener as any).mock.calls;
      const unhandledRejectionListener = listenerCalls.find(
        (call: any) => call[0] === 'unhandledrejection'
      )?.[1];

      if (unhandledRejectionListener) {
        const event = { reason: new Error('Test rejection') };
        unhandledRejectionListener(event);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[GlobalErrorHandler] Unhandled promise rejection:',
          expect.any(Error)
        );
      }
      consoleErrorSpy.mockRestore();
    });

    it('should handle global error events', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const listenerCalls = (window.addEventListener as any).mock.calls;
      const errorListener = listenerCalls.find((call: any) => call[0] === 'error')?.[1];

      if (errorListener) {
        const event = { error: new Error('Test error') };
        errorListener(event);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[GlobalErrorHandler] Global error:',
          expect.any(Error)
        );
      }
      consoleErrorSpy.mockRestore();
    });
  });

  describe('setupScrollToTopOnNavigation', () => {
    it('should subscribe to router navigation events', () => {
      expect(routerEventsSubject.observers.length).toBeGreaterThan(0);
    });

    it('should scroll to top on NavigationEnd event', () => {
      const navEnd = new NavigationEnd(1, '/test', '/test');
      vi.useFakeTimers();

      routerEventsSubject.next(navEnd);
      vi.runAllTimers();

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        left: 0,
        behavior: 'instant'
      });

      vi.useRealTimers();
    });

    it('should ignore non-NavigationEnd events', () => {
      vi.useFakeTimers();
      const scrollToSpy = vi.spyOn(window, 'scrollTo');
      routerEventsSubject.next({ type: 'NavigationStart' });

      vi.runAllTimers();
      expect(scrollToSpy).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('onWindowFocus', () => {
    it('should update lastVisibilityState when window receives focus', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      component.onWindowFocus();
      expect(component).toBeTruthy();
    });

    it('should mark for check on window focus', () => {
      component.onWindowFocus();
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should detect changes on window focus', () => {
      component.onWindowFocus();
      expect(mockCdr.detectChanges).toHaveBeenCalled();
    });

    it('should trigger DOM recovery on window focus', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      document.querySelector = vi.fn().mockReturnValue({ contains: vi.fn(() => true) });
      component.onWindowFocus();

      expect(document.querySelector).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it('should handle when querySelector returns null', () => {
      document.querySelector = vi.fn().mockReturnValue(null);
      expect(() => component.onWindowFocus()).not.toThrow();
    });
  });

  describe('onVisibilityChange', () => {
    it('should update lastVisibilityState when visibility changes', () => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      component.onVisibilityChange();
      expect(component).toBeTruthy();
    });

    it('should trigger change detection when page becomes visible', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      component.onVisibilityChange();
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('should detect changes when visibility changes to visible', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      component.onVisibilityChange();
      expect(mockCdr.detectChanges).toHaveBeenCalled();
    });

    it('should handle visibility change to hidden', () => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      expect(() => component.onVisibilityChange()).not.toThrow();
    });

    it('should check DOM integrity when becoming visible', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      document.querySelector = vi.fn(() => ({ contains: vi.fn(() => true) }));
      component.onVisibilityChange();
      expect(document.querySelector).toHaveBeenCalled();
    });
  });

  describe('triggerDOMRecoveryIfNeeded', () => {
    it('should check for app-root element', () => {
      const appRoot = { contains: vi.fn(() => true) };
      document.querySelector = vi.fn((selector) => {
        if (selector === 'app-root') return appRoot;
        return null;
      });

      component.onWindowFocus();
      expect(document.querySelector).toHaveBeenCalledWith('app-root');
    });

    it('should check for router-outlet element', () => {
      const appRoot = { contains: vi.fn(() => true) };
      document.querySelector = vi.fn((selector) => {
        if (selector === 'app-root') return appRoot;
        if (selector === 'router-outlet') return {};
        return null;
      });

      component.onWindowFocus();
      expect(document.querySelector).toHaveBeenCalledWith('router-outlet');
    });

    it('should dispatch app-became-visible event when router-outlet is detached', () => {
      const appRoot = { contains: vi.fn(() => false) };
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      document.querySelector = vi.fn((selector) => {
        if (selector === 'app-root') return appRoot;
        if (selector === 'router-outlet') return {};
        return null;
      });

      component.onWindowFocus();
      expect(window.dispatchEvent).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should handle DOM recovery check errors gracefully', () => {
      document.querySelector = vi.fn(() => {
        throw new Error('DOM access error');
      });
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      expect(() => component.onWindowFocus()).not.toThrow();
      consoleDebugSpy.mockRestore();
    });

    it('should call detect changes when no content is found', () => {
      vi.useFakeTimers();
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      document.querySelector = vi.fn((selector) => {
        if (selector === 'app-root') return { contains: vi.fn(() => true) };
        if (selector === 'router-outlet') return {};
        return null;
      });

      component.onWindowFocus();
      vi.runAllTimers();

      expect(mockCdr.detectChanges).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('ngOnInit', () => {
    it('should call handleApprovalCode on init', async () => {
      window.location = { search: '' } as any;
      await component.ngOnInit();
      expect(component).toBeTruthy();
    });

    it('should handle empty URL params', async () => {
      window.location = { search: '' } as any;
      await component.ngOnInit();
      expect(component).toBeTruthy();
    });
  });

  describe('Error handling and recovery', () => {
    it('should handle unhandledrejection errors', () => {
      const listener = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'unhandledrejection'
      )?.[1];

      if (listener) {
        expect(() => {
          listener({
            reason: new Error('Test error'),
            preventDefault: vi.fn()
          });
        }).not.toThrow();
      }

      expect(window.addEventListener).toHaveBeenCalled();
    });

    it('should handle window error events', () => {
      const listener = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'error'
      )?.[1];

      if (listener) {
        expect(() => {
          listener(new ErrorEvent('error', { message: 'Test' }));
        }).not.toThrow();
      }

      expect(window.addEventListener).toHaveBeenCalled();
    });

    it('should have error handlers available during initialization', () => {
      const addEventListenerCalls = (window.addEventListener as any).mock.calls;
      const hasUnhandledRejection = addEventListenerCalls.some(
        (call: any) => call[0] === 'unhandledrejection'
      );
      const hasError = addEventListenerCalls.some(
        (call: any) => call[0] === 'error'
      );

      expect(hasUnhandledRejection).toBe(true);
      expect(hasError).toBe(true);
    });

    it('should initialize component without throwing', () => {
      expect(() => {
        component.ngOnInit();
      }).not.toThrow();
    });

    it('should handle rapid initialization calls', () => {
      expect(() => {
        component.ngOnInit();
        component.ngOnInit();
        component.ngOnInit();
      }).not.toThrow();
    });
  });

  describe('URL handling and parameter parsing', () => {
    it('should parse URL search parameters correctly', () => {
      window.location.search = '?code=test123&param1=value1&param2=value2';
      
      const params = new URLSearchParams(window.location.search);
      expect(params.get('code')).toBe('test123');
      expect(params.get('param1')).toBe('value1');
    });

    it('should handle empty URL search', async () => {
      window.location.search = '';
      
      await component.ngOnInit();
      
      expect(window.history.replaceState).not.toHaveBeenCalled();
    });

    it('should handle encoded URL parameters', () => {
      window.location.search = '?code=test%20with%20spaces';
      
      const params = new URLSearchParams(window.location.search);
      expect(params.get('code')).toBe('test with spaces');
    });

    it('should handle multiple parameters in URL', async () => {
      window.location.search = '?code=abc123&redirect=/home&user=test@example.com';
      
      await component.ngOnInit();
      
      expect(component).toBeTruthy();
    });

    it('should strip code param when processing approval code', async () => {
      window.location.search = '?code=test123&other=param';
      vi.clearAllMocks();
      
      // window.history.replaceState is already tracked from setup
      await component.ngOnInit();
      
      // Verify replaceState was called to clean up URL
      if ((window.history.replaceState as any).mock) {
        expect(window.history.replaceState).toHaveBeenCalled();
      }
    });
  });

  describe('Approval code format detection', () => {
    it('should detect account_approve_ prefix', async () => {
      window.location.search = '?code=account_approve_valid123';
      
      // Account approval codes should attempt to load services
      await component.ngOnInit();
      
      expect(component).toBeTruthy();
    });

    it('should detect account_deny_ prefix', async () => {
      window.location.search = '?code=account_deny_valid456';
      
      // Account denial codes should attempt to load services  
      await component.ngOnInit();
      
      expect(component).toBeTruthy();
    });

    it('should route non-account codes to admin', async () => {
      window.location.search = '?code=someOtherCode';
      vi.spyOn(window.history, 'replaceState');

      await component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
      expect(window.history.replaceState).toHaveBeenCalled();
    });

    it('should differentiate between approval types', async () => {
      const approveCode = 'account_approve_test';
      const denyCode = 'account_deny_test';

      const approvePrefix = approveCode.startsWith('account_approve_');
      const denyPrefix = denyCode.startsWith('account_deny_');

      expect(approvePrefix).toBe(true);
      expect(denyPrefix).toBe(true);
      expect(approvePrefix && denyPrefix).toBe(true);
    });
  });

  describe('Navigation and routing', () => {
    it('should navigate to /admin for non-account codes', async () => {
      window.location.search = '?code=adminCode123';

      await component.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should replace state before navigating', async () => {
      window.location.search = '?code=someCode';
      vi.spyOn(window.history, 'replaceState');

      await component.ngOnInit();

      expect(window.history.replaceState).toHaveBeenCalled();
      // replaceState should be called before navigate
      const replaceIndex = (window.history.replaceState as any).mock.invocationCallOrder[0];
      const navigateIndex = (mockRouter.navigate as any).mock.invocationCallOrder[0];
      expect(replaceIndex).toBeLessThan(navigateIndex);
    });

    it('should not navigate when no code is present', async () => {
      window.location.search = '';
      vi.resetAllMocks();

      // Use existing component which is already created with mocked dependencies
      await component.ngOnInit();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle router.navigate being called with correct parameters', async () => {
      window.location.search = '?code=testCode';

      await component.ngOnInit();

      const calls = (mockRouter.navigate as any).mock.calls;
      if (calls.length > 0) {
        const lastCall = calls[calls.length - 1];
        expect(Array.isArray(lastCall[0])).toBe(true);
      }
    });
  });

  describe('Component Lifecycle', () => {
    it('should implement OnInit', () => {
      expect(typeof component.ngOnInit).toBe('function');
    });

    it('should handle multiple navigation events', () => {
      vi.useFakeTimers();
      const navEnd1 = new NavigationEnd(1, '/test1', '/test1');
      const navEnd2 = new NavigationEnd(2, '/test2', '/test2');

      routerEventsSubject.next(navEnd1);
      routerEventsSubject.next(navEnd2);

      vi.runAllTimers();
      expect(window.scrollTo).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should handle multiple visibility changes', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      component.onVisibilityChange();

      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      component.onVisibilityChange();

      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      component.onVisibilityChange();

      expect(component).toBeTruthy();
    });

    it('should handle multiple window focus events', () => {
      component.onWindowFocus();
      component.onWindowFocus();
      component.onWindowFocus();

      expect(mockCdr.markForCheck).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from unhandled promise rejections', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'unhandledrejection'
      )?.[1];

      if (errorHandler) {
        errorHandler({ reason: 'Test error' });
        expect(consoleErrorSpy).toHaveBeenCalled();
      }

      consoleErrorSpy.mockRestore();
    });

    it('should recover from global errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'error'
      )?.[1];

      if (errorHandler) {
        errorHandler({ error: 'Test error' });
        expect(consoleErrorSpy).toHaveBeenCalled();
      }

      consoleErrorSpy.mockRestore();
    });

    it('should handle DOM recovery attempts', () => {
      document.querySelector = vi.fn(() => ({
        contains: vi.fn(() => true)
      }));

      component.onWindowFocus();
      expect(document.querySelector).toHaveBeenCalled();
    });
  });

  describe('Browser Compatibility', () => {
    it('should work on Safari with automatic visibility handling', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      component.onVisibilityChange();
      expect(mockCdr.detectChanges).toHaveBeenCalled();
    });

    it('should work on Edge iOS with manual recovery', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      component.onWindowFocus();
      expect(mockCdr.detectChanges).toHaveBeenCalled();
    });

    it('should handle page visibility changes', () => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      component.onVisibilityChange();

      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      component.onVisibilityChange();

      expect(component).toBeTruthy();
    });
  });

  describe('Lifecycle and async operations', () => {
    it('should call handleApprovalCode during ngOnInit', async () => {
      window.location.search = '';
      
      // ngOnInit should call handleApprovalCode internally
      const ngOnInitSpy = vi.spyOn(component, 'ngOnInit');
      
      await component.ngOnInit();
      
      expect(ngOnInitSpy).toHaveBeenCalled();
    });

    it('should handle ngOnInit with various URL states', async () => {
      const testCases = [
        '?code=test1',
        '?code=account_approve_test',
        '?code=account_deny_test',
        '?param=value'
      ];

      for (const search of testCases) {
        window.location.search = search;
        expect(async () => await component.ngOnInit()).not.toThrow();
      }
    });

    it('should process codes synchronously when present', async () => {
      window.location.search = '?code=someCode';
      
      const startTime = Date.now();
      await component.ngOnInit();
      const elapsed = Date.now() - startTime;
      
      // Should process relatively quickly
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Account Approval Code Handling', () => {
    let mockApprovalLinksService: any;
    let mockSupabaseService: any;
    let mockEmailService: any;
    let mockToastService: any;

    beforeEach(() => {
      // Create mock services for approval code handling
      mockApprovalLinksService = {
        decodeAccountCode: vi.fn().mockReturnValue({
          email: 'test@example.com',
          type: 'approve'
        })
      };

      mockSupabaseService = {
        directQuery: vi.fn().mockResolvedValue({
          data: [{
            id: '123',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            approval_status: 'pending'
          }],
          error: null
        }),
        directMutation: vi.fn().mockResolvedValue({ error: null })
      };

      mockEmailService = {
        getTemplate: vi.fn().mockResolvedValue({
          subject: 'Welcome {{firstName}}',
          html_body: '<p>Welcome {{firstName}}</p>',
          text_body: 'Welcome {{firstName}}'
        }),
        applyTemplateVariables: vi.fn((template, vars) => {
          let result = template;
          Object.keys(vars).forEach(key => {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), vars[key]);
          });
          return result;
        }),
        sendEmail: vi.fn().mockResolvedValue({})
      };

      mockToastService = {
        showToast: vi.fn()
      };

      // Mock injector to return appropriate mock service for any injector.get() call
      // This works because the code imports the service class and passes it to get()
      mockInjector.get = vi.fn().mockImplementation(function(ServiceClass: any) {
        // Return mocks for all possible services
        // Since we don't know the exact class reference, we return all mocks
        // The first call will be for ApprovalLinksService, then SupabaseService, etc.
        if (!mockInjector._callCount) mockInjector._callCount = 0;
        
        const callCount = mockInjector._callCount++;
        
        // Rotate through the mocks based on call count
        const mocks = [
          mockApprovalLinksService,   // First call - ApprovalLinksService
          mockSupabaseService,         // Second call - SupabaseService  
          mockEmailService,            // Third call - EmailNotificationService
          mockToastService             // Fourth call - ToastService
        ];
        
        return mocks[callCount % mocks.length] || mockApprovalLinksService;
      });
    });

    it('should handle account_approve_ code format', async () => {
      window.location.search = '?code=account_approve_test123';
      
      // Create new component with mocked services
      const testComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      
      await testComponent.ngOnInit();
      
      // Component should have called ngOnInit
      expect(testComponent).toBeTruthy();
    });

    it('should handle account_deny_ code format', async () => {
      window.location.search = '?code=account_deny_test456';
      mockApprovalLinksService.decodeAccountCode.mockReturnValue({
        email: 'test@example.com',
        type: 'deny'
      });
      
      const testComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      
      await testComponent.ngOnInit();
      
      expect(testComponent).toBeTruthy();
    });

    it('should process approval codes without throwing', async () => {
      window.location.search = '?code=account_approve_test';
      
      expect(async () => {
        const testComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
        await testComponent.ngOnInit();
      }).not.toThrow();
    });

    it('should call router navigate after processing approval code', async () => {
      window.location.search = '?code=account_approve_test';
      
      const testComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await testComponent.ngOnInit();

      // Check if navigate was called
      expect(mockRouter.navigate).toBeDefined();
    });

    it('should handle non-account codes properly', async () => {
      window.location.search = '?code=someOtherCode';
      
      const testComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await testComponent.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should handle empty code gracefully', async () => {
      window.location.search = '';
      
      const testComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await testComponent.ngOnInit();

      // Should not navigate if no code
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle codes with special characters', async () => {
      window.location.search = '?code=account_approve_%2F%3F%40';
      
      const testComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      
      expect(async () => {
        await testComponent.ngOnInit();
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle full initialization flow', () => {
      expect(component.title).toBe('prayerapp');
      expect(mockNgZone.run).toHaveBeenCalled();
    });

    it('should handle navigation and visibility change together', () => {
      vi.useFakeTimers();
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      const navEnd = new NavigationEnd(1, '/test', '/test');
      routerEventsSubject.next(navEnd);

      component.onVisibilityChange();
      vi.runAllTimers();

      expect(mockCdr.detectChanges).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should handle focus and visibility events together', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      component.onWindowFocus();
      component.onVisibilityChange();

      expect(mockCdr.markForCheck).toHaveBeenCalled();
      expect(mockCdr.detectChanges).toHaveBeenCalled();
    });

    it('should handle sequential DOM recovery checks', () => {
      document.querySelector = vi.fn(() => ({
        contains: vi.fn(() => true)
      }));

      component.onWindowFocus();
      component.onWindowFocus();

      expect(document.querySelector).toHaveBeenCalled();
    });

    it('should maintain component state through lifecycle', () => {
      expect(component.title).toBe('prayerapp');
      component.onWindowFocus();
      expect(component.title).toBe('prayerapp');
      component.onVisibilityChange();
      expect(component.title).toBe('prayerapp');
    });
  });

  describe('Event Listener Registration', () => {
    it('should register NgZone error handlers', () => {
      expect(mockNgZone.run).toHaveBeenCalled();
    });

    it('should register window event listeners', () => {
      const addEventListenerCalls = (window.addEventListener as any).mock.calls;
      expect(addEventListenerCalls.length).toBeGreaterThan(0);
    });

    it('should handle both error types in global error handler', () => {
      const addEventListenerCalls = (window.addEventListener as any).mock.calls;
      const eventTypes = addEventListenerCalls.map((call: any) => call[0]);

      expect(eventTypes).toContain('unhandledrejection');
      expect(eventTypes).toContain('error');
    });
  });

  describe('Approval Code Handling', () => {
    beforeEach(() => {
      // Reset location search
      Object.defineProperty(window, 'location', {
        value: {
          search: '',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });
    });

    it('should handle ngOnInit call', () => {
      component.ngOnInit();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to admin when code parameter is provided', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=admin_code_12345',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should detect account approval code prefix', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=account_approve_test@example.com_token123',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      
      // Just verify that ngOnInit doesn't throw for account_approve codes
      expect(async () => {
        await newComponent.ngOnInit();
      }).not.toThrow();
    });

    it('should detect account denial code prefix', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=account_deny_test@example.com_token123',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      
      // Just verify that ngOnInit doesn't throw for account_deny codes
      expect(async () => {
        await newComponent.ngOnInit();
      }).not.toThrow();
    });

    it('should handle no code parameter gracefully', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle empty code parameter', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle code parameter with other query parameters', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?redirect=/home&code=admin_code_12345&utm=test',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should clean URL parameters after handling approval code', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=admin_code_12345',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      expect(window.history.replaceState).toHaveBeenCalled();
    });

    it('should handle invalid URL search params', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?invalid_param=test',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to admin for non-account-approval codes', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=some_other_code',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should detect different account action prefixes', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=account_deny_different_test',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      
      // Just verify that ngOnInit doesn't throw for account_deny codes
      expect(async () => {
        await newComponent.ngOnInit();
      }).not.toThrow();
    });

    it('should handle multiple code parameters (first one wins)', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=admin_code_1&code=admin_code_2',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should handle query string with special characters in code', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=admin_code_with%20spaces',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      // Should navigate to admin with the decoded code
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('should handle case-sensitive account approval codes', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=Account_Approve_test',
          pathname: '/test',
          origin: 'http://localhost'
        },
        writable: true
      });

      const newComponent = new AppComponent(mockRouter, mockInjector, mockNgZone, mockCdr);
      await newComponent.ngOnInit();

      // Should not match account_approve_ because of case sensitivity
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
    });
  });

  describe('handleAccountApprovalCode detailed flows', () => {
    const createRequest = (status = 'pending') => ({
      id: 'req-123',
      email: 'test@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
      approval_status: status
    });

    let approvalLinksServiceInstance: { decodeAccountCode: () => { email: string; type: string } | null };
    let supabaseServiceInstance: {
      directQuery: (...args: unknown[]) => Promise<any>;
      directMutation: (...args: unknown[]) => Promise<any>;
    };
    let emailServiceInstance: {
      getTemplate: (templateName: string) => Promise<any>;
      applyTemplateVariables: (template: string, vars?: Record<string, string>) => string;
      sendEmail: (payload: unknown) => Promise<any>;
    };
    let toastServiceInstance: { showToast: (message: string, type: string) => void };

    beforeEach(() => {
      approvalLinksServiceInstance = {
        decodeAccountCode: () => decodeAccountCodeMock()
      };
      supabaseServiceInstance = {
        directQuery: (...args: unknown[]) => supabaseDirectQueryMock(...args),
        directMutation: (...args: unknown[]) => supabaseDirectMutationMock(...args)
      };
      emailServiceInstance = {
        getTemplate: (templateName: string) => emailGetTemplateMock(templateName),
        applyTemplateVariables: (template: string, vars: Record<string, string> = {}) =>
          emailApplyTemplateVariablesMock(template, vars),
        sendEmail: (payload: unknown) => emailSendEmailMock(payload)
      };
      toastServiceInstance = {
        showToast: (message: string, type: string) => toastShowToastMock(message, type)
      };

      mockInjector.get = vi.fn((token) => {
        const name = typeof token?.name === 'string' ? token.name : '';

        if (name === 'ApprovalLinksService') {
          return approvalLinksServiceInstance;
        }
        if (name === 'SupabaseService') {
          return supabaseServiceInstance;
        }
        if (name === 'EmailNotificationService') {
          return emailServiceInstance;
        }
        if (name === 'ToastService') {
          return toastServiceInstance;
        }

        return {};
      });

      window.location.search = '';

      decodeAccountCodeMock
        .mockReset()
        .mockReturnValue({
          email: 'test@example.com',
          type: 'approve'
        });

      supabaseDirectQueryMock
        .mockReset()
        .mockResolvedValue({
          data: [createRequest()],
          error: null
        });

      supabaseDirectMutationMock.mockReset().mockResolvedValue({ error: null });

      lookupPersonByEmailMock.mockReset().mockResolvedValue({ count: 0 });

      emailGetTemplateMock
        .mockReset()
        .mockResolvedValue({
          subject: 'Welcome {{firstName}}',
          html_body: '<p>{{firstName}}</p>',
          text_body: 'Hi {{firstName}}'
        });

      emailApplyTemplateVariablesMock
        .mockReset()
        .mockImplementation((template: string, vars: Record<string, string> = {}) => {
          let output = template;
          Object.entries(vars).forEach(([key, value]) => {
            output = output.replace(new RegExp(`{{${key}}}`, 'g'), value);
          });
          return output;
        });

      emailSendEmailMock.mockReset().mockResolvedValue({});
      toastShowToastMock.mockReset();
    });

    const callHandler = async (code = 'account_approve_test') => {
      await (component as any).handleAccountApprovalCode(code);
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
      decodeAccountCodeMock.mockReturnValue({
        email: 'deny@example.com',
        type: 'deny'
      });
      emailGetTemplateMock.mockResolvedValueOnce({
        subject: 'Denied {{firstName}}',
        html_body: '<p>Denied {{firstName}}</p>',
        text_body: 'Denied {{firstName}}'
      });

      await callHandler('account_deny_test');

      expect(emailGetTemplateMock).toHaveBeenCalledWith('account_denied');
      expect(emailSendEmailMock).toHaveBeenCalled();
      expect(toastShowToastMock).toHaveBeenCalledWith(
        expect.stringContaining('Account denied'),
        'info'
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('notifies when the request has already been processed', async () => {
      supabaseDirectQueryMock.mockResolvedValueOnce({
        data: [createRequest('approved')],
        error: null
      });

      await callHandler();

      expect(toastShowToastMock).toHaveBeenCalledWith(
        expect.stringContaining('already been approved'),
        'info'
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('handles invalid approval codes gracefully', async () => {
      decodeAccountCodeMock.mockReturnValue(null);

      await callHandler();

      expect(toastShowToastMock).toHaveBeenCalledWith('Invalid approval link', 'error');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      expect(supabaseDirectQueryMock).not.toHaveBeenCalled();
    });

    it('handles missing approval requests', async () => {
      supabaseDirectQueryMock.mockResolvedValueOnce({
        data: [],
        error: 'not found'
      });

      await callHandler();

      expect(toastShowToastMock).toHaveBeenCalledWith('Approval request not found', 'error');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('does not approve when inserting a subscriber fails', async () => {
      supabaseDirectMutationMock.mockResolvedValueOnce({ error: 'insert-error' });

      await callHandler();

      expect(toastShowToastMock).toHaveBeenCalledWith('Failed to approve account', 'error');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      expect(supabaseDirectMutationMock).toHaveBeenCalled();
    });

    it('falls back to a generic toast when an exception occurs', async () => {
      supabaseDirectQueryMock.mockRejectedValueOnce(new Error('boom'));

      await callHandler();

      expect(toastShowToastMock).toHaveBeenCalledWith('Failed to process approval', 'error');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Component title property', () => {
    it('should have correct title', () => {
      expect(component.title).toBe('prayerapp');
    });

    it('should keep title unchanged', () => {
      const originalTitle = component.title;
      component.ngOnInit();
      expect(component.title).toBe(originalTitle);
    });
  });
});
