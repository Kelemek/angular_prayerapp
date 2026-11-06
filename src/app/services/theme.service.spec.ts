import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { THEME_COLOR_CHRISTMAS_LIGHT, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(
      'dark',
      'black',
      'blossom',
      'christmas-light',
      'christmas-dark',
    );
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    service = new ThemeService();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(
      'dark',
      'black',
      'blossom',
      'christmas-light',
      'christmas-dark',
    );
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('theme$ observable', () => {
    it('should emit theme values', async () => {
      const theme = await firstValueFrom(service.theme$);
      expect(['light', 'dark', 'system']).toContain(theme);
    });

    it('should default to system theme', async () => {
      const theme = await firstValueFrom(service.theme$);
      expect(theme).toBe('system');
    });

    it('should emit different themes when setTheme is called', async () => {
      const themes: string[] = [];
      service.theme$.subscribe(theme => themes.push(theme));

      service.setTheme('light');
      await new Promise(resolve => setTimeout(resolve, 10));

      service.setTheme('dark');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(themes).toContain('system');
      expect(themes).toContain('light');
      expect(themes).toContain('dark');
    });
  });

  describe('setTheme', () => {
    it('should update theme to light', async () => {
      service.setTheme('light');
      const theme = await firstValueFrom(service.theme$);
      expect(theme).toBe('light');
    });

    it('should update theme to dark', async () => {
      service.setTheme('dark');
      const theme = await firstValueFrom(service.theme$);
      expect(theme).toBe('dark');
    });

    it('should update theme to system', async () => {
      service.setTheme('light');
      service.setTheme('system');
      const theme = await firstValueFrom(service.theme$);
      expect(theme).toBe('system');
    });

    it('should persist theme to localStorage', () => {
      service.setTheme('dark');
      const savedTheme = localStorage.getItem('theme');
      expect(savedTheme).toBe('dark');
    });

    it('should apply dark class to HTML element when dark theme is set', () => {
      service.setTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from HTML element when light theme is set', () => {
      service.setTheme('dark');
      service.setTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply system theme based on matchMedia when system is set', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)' ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      service.setTheme('system');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('black mode', () => {
    it('adds the dark and black classes, persists black, and sets theme-color', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);

      service.setTheme('black');

      expect(service.getTheme()).toBe('black');
      expect(service.isDark()).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('black')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('black');
      expect(meta.getAttribute('content')).toBe('#000000');

      meta.remove();
    });

    it('removes the black class when switching to dark and keeps dark text styles', () => {
      service.setTheme('black');
      service.setTheme('dark');

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('black')).toBe(false);
    });

    it('keeps system on the existing light or dark palette', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);

      const setPrefersDark = (prefersDark: boolean) => {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: vi.fn().mockImplementation(query => ({
            matches: query === '(prefers-color-scheme: dark)' ? prefersDark : !prefersDark,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          })),
        });
      };

      service.setTheme('black');
      setPrefersDark(true);
      service.setTheme('system');

      expect(service.getTheme()).toBe('system');
      expect(localStorage.getItem('theme')).toBe('system');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('black')).toBe(false);
      expect(meta.getAttribute('content')).toBe('#1F2937');

      setPrefersDark(false);
      service.setTheme('system');

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.classList.contains('black')).toBe(false);
      expect(meta.getAttribute('content')).toBe('#E8E5E1');

      meta.remove();
    });

    it('restores black from localStorage on the next service', () => {
      localStorage.setItem('theme', 'black');
      const restored = new ThemeService();

      expect(restored.getTheme()).toBe('black');
      expect(document.documentElement.classList.contains('black')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('toggle from black returns to light', () => {
      service.setTheme('black');
      service.toggleTheme();

      expect(service.getTheme()).toBe('light');
      expect(document.documentElement.classList.contains('black')).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('seasonal and floral themes', () => {
    it('applies blossom without dark class', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);

      service.setTheme('blossom');

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.classList.contains('blossom')).toBe(true);
      expect(service.isDark()).toBe(false);
      expect(meta.getAttribute('content')).toBe('#FCE8EE');

      meta.remove();
    });

    it('applies christmas-dark with dark and overlay classes', () => {
      service.setTheme('christmas-dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('christmas-dark')).toBe(true);
      expect(service.isDark()).toBe(true);
    });

    it('deepens Christmas Light past the original cream without dropping crimson or forest', () => {
      expect(THEME_COLOR_CHRISTMAS_LIGHT).toBe('#F0E2C4');
      const css = readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), '../../styles.css'),
        'utf8'
      );
      const block = css.match(/html\.christmas-light \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(block).toContain('--surface-page: #f0e2c4');
      expect(block).toContain('--surface-card: #fff6e4');
      expect(block).toContain('--theme-border: #5d846c');
      expect(block).toContain('--theme-chrome-border: #1f4d36');
      expect(block).toContain('--theme-action-primary: #8e141e');
      expect(block).toContain('--accent-gold: #c4892a');
      expect(block).toContain('--theme-text-body: #14261c');
      expect(block).not.toContain('#f7f1e4');
      expect(block).not.toContain('#d4e4d6');
    });

    it('clears overlay classes when switching to light', () => {
      service.setTheme('christmas-light');
      service.setTheme('light');
      expect(document.documentElement.classList.contains('christmas-light')).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('getTheme', () => {
    it('should return current theme value', () => {
      expect(service.getTheme()).toBe('system');
      
      service.setTheme('light');
      expect(service.getTheme()).toBe('light');
      
      service.setTheme('dark');
      expect(service.getTheme()).toBe('dark');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      service.setTheme('light');
      service.toggleTheme();
      expect(service.getTheme()).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      service.setTheme('dark');
      service.toggleTheme();
      expect(service.getTheme()).toBe('light');
    });

    it('should toggle from system to different theme', () => {
      service.setTheme('system');
      const currentTheme = service.getTheme();
      service.toggleTheme();
      const newTheme = service.getTheme();
      
      // When toggling from system, it should switch between light and dark
      expect(['light', 'dark']).toContain(newTheme);
      expect(newTheme).not.toBe(currentTheme);
    });

    it('should persist toggle to localStorage', () => {
      service.setTheme('light');
      service.toggleTheme();
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should apply correct class after toggle', () => {
      service.setTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      
      service.toggleTheme();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('setTheme persist option', () => {
    it('can apply system theme without writing localStorage', () => {
      localStorage.setItem('theme', 'dark');
      service.setTheme('system', { persist: false });
      expect(service.getTheme()).toBe('system');
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('setSystemTheme', () => {
    it('should set theme to system', () => {
      service.setTheme('light');
      service.setSystemTheme();
      expect(service.getTheme()).toBe('system');
    });

    it('should apply system preference when set to system', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)' ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      service.setSystemTheme();
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('isDark', () => {
    it('should return true when dark theme is set', () => {
      service.setTheme('dark');
      expect(service.isDark()).toBe(true);
    });

    it('should return false when light theme is set', () => {
      service.setTheme('light');
      expect(service.isDark()).toBe(false);
    });

    it('should use system preference when system theme is set', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)' ? false : true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      service.setTheme('system');
      expect(service.isDark()).toBe(false);
    });

    it('should use system preference for dark mode when system theme is set', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)' ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      service.setTheme('system');
      expect(service.isDark()).toBe(true);
    });
  });

  describe('localStorage persistence', () => {
    it('should restore theme from localStorage on initialization', () => {
      localStorage.setItem('theme', 'dark');
      const newService = new ThemeService();
      expect(newService.getTheme()).toBe('dark');
    });

    it('does not write default system theme when localStorage has no key', () => {
      localStorage.clear();
      new ThemeService();
      expect(localStorage.getItem('theme')).toBeNull();
    });

    it('should use default theme if localStorage is invalid', () => {
      localStorage.setItem('theme', 'invalid' as any);
      const newService = new ThemeService();
      expect(newService.getTheme()).toBe('system');
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('theme', '');
      const newService = new ThemeService();
      expect(newService.getTheme()).toBe('system');
    });
  });

  describe('DOM manipulation', () => {
    it('should add dark class to document element for dark theme', () => {
      document.documentElement.classList.remove('dark');
      service.setTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from document element for light theme', () => {
      document.documentElement.classList.add('dark');
      service.setTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should not duplicate dark class on multiple sets', () => {
      service.setTheme('dark');
      service.setTheme('dark');
      const darkClassCount = (document.documentElement.className.match(/dark/g) || []).length;
      expect(darkClassCount).toBe(1);
    });
  });

  describe('system theme change listener', () => {
    it('should update theme when system preference changes and theme is set to system', () => {
      service.setTheme('system');
      
      // Create a mock MediaQueryList with event emitter capability
      let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)' ? false : true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event: string, handler: ((e: MediaQueryListEvent) => void) | null) => {
            if (event === 'change' && handler) {
              changeHandler = handler;
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      // Reinitialize service to set up event listeners
      service = new ThemeService();
      service.setTheme('system');

      // Simulate system theme change to dark
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)' ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      // Trigger the change event if handler was set
      if (changeHandler) {
        (changeHandler as (event: MediaQueryListEvent) => void)({ matches: true, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent);
      }

      // The theme should have been reapplied
      expect(localStorage.getItem('theme')).toBe('system');
    });

    it('should not update theme when system preference changes but theme is not system', () => {
      service.setTheme('light');
      localStorage.setItem('theme', 'light');

      // Create a mock MediaQueryList with event emitter capability
      let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)' ? false : true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event: string, handler: ((e: MediaQueryListEvent) => void) | null) => {
            if (event === 'change' && handler) {
              changeHandler = handler;
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      // Reinitialize service to set up event listeners
      service = new ThemeService();
      
      // Make sure theme is not system
      service.setTheme('light');

      // Trigger the change event if handler was set
      if (changeHandler) {
        (changeHandler as (event: MediaQueryListEvent) => void)({ matches: true, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent);
      }
    });
  });

  describe('visibility change listener', () => {
    it('should reapply theme when page becomes visible', async () => {
      service.setTheme('dark');
      
      // Mock document.hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false
      });

      // Dispatch visibility change event
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      // Give some time for the event to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      // Theme should be reapplied (dark class should still be present)
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('does not write localStorage when reapplying after persist false logout state', async () => {
      localStorage.setItem('theme', 'dark');
      service.setTheme('system', { persist: false });
      localStorage.removeItem('theme');

      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(localStorage.getItem('theme')).toBeNull();
    });

    it('should not reapply theme when page is hidden', async () => {
      service.setTheme('light');
      
      // Mock document.hidden as true
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true
      });

      // Remove dark class first
      document.documentElement.classList.remove('dark');

      // Dispatch visibility change event
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      // Give some time for the event to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      // Dark class should not be present since page is hidden and theme is light
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
