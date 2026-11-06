import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_COLOR_CHRISTMAS_LIGHT,
  THEME_STORAGE_FAMILY_KEY,
  THEME_STORAGE_MODE_KEY,
  ThemeService,
} from './theme.service';

const OVERLAY_CLASSES = [
  'dark',
  'black',
  'blossom',
  'blossom-dark',
  'christmas-light',
  'christmas-dark',
  'day',
];

function clearHtmlThemeClasses(): void {
  for (const cls of OVERLAY_CLASSES) {
    document.documentElement.classList.remove(cls);
  }
}

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    clearHtmlThemeClasses();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
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
    clearHtmlThemeClasses();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('selection$ / theme$', () => {
    it('defaults to default family + system mode', async () => {
      const sel = await firstValueFrom(service.selection$);
      expect(sel).toEqual({ family: 'default', mode: 'system' });
    });

    it('emits selection objects when setSelection is called', async () => {
      const received: { family: string; mode: string }[] = [];
      service.selection$.subscribe((s) => received.push(s));
      service.setSelection({ family: 'blossom', mode: 'light' });
      await new Promise((r) => setTimeout(r, 5));
      expect(received.some((s) => s.family === 'blossom' && s.mode === 'light')).toBe(true);
    });
  });

  describe('setTheme (legacy API)', () => {
    it('maps light to default + light', () => {
      service.setTheme('light');
      expect(service.getSelection()).toEqual({ family: 'default', mode: 'light' });
      expect(localStorage.getItem(THEME_STORAGE_FAMILY_KEY)).toBe('default');
      expect(localStorage.getItem(THEME_STORAGE_MODE_KEY)).toBe('light');
      expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
    });

    it('maps black to high-contrast + dark', () => {
      service.setTheme('black');
      expect(service.getSelection()).toEqual({ family: 'high-contrast', mode: 'dark' });
      expect(service.getResolvedTheme()).toBe('black');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('black')).toBe(true);
    });

    it('maps blossom to blossom + light', () => {
      service.setTheme('blossom');
      expect(service.getResolvedTheme()).toBe('blossom');
      expect(document.documentElement.classList.contains('blossom')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('maps christmas-dark to christmas + dark mode', () => {
      service.setTheme('christmas-dark');
      expect(service.getSelection()).toEqual({ family: 'christmas', mode: 'dark' });
      expect(document.documentElement.classList.contains('christmas-dark')).toBe(true);
    });
  });

  describe('High Contrast Day', () => {
    it('applies html.day without dark class', () => {
      service.setSelection({ family: 'high-contrast', mode: 'light' });
      expect(service.getResolvedTheme()).toBe('day');
      expect(document.documentElement.classList.contains('day')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('sets theme-color meta for Day', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
      service.setSelection({ family: 'high-contrast', mode: 'light' });
      expect(meta.getAttribute('content')).toBe('#94A3B8');
      meta.remove();
    });
  });

  describe('Blossom Dark', () => {
    it('applies dark and blossom-dark on html', () => {
      service.setSelection({ family: 'blossom', mode: 'dark' });
      expect(service.getResolvedTheme()).toBe('blossom-dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('blossom-dark')).toBe(true);
    });
  });

  describe('system within family', () => {
    it('christmas + system follows OS for christmas-light or christmas-dark', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
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
      service = new ThemeService();
      service.setSelection({ family: 'christmas', mode: 'system' });
      expect(service.getResolvedTheme()).toBe('christmas-dark');
      expect(document.documentElement.classList.contains('christmas-dark')).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    it('flips light and dark within default family', () => {
      service.setSelection({ family: 'default', mode: 'light' });
      service.toggleTheme();
      expect(service.getSelection()).toEqual({ family: 'default', mode: 'dark' });
      service.toggleTheme();
      expect(service.getSelection()).toEqual({ family: 'default', mode: 'light' });
    });

    it('flips within blossom family from resolved light to dark', () => {
      service.setSelection({ family: 'blossom', mode: 'light' });
      service.toggleTheme();
      expect(service.getSelection().mode).toBe('dark');
      expect(service.getResolvedTheme()).toBe('blossom-dark');
    });

    it('does not jump to default when toggling from high-contrast dark', () => {
      service.setSelection({ family: 'high-contrast', mode: 'dark' });
      service.toggleTheme();
      expect(service.getSelection()).toEqual({ family: 'high-contrast', mode: 'light' });
      expect(service.getResolvedTheme()).toBe('day');
    });
  });

  describe('setSystemTheme', () => {
    it('sets mode to system and keeps family', () => {
      service.setSelection({ family: 'christmas', mode: 'light' });
      service.setSystemTheme();
      expect(service.getSelection()).toEqual({ family: 'christmas', mode: 'system' });
    });
  });

  describe('migration from legacy localStorage', () => {
    it('reads legacy theme key and maps to family+mode', () => {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'black');
      const next = new ThemeService();
      expect(next.getSelection()).toEqual({ family: 'high-contrast', mode: 'dark' });
    });

    it('system in legacy maps to default + system', () => {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'system');
      const next = new ThemeService();
      expect(next.getSelection()).toEqual({ family: 'default', mode: 'system' });
    });
  });

  describe('persist option', () => {
    it('can apply system without writing new keys', () => {
      localStorage.setItem(THEME_STORAGE_FAMILY_KEY, 'default');
      localStorage.setItem(THEME_STORAGE_MODE_KEY, 'dark');
      service.setSelection({ family: 'default', mode: 'system' }, { persist: false });
      expect(service.getSelection().mode).toBe('system');
      expect(localStorage.getItem(THEME_STORAGE_MODE_KEY)).toBe('dark');
    });
  });

  describe('Christmas Light CSS regression', () => {
    it('deepens Christmas Light past the original cream without dropping crimson or forest', () => {
      expect(THEME_COLOR_CHRISTMAS_LIGHT).toBe('#F0E2C4');
      const css = readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), '../../styles.css'),
        'utf8'
      );
      const block = css.match(/html\.christmas-light \{[\s\S]*?\n\}/)?.[0] ?? '';
      expect(block).toContain('--surface-page: #f0e2c4');
      expect(block).toContain('--surface-card: #fff6e4');
    });
  });

  describe('visibility listener', () => {
    it('reapplies resolved theme when visible', async () => {
      service.setSelection({ family: 'default', mode: 'dark' });
      Object.defineProperty(document, 'hidden', { writable: true, configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((r) => setTimeout(r, 15));
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
