import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
export type Theme = 'light' | 'dark' | 'system';

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
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
      return savedTheme;
    }
    return null;
  }

  private applyTheme(theme: Theme, persistToLocalStorage = true): void {
    const root = document.documentElement;
    
    // Determine the actual theme to apply
    let effectiveTheme: 'light' | 'dark';
    
    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
      effectiveTheme = theme as 'light' | 'dark';
    }
    
    // Apply the theme class
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    if (persistToLocalStorage) {
      localStorage.setItem('theme', theme);
    }
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
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  }
}
