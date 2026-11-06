/**
 * Utility functions for presentation mode
 */

import {
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_FAMILY_KEY,
  THEME_STORAGE_MODE_KEY,
  applyResolvedThemeToDocument,
  isLegacyStoredTheme,
  migrateLegacyTheme,
  resolveThemeFromSelection,
  type LegacyStoredTheme,
  type ThemeFamily,
  type ThemeMode,
} from '../app/services/theme.service';

interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  created_at: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
}

interface PrayerPrompt {
  id: string;
  title: string;
  type: string;
  description: string;
  created_at: string;
}

/**
 * Calculate smart display duration for prayers based on content length
 * @param prayer The prayer to calculate duration for
 * @param smartMode Whether smart mode is enabled
 * @param displayDuration The fallback duration if smart mode is disabled
 * @returns Duration in seconds
 */
export const calculateSmartDurationPrayer = (
  prayer: Prayer,
  smartMode: boolean,
  displayDuration: number
): number => {
  if (!smartMode) return displayDuration;
  
  // Count total characters - only description and updates
  let totalChars = 0;
  totalChars += prayer.description?.length || 0;
  
  // Add update text length (up to 3 most recent)
  if (prayer.prayer_updates && prayer.prayer_updates.length > 0) {
    const recentUpdates = prayer.prayer_updates
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
    
    recentUpdates.forEach(update => {
      totalChars += update.content?.length || 0;
    });
  }
  
  // Calculate duration: ~120 chars per 10 seconds
  // Minimum 10 seconds, maximum 120 seconds
  const calculatedDuration = Math.max(10, Math.min(120, Math.ceil(totalChars / 12)));
  
  return calculatedDuration;
};

/**
 * Calculate smart display duration for prompts based on content length
 * @param prompt The prompt to calculate duration for
 * @param smartMode Whether smart mode is enabled
 * @param displayDuration The fallback duration if smart mode is disabled
 * @returns Duration in seconds
 */
export const calculateSmartDurationPrompt = (
  prompt: PrayerPrompt,
  smartMode: boolean,
  displayDuration: number
): number => {
  if (!smartMode) return displayDuration;
  
  // Count total characters - only description
  let totalChars = 0;
  totalChars += prompt.description?.length || 0;
  
  // Calculate duration: ~120 chars per 10 seconds
  // Minimum 10 seconds, maximum 120 seconds
  const calculatedDuration = Math.max(10, Math.min(120, Math.ceil(totalChars / 12)));
  
  return calculatedDuration;
};

/**
 * Format time in seconds to MM:SS display format
 * @param seconds The time in seconds
 * @returns Formatted time string (e.g., "10:05")
 */
/** Fade duration when play mode advances to the next slide. */
export const PRESENTATION_PLAY_SLIDE_FADE_MS = 400;

/** Scroll offset for play mode: linear over slide duration until bottom is visible. */
export const computePlayModeScrollTop = (
  maxScroll: number,
  elapsedMs: number,
  durationMs: number
): number => {
  if (maxScroll <= 0 || durationMs <= 0) {
    return 0;
  }
  const progress = Math.min(1, elapsedMs / durationMs);
  return maxScroll * progress;
};

/** Prefer inner card scroll; fall back to the presentation scroll container. */
export const findPresentationSlideScrollElement = (
  root: HTMLElement | null
): HTMLElement | null => {
  if (!root) {
    return null;
  }
  const inner = root.querySelector(".presentation-card-scroll");
  if (
    inner instanceof HTMLElement &&
    inner.scrollHeight > inner.clientHeight + 1
  ) {
    return inner;
  }
  if (root.scrollHeight > root.clientHeight + 1) {
    return root;
  }
  return null;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export type PresentationDocumentTheme = 'light' | 'dark' | 'black' | 'system';

function prefersDarkScheme(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function documentThemeFromPresentation(
  theme: PresentationDocumentTheme
): { family: ThemeFamily; mode: ThemeMode } {
  if (theme === 'black') {
    return { family: 'high-contrast', mode: 'dark' };
  }
  if (theme === 'system') {
    return { family: 'default', mode: 'system' };
  }
  return { family: 'default', mode: theme === 'dark' ? 'dark' : 'light' };
}

/**
 * Apply theme to the document (tests / utilities). Writes themeFamily + themeMode.
 */
export const applyTheme = (theme: PresentationDocumentTheme): void => {
  const sel = documentThemeFromPresentation(theme);
  const resolved = resolveThemeFromSelection(sel.family, sel.mode, prefersDarkScheme());
  applyResolvedThemeToDocument(resolved);
  try {
    localStorage.setItem(THEME_STORAGE_FAMILY_KEY, sel.family);
    localStorage.setItem(THEME_STORAGE_MODE_KEY, sel.mode);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * Handle theme change and apply immediately.
 */
export const handleThemeChange = (
  newTheme: PresentationDocumentTheme,
  setTheme: (theme: PresentationDocumentTheme) => void
): void => {
  setTheme(newTheme);
  applyTheme(newTheme);
};

/** For tests that still set `localStorage.theme` directly. */
export function legacyLocalStorageToResolved(
  stored: LegacyStoredTheme | string | null
) {
  if (!stored || !isLegacyStoredTheme(stored)) {
    return resolveThemeFromSelection('default', 'system', prefersDarkScheme());
  }
  const sel = migrateLegacyTheme(stored);
  return resolveThemeFromSelection(sel.family, sel.mode, prefersDarkScheme());
}
