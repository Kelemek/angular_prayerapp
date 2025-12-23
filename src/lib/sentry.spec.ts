import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeSentry } from './sentry';
import * as Sentry from '@sentry/angular';

// Mock the @sentry/angular module
vi.mock('@sentry/angular', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
}));

// Mock the environment
vi.mock('../environments/environment', () => ({
  environment: {
    production: false,
    sentryDsn: 'https://test@sentry.io/12345',
  },
}));

describe('sentry', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock console methods to prevent noise in test output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    
    // Mock window object to simulate browser environment
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('initializeSentry', () => {
    it('should initialize Sentry with valid DSN in development', () => {
      initializeSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/12345',
          environment: 'development',
          tracesSampleRate: 0.1,
          release: '1.0.0',
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        })
      );
      expect(Sentry.browserTracingIntegration).toHaveBeenCalled();
      expect(Sentry.replayIntegration).toHaveBeenCalled();
    });

    it('should set window.Sentry after initialization', () => {
      initializeSentry();

      expect((window as any).Sentry).toBeDefined();
      expect((window as any).Sentry).toBe(Sentry);
    });

    it('should configure integrations correctly', () => {
      initializeSentry();

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
      expect(initCall.integrations).toHaveLength(2);
      expect(initCall.integrations[0]).toEqual({ name: 'BrowserTracing' });
      expect(initCall.integrations[1]).toEqual({ name: 'Replay' });
    });

    it('should configure ignoreErrors list', () => {
      initializeSentry();

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
      expect(initCall.ignoreErrors).toContain('top.GLOBALS');
      expect(initCall.ignoreErrors).toContain('chrome-extension://');
      expect(initCall.ignoreErrors).toContain('moz-extension://');
      expect(initCall.ignoreErrors).toContain('error:addon_install_cancelled');
      expect(initCall.ignoreErrors).toContain('NetworkError');
      expect(initCall.ignoreErrors).toContain('Failed to fetch');
      expect(initCall.ignoreErrors).toContain('Permission denied');
    });

    it('should configure beforeSend to filter development errors', () => {
      initializeSentry();

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      expect(beforeSend).toBeDefined();

      // In development, beforeSend should return null
      const result = beforeSend!({ event_id: '123' } as any);
      expect(result).toBeNull();
    });

    it('should configure beforeSend to allow production errors', async () => {
      // Mock environment with production flag
      vi.doMock('../environments/environment', () => ({
        environment: {
          production: true,
          sentryDsn: 'https://test@sentry.io/12345',
        },
      }));

      vi.resetModules();
      const { initializeSentry: init } = await import('./sentry');
      
      init();

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      // In production, beforeSend should return the event
      const event = { event_id: '123' } as any;
      const result = beforeSend!(event);
      expect(result).toBe(event);
    });

    it('should not initialize if DSN is not configured', async () => {
      // Mock environment without DSN
      vi.doMock('../environments/environment', () => ({
        environment: {
          production: false,
          sentryDsn: undefined,
        },
      }));

      vi.resetModules();
      const { initializeSentry: init } = await import('./sentry');
      
      init();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalledWith('Sentry DSN not configured');
    });

    it('should not log debug message in production when DSN is missing', async () => {
      // Mock environment without DSN in production
      vi.doMock('../environments/environment', () => ({
        environment: {
          production: true,
          sentryDsn: undefined,
        },
      }));

      vi.resetModules();
      const { initializeSentry: init } = await import('./sentry');
      
      init();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', () => {
      // Mock Sentry.init to throw an error
      const mockError = new Error('Failed to initialize Sentry');
      vi.mocked(Sentry.init).mockImplementation(() => {
        throw mockError;
      });

      // Should not throw, but should log error
      expect(() => initializeSentry()).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Failed to initialize Sentry:',
        mockError
      );
    });

    it('should use production environment string in production mode', async () => {
      // Mock environment with production flag
      vi.doMock('../environments/environment', () => ({
        environment: {
          production: true,
          sentryDsn: 'https://test@sentry.io/12345',
        },
      }));

      vi.resetModules();
      const { initializeSentry: init } = await import('./sentry');
      
      init();

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
      expect(initCall.environment).toBe('production');
    });

    it('should configure correct sample rates', () => {
      initializeSentry();

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
      expect(initCall.tracesSampleRate).toBe(0.1);
      expect(initCall.replaysSessionSampleRate).toBe(0.1);
      expect(initCall.replaysOnErrorSampleRate).toBe(1.0);
    });

    it('should set correct release version', () => {
      initializeSentry();

      const initCall = vi.mocked(Sentry.init).mock.calls[0][0];
      expect(initCall.release).toBe('1.0.0');
    });
  });
});
