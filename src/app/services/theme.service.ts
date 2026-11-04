import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
export type Theme = 'light' | 'dark' | 'black' | 'system';

/** Browser chrome color. Keep in sync with the boot script in src/index.html. */
const THEME_COLOR_LIGHT = '#E8E5E1';
const THEME_COLOR_DARK = '#1F2937';
const THEME_COLOR_BLACK = '#000000';

const THEMES: readonly Theme[] = ['light', 'dark', 'black', 'system'];

function isStoredTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}

export type SetThemeOptions = {
  /** When false, updates DOM/state only (e.g. logged-out login screen). Default true. */
  persist?: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject: BehaviorSubject<Theme>;
  public theme$: Observable<Theme>;

  constructor() {
    const storedTheme = this.readThemeFromLocalStorage();
    const initialTheme = storedTheme ?? 'system';
    this.themeSubject = new BehaviorSubject<Theme>(initialTheme);
    this.theme$ = this.themeSubject.asObservable();

    // Do not write defaults when keys were cleared (e.g. after logout).
    this.applyTheme(initialTheme, storedTheme !== null);

    // Listen for system theme changes
    this.listenToSystemThemeChanges();

    // Listen for visibility changes to reapply theme
    this.listenToVisibilityChanges();
  }

  private readThemeFromLocalStorage(): Theme | null {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && isStoredTheme(savedTheme)) {
      return savedTheme;
    }
    return null;
  }

  private prefersDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(theme: Theme, persistToLocalStorage = true): void {
    const root = document.documentElement;
    const effectiveDark =
      theme === 'dark' || theme === 'black' || (theme === 'system' && this.prefersDark());

    root.classList.toggle('dark', effectiveDark);
    root.classList.toggle('black', theme === 'black');
    this.syncThemeColor(theme, effectiveDark);

    if (persistToLocalStorage) {
      localStorage.setItem('theme', theme);
    }
  }

  private syncThemeColor(theme: Theme, effectiveDark: boolean): void {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!(meta instanceof HTMLMetaElement)) {
      return;
    }
    let content = THEME_COLOR_LIGHT;
    if (theme === 'black') {
      content = THEME_COLOR_BLACK;
    } else if (effectiveDark) {
      content = THEME_COLOR_DARK;
    }
    meta.setAttribute('content', content);
  }

  private listenToSystemThemeChanges(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    fromEvent<MediaQueryListEvent>(mediaQuery, 'change').subscribe(() => {
      if (this.themeSubject.value === 'system') {
        this.applyTheme('system', false);
      }
    });
  }

  private listenToVisibilityChanges(): void {
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!document.hidden) {
        const currentTheme = this.themeSubject.value;
        this.applyTheme(currentTheme, false);
      }
    });
  }

  /**
   * Set the theme
   */
  setTheme(theme: Theme, options?: SetThemeOptions): void {
    const persist = options?.persist !== false;
    this.applyTheme(theme, persist);
    this.themeSubject.next(theme);
  }

  /**
   * Get current theme value
   */
  getTheme(): Theme {
    return this.themeSubject.value;
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme(): void {
    const currentTheme = this.themeSubject.value;
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Set to system theme
   */
  setSystemTheme(): void {
    this.setTheme('system');
  }

  /**
   * Check if currently in dark mode
   */
  isDark(): boolean {
    const theme = this.themeSubject.value;
    if (theme === 'black') {
      return true;
    }
    if (theme === 'system') {
      return this.prefersDark();
    }
    return theme === 'dark';
  }
}
