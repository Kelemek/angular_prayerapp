import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';

/** What the app paints on `document.documentElement` (not a persisted mode). */
export type ResolvedTheme =
  | 'light'
  | 'dark'
  | 'day'
  | 'black'
  | 'blossom'
  | 'blossom-dark'
  | 'christmas-light'
  | 'christmas-dark';

/** Persisted theme family (left dropdown). */
export type ThemeFamily = 'default' | 'high-contrast' | 'blossom' | 'christmas';

/** Persisted appearance mode (right dropdown). */
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeSelection {
  family: ThemeFamily;
  mode: ThemeMode;
}

/** @deprecated Legacy single-key theme; used only for one-time migration. */
export type LegacyStoredTheme =
  | 'light'
  | 'dark'
  | 'black'
  | 'blossom'
  | 'christmas-light'
  | 'christmas-dark'
  | 'system';

export const THEME_STORAGE_FAMILY_KEY = 'themeFamily';
export const THEME_STORAGE_MODE_KEY = 'themeMode';
export const LEGACY_THEME_STORAGE_KEY = 'theme';

/** Browser chrome color. Keep in sync with the boot script in src/index.html. */
export const THEME_COLOR_LIGHT = '#E8E5E1';
export const THEME_COLOR_DARK = '#1F2937';
export const THEME_COLOR_BLACK = '#000000';
export const THEME_COLOR_BLOSSOM = '#FCE8EE';
export const THEME_COLOR_BLOSSOM_DARK = '#2D1A28';
export const THEME_COLOR_CHRISTMAS_LIGHT = '#F0E2C4';
export const THEME_COLOR_CHRISTMAS_DARK = '#0A1F18';
/** High-contrast light “Day” — bright paper, distinct from Default warm gray. */
export const THEME_COLOR_DAY = '#F5F7FA';

const THEME_FAMILIES: readonly ThemeFamily[] = [
  'default',
  'high-contrast',
  'blossom',
  'christmas',
];

const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

export const THEME_HTML_OVERLAY_CLASSES = [
  'black',
  'blossom',
  'blossom-dark',
  'christmas-light',
  'christmas-dark',
  'day',
] as const;

export function isThemeFamily(value: unknown): value is ThemeFamily {
  return typeof value === 'string' && (THEME_FAMILIES as readonly string[]).includes(value);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

export function isLegacyStoredTheme(value: unknown): value is LegacyStoredTheme {
  return (
    typeof value === 'string' &&
    (
      [
        'light',
        'dark',
        'black',
        'blossom',
        'christmas-light',
        'christmas-dark',
        'system',
      ] as readonly string[]
    ).includes(value)
  );
}

function lightVariantForFamily(family: ThemeFamily): ResolvedTheme {
  switch (family) {
    case 'default':
      return 'light';
    case 'high-contrast':
      return 'day';
    case 'blossom':
      return 'blossom';
    case 'christmas':
      return 'christmas-light';
    default: {
      const _exhaustive: never = family;
      return _exhaustive;
    }
  }
}

function darkVariantForFamily(family: ThemeFamily): ResolvedTheme {
  switch (family) {
    case 'default':
      return 'dark';
    case 'high-contrast':
      return 'black';
    case 'blossom':
      return 'blossom-dark';
    case 'christmas':
      return 'christmas-dark';
    default: {
      const _exhaustive: never = family;
      return _exhaustive;
    }
  }
}

export function resolveThemeFromSelection(
  family: ThemeFamily,
  mode: ThemeMode,
  prefersDark: boolean
): ResolvedTheme {
  if (mode === 'system') {
    return prefersDark ? darkVariantForFamily(family) : lightVariantForFamily(family);
  }
  return mode === 'light' ? lightVariantForFamily(family) : darkVariantForFamily(family);
}

export function isEffectiveDarkResolved(resolved: ResolvedTheme): boolean {
  return (
    resolved === 'dark' ||
    resolved === 'black' ||
    resolved === 'blossom-dark' ||
    resolved === 'christmas-dark'
  );
}

/** Updates meta[name=theme-color] from a resolved paint theme. */
export function syncThemeColorMeta(resolved: ResolvedTheme): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!(meta instanceof HTMLMetaElement)) {
    return;
  }
  let content = THEME_COLOR_LIGHT;
  switch (resolved) {
    case 'day':
      content = THEME_COLOR_DAY;
      break;
    case 'black':
      content = THEME_COLOR_BLACK;
      break;
    case 'blossom':
      content = THEME_COLOR_BLOSSOM;
      break;
    case 'blossom-dark':
      content = THEME_COLOR_BLOSSOM_DARK;
      break;
    case 'christmas-light':
      content = THEME_COLOR_CHRISTMAS_LIGHT;
      break;
    case 'christmas-dark':
      content = THEME_COLOR_CHRISTMAS_DARK;
      break;
    case 'dark':
      content = THEME_COLOR_DARK;
      break;
    case 'light':
      content = THEME_COLOR_LIGHT;
      break;
    default: {
      const _e: never = resolved;
      void _e;
    }
  }
  meta.setAttribute('content', content);
}

/**
 * Paint `resolved` onto `document.documentElement` (classes + theme-color meta).
 * Does not touch localStorage.
 */
export function applyResolvedThemeToDocument(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  const effectiveDark = isEffectiveDarkResolved(resolved);

  root.classList.toggle('dark', effectiveDark);

  for (const cls of THEME_HTML_OVERLAY_CLASSES) {
    root.classList.toggle(cls, false);
  }
  switch (resolved) {
    case 'light':
    case 'dark':
      break;
    case 'day':
      root.classList.add('day');
      break;
    case 'black':
      root.classList.add('black');
      break;
    case 'blossom':
      root.classList.add('blossom');
      break;
    case 'blossom-dark':
      root.classList.add('blossom-dark');
      break;
    case 'christmas-light':
      root.classList.add('christmas-light');
      break;
    case 'christmas-dark':
      root.classList.add('christmas-dark');
      break;
    default: {
      const _e: never = resolved;
      void _e;
    }
  }

  syncThemeColorMeta(resolved);
}

export function migrateLegacyTheme(legacy: LegacyStoredTheme): ThemeSelection {
  switch (legacy) {
    case 'light':
      return { family: 'default', mode: 'light' };
    case 'dark':
      return { family: 'default', mode: 'dark' };
    case 'black':
      return { family: 'high-contrast', mode: 'dark' };
    case 'blossom':
      return { family: 'blossom', mode: 'light' };
    case 'christmas-light':
      return { family: 'christmas', mode: 'light' };
    case 'christmas-dark':
      return { family: 'christmas', mode: 'dark' };
    case 'system':
      return { family: 'default', mode: 'system' };
    default: {
      const _n: never = legacy;
      return _n;
    }
  }
}

export type SetThemeOptions = {
  /** When false, updates DOM/state only (e.g. logged-out login screen). Default true. */
  persist?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly selectionSubject: BehaviorSubject<ThemeSelection>;
  readonly selection$: Observable<ThemeSelection>;

  /** @deprecated Subscribe to selection$ instead. */
  readonly theme$: Observable<ThemeSelection>;

  constructor() {
    const initial = this.readInitialSelection();
    this.selectionSubject = new BehaviorSubject<ThemeSelection>(initial);
    this.selection$ = this.selectionSubject.asObservable();
    this.theme$ = this.selection$;

    this.applyResolved(this.getResolvedTheme(), this.shouldPersistOnInit(initial));

    this.listenToSystemThemeChanges();
    this.listenToVisibilityChanges();
  }

  private shouldPersistOnInit(initial: ThemeSelection): boolean {
    try {
      if (localStorage.getItem(THEME_STORAGE_FAMILY_KEY) && localStorage.getItem(THEME_STORAGE_MODE_KEY)) {
        return true;
      }
      if (localStorage.getItem(LEGACY_THEME_STORAGE_KEY)) {
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  private readInitialSelection(): ThemeSelection {
    let fromNewKeys: ThemeSelection | null = null;
    try {
      const f = localStorage.getItem(THEME_STORAGE_FAMILY_KEY);
      const m = localStorage.getItem(THEME_STORAGE_MODE_KEY);
      if (isThemeFamily(f) && isThemeMode(m)) {
        fromNewKeys = { family: f, mode: m };
      }
    } catch {
      /* ignore */
    }

    if (fromNewKeys) {
      return fromNewKeys;
    }

    try {
      const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
      if (legacy && isLegacyStoredTheme(legacy)) {
        return migrateLegacyTheme(legacy);
      }
    } catch {
      /* ignore */
    }

    return { family: 'default', mode: 'system' };
  }

  private prefersDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  getResolvedTheme(): ResolvedTheme {
    const { family, mode } = this.selectionSubject.value;
    return resolveThemeFromSelection(family, mode, this.prefersDark());
  }

  isEffectiveDark(resolved: ResolvedTheme): boolean {
    return isEffectiveDarkResolved(resolved);
  }

  private applyResolved(resolved: ResolvedTheme, persistToStorage: boolean): void {
    applyResolvedThemeToDocument(resolved);

    if (persistToStorage) {
      try {
        const sel = this.selectionSubject.value;
        localStorage.setItem(THEME_STORAGE_FAMILY_KEY, sel.family);
        localStorage.setItem(THEME_STORAGE_MODE_KEY, sel.mode);
        localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      } catch {
        /* ignore quota */
      }
    }
  }

  private listenToSystemThemeChanges(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    fromEvent<MediaQueryListEvent>(mediaQuery, 'change').subscribe(() => {
      if (this.selectionSubject.value.mode === 'system') {
        this.applyResolved(this.getResolvedTheme(), false);
      }
    });
  }

  private listenToVisibilityChanges(): void {
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!document.hidden) {
        this.applyResolved(this.getResolvedTheme(), false);
      }
    });
  }

  getSelection(): ThemeSelection {
    return this.selectionSubject.value;
  }

  /** @deprecated Use getSelection(). */
  getTheme(): ThemeSelection {
    return this.getSelection();
  }

  setSelection(selection: ThemeSelection, options?: SetThemeOptions): void {
    const persist = options?.persist !== false;
    this.selectionSubject.next(selection);
    this.applyResolved(this.getResolvedTheme(), persist);
  }

  setThemeFamily(family: ThemeFamily, options?: SetThemeOptions): void {
    this.setSelection({ ...this.selectionSubject.value, family }, options);
  }

  setThemeMode(mode: ThemeMode, options?: SetThemeOptions): void {
    this.setSelection({ ...this.selectionSubject.value, mode }, options);
  }

  /**
   * @deprecated Legacy API — maps to selection via migration rules.
   * Prefer setSelection / setThemeFamily / setThemeMode.
   */
  setTheme(legacy: LegacyStoredTheme, options?: SetThemeOptions): void {
    this.setSelection(migrateLegacyTheme(legacy), options);
  }

  toggleTheme(): void {
    const { family, mode } = this.selectionSubject.value;
    const resolved =
      mode === 'system'
        ? resolveThemeFromSelection(family, 'system', this.prefersDark())
        : resolveThemeFromSelection(family, mode, this.prefersDark());

    const lightV = lightVariantForFamily(family);
    const newMode: ThemeMode = resolved === lightV ? 'dark' : 'light';
    this.setSelection({ family, mode: newMode });
  }

  setSystemTheme(): void {
    this.setThemeMode('system');
  }

  isDark(): boolean {
    return this.isEffectiveDark(this.getResolvedTheme());
  }

  /** Short label for UI chrome (e.g. toggle button title). */
  getAppearanceTitleSummary(): string {
    const sel = this.getSelection();
    const resolved = this.getResolvedTheme();
    let familyLabel: string;
    if (sel.family === 'high-contrast') {
      familyLabel = resolved === 'day' ? 'Day' : 'Night';
    } else {
      switch (sel.family) {
        case 'default':
          familyLabel = 'Default';
          break;
        case 'blossom':
          familyLabel = 'Blossom';
          break;
        case 'christmas':
          familyLabel = 'Christmas';
          break;
        default: {
          const _e: never = sel.family;
          familyLabel = String(_e);
        }
      }
    }
    const modeLabel =
      sel.mode === 'system' ? 'System' : sel.mode === 'light' ? 'Light' : 'Dark';
    return `${familyLabel} · ${modeLabel}`;
  }
}
