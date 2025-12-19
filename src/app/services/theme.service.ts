import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject: BehaviorSubject<Theme>;
  public theme$: Observable<Theme>;

  constructor() {
    // Initialize from localStorage immediately, or default to 'system'
    const savedTheme = this.getSavedTheme();
    this.themeSubject = new BehaviorSubject<Theme>(savedTheme);
    this.theme$ = this.themeSubject.asObservable();

    // Apply theme immediately on initialization
    this.applyTheme(savedTheme);

    // Listen for system theme changes
    this.listenToSystemThemeChanges();

    // Listen for visibility changes to reapply theme
    this.listenToVisibilityChanges();
  }

  private getSavedTheme(): Theme {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
      return savedTheme;
    }
    return 'system';
  }

  private applyTheme(theme: Theme): void {
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
    
    // Save preference to localStorage
    localStorage.setItem('theme', theme);
  }

  private listenToSystemThemeChanges(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    fromEvent<MediaQueryListEvent>(mediaQuery, 'change').subscribe(() => {
      // Only update if user is using system theme
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'system' || !savedTheme) {
        // Reapply system theme
        this.applyTheme('system');
      }
    });
  }

  private listenToVisibilityChanges(): void {
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!document.hidden) {
        const currentTheme = this.themeSubject.value;
        this.applyTheme(currentTheme);
      }
    });
  }

  /**
   * Set the theme
   */
  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    this.applyTheme(theme);
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
