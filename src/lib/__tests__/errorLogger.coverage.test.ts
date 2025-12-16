import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as errorLogger from '../errorLogger';

describe('errorLogger - Coverage Tests', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleLogSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    
    // Setup basic globals
    (global as any).window = {
      location: { href: 'http://test.com', pathname: '/test' },
      performance: {
        timing: {
          loadEventEnd: 2000,
          navigationStart: 0,
          responseEnd: 100,
          requestStart: 50,
          domComplete: 1800,
          domLoading: 100
        }
      },
      addEventListener: vi.fn()
    };
    (global as any).document = {
      referrer: 'http://ref.com',
      documentElement: {
        classList: {
          contains: vi.fn().mockReturnValue(false)
        }
      }
    };
    (global as any).navigator = {
      userAgent: 'test-agent',
      serviceWorker: {
        addEventListener: vi.fn()
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).navigator;
  });

  describe('Service Worker Error Handling', () => {
    it('adds service worker error listener if service worker is available', () => {
      const addEventListenerSpy = vi.fn();
      (global as any).navigator = {
        serviceWorker: {
          addEventListener: addEventListenerSpy
        }
      };

      errorLogger.setupGlobalErrorHandling();

      // Check that service worker error listener was added
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('does not throw when serviceWorker is not available', () => {
      delete (global as any).navigator.serviceWorker;

      expect(() => {
        errorLogger.setupGlobalErrorHandling();
      }).not.toThrow();
    });
  });

  describe('Performance Metrics Error Handling', () => {
    it('logs debug message when performance metrics fail', () => {
      // Make performance.timing throw an error
      (global as any).window = {
        performance: {
          timing: {
            get loadEventEnd() { throw new Error('Performance API error'); }
          }
        }
      };

      errorLogger.logPerformanceMetrics();

      // Should catch error and log debug message
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Failed to log performance metrics:',
        expect.any(Error)
      );
    });
  });

  describe('External Error Tracking', () => {
    it('logs debug message when Datadog RUM fails', () => {
      (global as any).window.DD_RUM = {
        addError: vi.fn().mockImplementation(() => {
          throw new Error('Datadog failed');
        })
      };

      errorLogger.logError({
        message: 'Test error',
        error: new Error('Test')
      });

      // Should catch Datadog error and log debug
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Failed to log to Datadog:',
        expect.any(Error)
      );
    });

    it('logs debug message when Sentry fails', () => {
      (global as any).window.Sentry = {
        captureException: vi.fn().mockImplementation(() => {
          throw new Error('Sentry failed');
        })
      };

      errorLogger.logError({
        message: 'Test error',
        error: new Error('Test')
      });

      // Should catch Sentry error and log debug
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Failed to log to Sentry:',
        expect.any(Error)
      );
    });

    it('handles Sentry when payload has stack', () => {
      const captureExceptionSpy = vi.fn();
      (global as any).window.Sentry = {
        captureException: captureExceptionSpy
      };

      errorLogger.logError({
        message: 'Test error with stack',
        error: new Error('Test'),
        context: {
          tags: { test: 'true' },
          metadata: { extra: 'data' }
        }
      });

      // Sentry should have been called with error and context
      expect(captureExceptionSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.any(Object),
          contexts: expect.any(Object),
          extra: expect.any(Object)
        })
      );
    });

    it('handles Datadog RUM when available', () => {
      const addErrorSpy = vi.fn();
      (global as any).window.DD_RUM = {
        addError: addErrorSpy
      };

      errorLogger.logError({
        message: 'Test error for Datadog',
        error: new Error('Test')
      });

      // Datadog should have been called
      expect(addErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Error Tracking with no external services', () => {
    it('logs debug message when no tracking service is available', () => {
      // Remove all external services
      delete (global as any).window.DD_RUM;
      delete (global as any).window.Sentry;

      errorLogger.logError({
        message: 'Test error',
        error: new Error('Test')
      });

      // Should still log the error to console
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Global Error Event Handlers', () => {
    it('triggers error handler when error event is dispatched', () => {
      let errorHandler: Function | null = null;
      (global as any).window.addEventListener = vi.fn((event, handler) => {
        if (event === 'error') {
          errorHandler = handler;
        }
      });

      errorLogger.setupGlobalErrorHandling();

      // Simulate an error event
      if (errorHandler) {
        const errorEvent = {
          error: new Error('Uncaught error')
        } as ErrorEvent;
        errorHandler(errorEvent);

        // Should log the error
        expect(consoleErrorSpy).toHaveBeenCalled();
      }
    });

    it('triggers unhandled rejection handler when promise is rejected', () => {
      let rejectionHandler: Function | null = null;
      (global as any).window.addEventListener = vi.fn((event, handler) => {
        if (event === 'unhandledrejection') {
          rejectionHandler = handler;
        }
      });

      errorLogger.setupGlobalErrorHandling();

      // Simulate an unhandled rejection event
      if (rejectionHandler) {
        const rejectionEvent = {
          reason: new Error('Unhandled rejection')
        } as PromiseRejectionEvent;
        rejectionHandler(rejectionEvent);

        // Should log the error
        expect(consoleErrorSpy).toHaveBeenCalled();
      }
    });

    it('triggers service worker error handler', () => {
      let swErrorHandler: Function | null = null;
      (global as any).navigator.serviceWorker = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'error') {
            swErrorHandler = handler;
          }
        })
      };

      errorLogger.setupGlobalErrorHandling();

      // Simulate a service worker error event
      if (swErrorHandler) {
        const errorEvent = {
          error: new Error('Service worker error')
        } as ErrorEvent;
        swErrorHandler(errorEvent);

        // Should log the error
        expect(consoleErrorSpy).toHaveBeenCalled();
      }
    });
  });
});
