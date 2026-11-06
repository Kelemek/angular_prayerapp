import { PRAY_FOR_MODAL_DO_NOT_SHOW_KEY } from './prayer-card-pray-for-modal';
import {
  PRESENTATION_SETTINGS_STORAGE_KEY,
  parsePresentationSettingsJson,
} from '../services/presentation-settings.service';
import { getPresentationSettingsDefaults } from './presentation-settings-defaults';
import {
  LEGACY_THEME_STORAGE_KEY,
  isLegacyStoredTheme,
  isThemeFamily,
  isThemeMode,
  migrateLegacyTheme,
  THEME_STORAGE_FAMILY_KEY,
  THEME_STORAGE_MODE_KEY,
  type ThemeSelection,
} from '../services/theme.service';
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

function readThemeSelectionFromLocalStorage(): ThemeSelection | undefined {
  try {
    const fam = localStorage.getItem(THEME_STORAGE_FAMILY_KEY);
    const mod = localStorage.getItem(THEME_STORAGE_MODE_KEY);
    if (isThemeFamily(fam) && isThemeMode(mod)) {
      return { family: fam, mode: mod };
    }
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy && isLegacyStoredTheme(legacy)) {
      return migrateLegacyTheme(legacy);
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

function selectionFromPrefs(prefs: ClientPreferences): ThemeSelection | undefined {
  if (isThemeFamily(prefs.themeFamily) && isThemeMode(prefs.themeMode)) {
    return { family: prefs.themeFamily, mode: prefs.themeMode };
  }
  if (prefs.theme && isLegacyStoredTheme(prefs.theme)) {
    return migrateLegacyTheme(prefs.theme);
  }
  return undefined;
}

function selectionsEqual(a: ThemeSelection | undefined, b: ThemeSelection | undefined): boolean {
  if (!a || !b) {
    return false;
  }
  return a.family === b.family && a.mode === b.mode;
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

/**
 * When cloud/session prefs lag, theme and text size mirrors on this device win.
 * Call when materializing prefs from the DB or cached session — not on every apply.
 */
export function reconcileClientPreferencesWithDevice(
  prefs: ClientPreferences,
  normalizedEmail: string
): { preferences: ClientPreferences; divergedFromInput: boolean } {
  if (!mayUseLegacyLocalKeysForEmail(normalizedEmail)) {
    return { preferences: prefs, divergedFromInput: false };
  }
  const local = readClientPreferencesFromLocalMirrors();
  const preferences: ClientPreferences = { ...prefs };
  let divergedFromInput = false;
  if (local.textSize && local.textSize !== prefs.textSize) {
    preferences.textSize = local.textSize;
    divergedFromInput = true;
  }
  const localSel = selectionFromPrefs(local);
  const prefsSel = selectionFromPrefs(prefs);
  if (localSel && !selectionsEqual(localSel, prefsSel)) {
    preferences.themeFamily = localSel.family;
    preferences.themeMode = localSel.mode;
    delete preferences.theme;
    divergedFromInput = true;
  }
  return { preferences, divergedFromInput };
}

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
  const sel = readThemeSelectionFromLocalStorage();
  if (sel) {
    prefs.themeFamily = sel.family;
    prefs.themeMode = sel.mode;
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
      themeFamily: 'default',
      themeMode: 'system',
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

/** Persist payload: mirrors for most fields; theme/text size from live services. */
export function buildClientPreferencesForPersist(
  normalizedEmail: string,
  sessionPrefs: ClientPreferences | undefined,
  appearance: { theme: ThemeSelection; textSize: TextSize }
): ClientPreferences | undefined {
  const base = buildClientPreferencesFromLocalForPersist(
    normalizedEmail,
    sessionPrefs
  );
  if (!base) {
    return undefined;
  }
  return {
    ...base,
    themeFamily: appearance.theme.family,
    themeMode: appearance.theme.mode,
    textSize: appearance.textSize,
  };
}

export function clearClientPreferenceLocalMirrors(): void {
  try {
    localStorage.removeItem(CLIENT_PREFERENCES_LEGACY_CLAIM_KEY);
    localStorage.removeItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY);
    localStorage.removeItem(PRESENTATION_SETTINGS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    localStorage.removeItem(THEME_STORAGE_FAMILY_KEY);
    localStorage.removeItem(THEME_STORAGE_MODE_KEY);
    localStorage.removeItem('textSize');
    localStorage.removeItem(MEMORIZE_LIST_VIEW_KEY);
    localStorage.removeItem(MEMORIZE_TABLE_SORT_KEY);
    localStorage.removeItem(MEMORIZE_LISTEN_SPEED_STORAGE_KEY);
    localStorage.removeItem(PREFERRED_TRANSLATION_KEY);
  } catch {
    /* ignore */
  }
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

    const sel = selectionFromPrefs(prefs);
    if (sel) {
      localStorage.setItem(THEME_STORAGE_FAMILY_KEY, sel.family);
      localStorage.setItem(THEME_STORAGE_MODE_KEY, sel.mode);
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
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
