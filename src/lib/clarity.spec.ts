import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeClarity } from './clarity';
import clarity from '@microsoft/clarity';

// Mock the @microsoft/clarity module
vi.mock('@microsoft/clarity', () => ({
  default: {
    init: vi.fn(),
  },
}));

// Mock the environment
vi.mock('../environments/environment', () => ({
  environment: {
    production: false,
    clarityProjectId: 'test-project-id',
  },
}));

describe('clarity', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock console.error to prevent noise in test output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock window object to simulate browser environment
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('initializeClarity', () => {
    it('should initialize Clarity with valid project ID', () => {
      initializeClarity();

      expect(clarity.init).toHaveBeenCalledWith('test-project-id');
      expect(clarity.init).toHaveBeenCalledTimes(1);
    });

    it('should not initialize if window is undefined (server-side)', () => {
      // Remove window to simulate server-side environment
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      initializeClarity();

      expect(clarity.init).not.toHaveBeenCalled();

      // Restore window
      global.window = originalWindow;
    });

    it('should not initialize if clarityProjectId is empty string', async () => {
      // Mock environment with empty project ID
      vi.doMock('../environments/environment', () => ({
        environment: {
          production: false,
          clarityProjectId: '',
        },
      }));

      // Re-import to get mocked environment
      vi.resetModules();
      const { initializeClarity: init } = await import('./clarity');
      
      init();

      expect(clarity.init).not.toHaveBeenCalled();
    });

    it('should not initialize if clarityProjectId is undefined', async () => {
      // Mock environment with undefined project ID
      vi.doMock('../environments/environment', () => ({
        environment: {
          production: false,
          clarityProjectId: undefined,
        },
      }));

      vi.resetModules();
      const { initializeClarity: init } = await import('./clarity');
      
      init();

      expect(clarity.init).not.toHaveBeenCalled();
    });

    it('should not initialize if clarityProjectId is string "undefined"', async () => {
      // Mock environment with string "undefined" as project ID
      vi.doMock('../environments/environment', () => ({
        environment: {
          production: false,
          clarityProjectId: 'undefined',
        },
      }));

      vi.resetModules();
      const { initializeClarity: init } = await import('./clarity');
      
      init();

      expect(clarity.init).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', () => {
      // Mock clarity.init to throw an error
      const mockError = new Error('Failed to initialize Clarity');
      vi.mocked(clarity.init).mockImplementation(() => {
        throw mockError;
      });

      // Should not throw, but should log error
      expect(() => initializeClarity()).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '✗ Failed to initialize Clarity:',
        'Failed to initialize Clarity'
      );
    });

    it('should handle non-Error exceptions during initialization', () => {
      // Mock clarity.init to throw a non-Error object
      vi.mocked(clarity.init).mockImplementation(() => {
        throw 'String error';
      });

      expect(() => initializeClarity()).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '✗ Failed to initialize Clarity:',
        'String error'
      );
    });
  });
});
