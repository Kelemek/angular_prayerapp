import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateSmartDurationPrayer,
  calculateSmartDurationPrompt,
  formatTime,
  applyTheme,
  handleThemeChange,
} from './presentationUtils';

describe('presentationUtils', () => {
  describe('calculateSmartDurationPrayer', () => {
    it('should return displayDuration when smartMode is false', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: 'Please pray for healing',
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrayer(prayer, false, 30);
      
      expect(result).toBe(30);
    });

    it('should calculate duration based on description length when smartMode is true', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: 'A'.repeat(120), // 120 characters = 10 seconds
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      expect(result).toBe(10);
    });

    it('should include prayer updates in duration calculation', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: 'A'.repeat(60), // 60 characters
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            content: 'B'.repeat(60), // 60 characters
            author: 'Jane',
            created_at: '2024-01-02T00:00:00Z',
          },
        ],
      };
      
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      // Total: 120 chars = 10 seconds
      expect(result).toBe(10);
    });

    it('should only include 3 most recent updates', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: 'A'.repeat(60), // 60 characters
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            content: 'B'.repeat(60),
            author: 'Jane',
            created_at: '2024-01-02T00:00:00Z',
          },
          {
            id: 'u2',
            content: 'C'.repeat(60),
            author: 'Jane',
            created_at: '2024-01-03T00:00:00Z',
          },
          {
            id: 'u3',
            content: 'D'.repeat(60),
            author: 'Jane',
            created_at: '2024-01-04T00:00:00Z',
          },
          {
            id: 'u4',
            content: 'E'.repeat(600), // This should be ignored (oldest)
            author: 'Jane',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      };
      
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      // Total: 60 + 60 + 60 + 60 = 240 chars = 20 seconds
      expect(result).toBe(20);
    });

    it('should return minimum duration of 10 seconds', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: 'Short', // Very short description
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      expect(result).toBe(10);
    });

    it('should return maximum duration of 120 seconds', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: 'A'.repeat(2000), // Very long description
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      expect(result).toBe(120);
    });

    it('should handle empty description', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: '',
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      expect(result).toBe(10);
    });

    it('should handle missing description', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: undefined,
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
      } as any;
      
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      expect(result).toBe(10);
    });

    it('should handle prayer with no updates', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: 'A'.repeat(120),
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
        prayer_updates: [],
      };
      
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      expect(result).toBe(10);
    });

    it('should handle update with missing content', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John',
        description: 'A'.repeat(120),
        requester: 'Jane',
        status: 'current',
        created_at: '2024-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            content: undefined,
            author: 'Jane',
            created_at: '2024-01-02T00:00:00Z',
          },
        ],
      } as any;
      
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      expect(result).toBe(10);
    });
  });

  describe('calculateSmartDurationPrompt', () => {
    it('should return displayDuration when smartMode is false', () => {
      const prompt = {
        id: '1',
        title: 'Test Prompt',
        type: 'praise',
        description: 'Praise God for His goodness',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrompt(prompt, false, 25);
      
      expect(result).toBe(25);
    });

    it('should calculate duration based on description length when smartMode is true', () => {
      const prompt = {
        id: '1',
        title: 'Test Prompt',
        type: 'praise',
        description: 'A'.repeat(120), // 120 characters = 10 seconds
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrompt(prompt, true, 25);
      
      expect(result).toBe(10);
    });

    it('should return minimum duration of 10 seconds', () => {
      const prompt = {
        id: '1',
        title: 'Test Prompt',
        type: 'praise',
        description: 'Short',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrompt(prompt, true, 25);
      
      expect(result).toBe(10);
    });

    it('should return maximum duration of 120 seconds', () => {
      const prompt = {
        id: '1',
        title: 'Test Prompt',
        type: 'praise',
        description: 'A'.repeat(2000), // Very long description
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrompt(prompt, true, 25);
      
      expect(result).toBe(120);
    });

    it('should handle empty description', () => {
      const prompt = {
        id: '1',
        title: 'Test Prompt',
        type: 'praise',
        description: '',
        created_at: '2024-01-01T00:00:00Z',
      };
      
      const result = calculateSmartDurationPrompt(prompt, true, 25);
      
      expect(result).toBe(10);
    });

    it('should handle missing description', () => {
      const prompt = {
        id: '1',
        title: 'Test Prompt',
        type: 'praise',
        description: undefined,
        created_at: '2024-01-01T00:00:00Z',
      } as any;
      
      const result = calculateSmartDurationPrompt(prompt, true, 25);
      
      expect(result).toBe(10);
    });
  });

  describe('formatTime', () => {
    it('should format 0 seconds correctly', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should format seconds less than 60 correctly', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(59)).toBe('0:59');
    });

    it('should format exactly 60 seconds correctly', () => {
      expect(formatTime(60)).toBe('1:00');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(605)).toBe('10:05');
    });

    it('should pad single digit seconds with zero', () => {
      expect(formatTime(61)).toBe('1:01');
      expect(formatTime(120)).toBe('2:00');
    });

    it('should handle large values', () => {
      expect(formatTime(3600)).toBe('60:00');
      expect(formatTime(3665)).toBe('61:05');
    });
  });

  describe('applyTheme', () => {
    let mockRoot: HTMLElement;
    let mockLocalStorage: { [key: string]: string };
    let mockMatchMedia: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Mock document.documentElement
      mockRoot = {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      } as any;
      
      Object.defineProperty(global, 'document', {
        value: {
          documentElement: mockRoot,
        },
        writable: true,
        configurable: true,
      });

      // Mock localStorage
      mockLocalStorage = {};
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
          setItem: vi.fn((key: string, value: string) => {
            mockLocalStorage[key] = value;
          }),
          removeItem: vi.fn((key: string) => {
            delete mockLocalStorage[key];
          }),
          clear: vi.fn(() => {
            mockLocalStorage = {};
          }),
        },
        writable: true,
        configurable: true,
      });

      // Mock window.matchMedia
      mockMatchMedia = vi.fn();
      Object.defineProperty(global, 'window', {
        value: {
          matchMedia: mockMatchMedia,
        },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should apply light theme and save to localStorage', () => {
      applyTheme('light');

      expect(mockRoot.classList.remove).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    it('should apply dark theme and save to localStorage', () => {
      applyTheme('dark');

      expect(mockRoot.classList.add).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should apply system theme as dark when system prefers dark', () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      applyTheme('system');

      expect(mockRoot.classList.add).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'system');
    });

    it('should apply system theme as light when system prefers light', () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      applyTheme('system');

      expect(mockRoot.classList.remove).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'system');
    });
  });

  describe('handleThemeChange', () => {
    let mockDocumentElement: HTMLElement;
    let mockLocalStorage: { [key: string]: string };
    let mockMatchMedia: ReturnType<typeof vi.fn>;
    let mockSetTheme: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Mock document.documentElement
      mockDocumentElement = {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
      } as any;
      
      Object.defineProperty(global, 'document', {
        value: {
          documentElement: mockDocumentElement,
        },
        writable: true,
        configurable: true,
      });

      // Mock localStorage
      mockLocalStorage = {};
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
          setItem: vi.fn((key: string, value: string) => {
            mockLocalStorage[key] = value;
          }),
          removeItem: vi.fn((key: string) => {
            delete mockLocalStorage[key];
          }),
          clear: vi.fn(() => {
            mockLocalStorage = {};
          }),
        },
        writable: true,
        configurable: true,
      });

      // Mock window.matchMedia
      mockMatchMedia = vi.fn();
      Object.defineProperty(global, 'window', {
        value: {
          matchMedia: mockMatchMedia,
        },
        writable: true,
        configurable: true,
      });

      // Mock setTheme function
      mockSetTheme = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should call setTheme and apply light theme', () => {
      handleThemeChange('light', mockSetTheme);

      expect(mockSetTheme).toHaveBeenCalledWith('light');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    it('should call setTheme and apply dark theme', () => {
      handleThemeChange('dark', mockSetTheme);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should handle system theme with dark preference', () => {
      mockMatchMedia.mockReturnValue({ matches: true });

      handleThemeChange('system', mockSetTheme);

      expect(mockSetTheme).toHaveBeenCalledWith('system');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'system');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should handle system theme with light preference', () => {
      mockMatchMedia.mockReturnValue({ matches: false });

      handleThemeChange('system', mockSetTheme);

      expect(mockSetTheme).toHaveBeenCalledWith('system');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'system');
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
  });
});
