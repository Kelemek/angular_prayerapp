import { PRAY_FOR_MODAL_DO_NOT_SHOW_KEY } from './prayer-card-pray-for-modal';
import {
  PRESENTATION_SETTINGS_STORAGE_KEY,
  parsePresentationSettingsJson,
} from '../services/presentation-settings.service';
import { getPresentationSettingsDefaults } from './presentation-settings-defaults';
import type { Theme } from '../services/theme.service';
import type { TextSize } from '../services/text-size.service';
import {
  DEFAULT_MEMORIZE_LIST_VIEW,
  DEFAULT_MEMORIZE_TABLE_SORT,
  MEMORIZE_LIST_VIEW_KEY,
  MEMORIZE_TABLE_SORT_KEY,
  loadMemorizeListView,
  loadMemorizeTableSort,
} from './memorization/memorization-list-prefs';
import {
  MEMORIZE_LISTEN_SPEED_STORAGE_KEY,
  normalizeMemorizeListenSpeed,
} from './memorization/memorizeListenSpeedStorage';
import type { ClientPreferences } from '../types/client-preferences';
import type { BibleTranslation } from '../types/memorization';
import { isBibleTranslation } from '../types/memorization';

export const CLIENT_PREFERENCES_LEGACY_CLAIM_KEY =
  'prayerapp_client_prefs_legacy_claimed_email';

const PREFERRED_TRANSLATION_KEY = 'prayer_app_preferred_bible_translation';

function readPreferredTranslation(): BibleTranslation | undefined {
  try {
    const stored = localStorage.getItem(PREFERRED_TRANSLATION_KEY);
    if (isBibleTranslation(stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function readSkipPrayForModal(): boolean {
  try {
    return localStorage.getItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY) === 'true';
  } catch {
    return false;
  }
}

function readTheme(): Theme | undefined {
  try {
    const theme = localStorage.getItem('theme');
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function readTextSize(): TextSize | undefined {
  try {
    const size = localStorage.getItem('textSize');
    if (size === 'normal' || size === 'large' || size === 'largest') {
      return size;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function readPresentationSettings(): ClientPreferences['presentationSettings'] {
  const defaults = getPresentationSettingsDefaults();
  try {
    const raw = localStorage.getItem(PRESENTATION_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = parsePresentationSettingsJson(JSON.parse(raw), defaults);
    return parsed ?? defaults;
  } catch {
    return defaults;
  }
}

/** Whether unscoped local keys may be seeded for this email (shared-device guard). */
export function mayUseLegacyLocalKeysForEmail(normalizedEmail: string): boolean {
  try {
    const claimed = localStorage.getItem(CLIENT_PREFERENCES_LEGACY_CLAIM_KEY)?.trim();
    if (!claimed) {
      return true;
    }
    return claimed.toLowerCase() === normalizedEmail.toLowerCase();
  } catch {
    return true;
  }
}

export function markLegacyLocalKeysClaimed(normalizedEmail: string): void {
  try {
    localStorage.setItem(
      CLIENT_PREFERENCES_LEGACY_CLAIM_KEY,
      normalizedEmail.toLowerCase().trim()
    );
  } catch {
    /* ignore */
  }
}

/** Read synced fields from localStorage mirrors (no shared-device default shortcut). */
export function readClientPreferencesFromLocalMirrors(): ClientPreferences {
  const prefs: ClientPreferences = {
    presentationSettings: readPresentationSettings(),
    memorizeListView: loadMemorizeListView(),
    memorizeTableSort: loadMemorizeTableSort(),
    memorizeListenSpeed: normalizeMemorizeListenSpeed(
      localStorage.getItem(MEMORIZE_LISTEN_SPEED_STORAGE_KEY)
    ),
  };

  if (readSkipPrayForModal()) {
    prefs.skipPrayForExplanationModal = true;
  }
  const theme = readTheme();
  if (theme) {
    prefs.theme = theme;
  }
  const textSize = readTextSize();
  if (textSize) {
    prefs.textSize = textSize;
  }
  const translation = readPreferredTranslation();
  if (translation) {
    prefs.preferredBibleTranslation = translation;
  }

  return prefs;
}

function mergeClientPreferences(
  base: ClientPreferences,
  overlay: ClientPreferences
): ClientPreferences {
  return {
    ...base,
    ...overlay,
    presentationSettings:
      overlay.presentationSettings ?? base.presentationSettings,
    memorizeTableSort: overlay.memorizeTableSort ?? base.memorizeTableSort,
  };
}

/**
 * Build prefs to persist after a local edit. On shared devices where legacy keys
 * belong to another account, merges session/cloud baseline with current mirrors
 * instead of writing hard-coded defaults.
 */
export function buildClientPreferencesFromLocalForPersist(
  normalizedEmail: string,
  sessionPrefs: ClientPreferences | undefined
): ClientPreferences | undefined {
  if (mayUseLegacyLocalKeysForEmail(normalizedEmail)) {
    return buildClientPreferencesFromLocal(normalizedEmail);
  }
  if (!sessionPrefs) {
    return undefined;
  }
  return mergeClientPreferences(
    sessionPrefs,
    readClientPreferencesFromLocalMirrors()
  );
}

/** Build preferences from current local mirrors (for seeding or persisting edits). */
export function buildClientPreferencesFromLocal(
  normalizedEmail: string,
  options?: { allowLegacyKeys?: boolean }
): ClientPreferences {
  const allowLegacy =
    options?.allowLegacyKeys !== false &&
    mayUseLegacyLocalKeysForEmail(normalizedEmail);

  if (!allowLegacy) {
    const defaults = getPresentationSettingsDefaults();
    return {
      skipPrayForExplanationModal: false,
      presentationSettings: defaults,
      theme: 'system',
      textSize: 'normal',
      memorizeListView: DEFAULT_MEMORIZE_LIST_VIEW,
      memorizeTableSort: { ...DEFAULT_MEMORIZE_TABLE_SORT },
      memorizeListenSpeed: 1,
      preferredBibleTranslation: 'esv',
    };
  }

  markLegacyLocalKeysClaimed(normalizedEmail);
  return readClientPreferencesFromLocalMirrors();
}

export function applyClientPreferencesToLocalMirrors(
  prefs: ClientPreferences
): void {
  try {
    if (prefs.skipPrayForExplanationModal) {
      localStorage.setItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY, 'true');
    } else {
      localStorage.removeItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY);
    }

    if (prefs.presentationSettings) {
      localStorage.setItem(
        PRESENTATION_SETTINGS_STORAGE_KEY,
        JSON.stringify(prefs.presentationSettings)
      );
    }

    if (prefs.theme) {
      localStorage.setItem('theme', prefs.theme);
    }
    if (prefs.textSize) {
      localStorage.setItem('textSize', prefs.textSize);
    }
    if (prefs.memorizeListView) {
      localStorage.setItem(MEMORIZE_LIST_VIEW_KEY, prefs.memorizeListView);
    }
    if (prefs.memorizeTableSort) {
      localStorage.setItem(
        MEMORIZE_TABLE_SORT_KEY,
        JSON.stringify(prefs.memorizeTableSort)
      );
    }
    if (prefs.memorizeListenSpeed !== undefined) {
      localStorage.setItem(
        MEMORIZE_LISTEN_SPEED_STORAGE_KEY,
        String(prefs.memorizeListenSpeed)
      );
    }
    if (prefs.preferredBibleTranslation) {
      localStorage.setItem(
        PREFERRED_TRANSLATION_KEY,
        prefs.preferredBibleTranslation
      );
    }
  } catch {
    /* ignore quota */
  }
}
