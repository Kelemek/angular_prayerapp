import { parsePresentationSettingsJson } from '../services/presentation-settings.service';
import { getPresentationSettingsDefaults } from './presentation-settings-defaults';
import type { Theme } from '../services/theme.service';
import type { TextSize } from '../services/text-size.service';
import type { ClientPreferences } from '../types/client-preferences';
import { isBibleTranslation } from '../types/memorization';
import type { MemorizeListView, MemorizeTableSortPrefs } from './memorization/memorization-list-prefs';
import { MEMORIZE_LISTEN_SPEEDS } from './memorization/memorizeListenSpeedStorage';
import type { MemorizeListenSpeed } from './memorization/memorizeListenSpeedStorage';

const TEXT_SIZES: readonly TextSize[] = ['normal', 'large', 'largest'];
const THEMES: readonly Theme[] = ['light', 'dark', 'system'];

function isTextSize(value: unknown): value is TextSize {
  return typeof value === 'string' && (TEXT_SIZES as readonly string[]).includes(value);
}

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

function isMemorizeListView(value: unknown): value is MemorizeListView {
  return value === 'cards' || value === 'table';
}

function isMemorizeTableSort(value: unknown): value is MemorizeTableSortPrefs {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const sort = value as MemorizeTableSortPrefs;
  const sortByOk =
    sort.sortBy === 'reference' ||
    sort.sortBy === 'sessions' ||
    sort.sortBy === 'mastery';
  const dirOk = sort.sortDirection === 'asc' || sort.sortDirection === 'desc';
  return sortByOk && dirOk;
}

function isListenSpeed(value: unknown): value is MemorizeListenSpeed {
  return (
    typeof value === 'number' &&
    (MEMORIZE_LISTEN_SPEEDS as readonly number[]).includes(value)
  );
}

/** Parse and validate `email_subscribers.client_preferences` jsonb. */
export function parseClientPreferencesJson(value: unknown): ClientPreferences | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== 'object') {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const defaults = getPresentationSettingsDefaults();
  const result: ClientPreferences = {};

  if (typeof raw['skipPrayForExplanationModal'] === 'boolean') {
    result.skipPrayForExplanationModal = raw['skipPrayForExplanationModal'];
  }

  if (raw['presentationSettings'] !== undefined) {
    const parsed = parsePresentationSettingsJson(raw['presentationSettings'], defaults);
    if (parsed) {
      result.presentationSettings = parsed;
    }
  }

  if (isTheme(raw['theme'])) {
    result.theme = raw['theme'];
  }
  if (isTextSize(raw['textSize'])) {
    result.textSize = raw['textSize'];
  }
  if (isMemorizeListView(raw['memorizeListView'])) {
    result.memorizeListView = raw['memorizeListView'];
  }
  if (isMemorizeTableSort(raw['memorizeTableSort'])) {
    result.memorizeTableSort = raw['memorizeTableSort'];
  }
  if (isListenSpeed(raw['memorizeListenSpeed'])) {
    result.memorizeListenSpeed = raw['memorizeListenSpeed'];
  }
  if (isBibleTranslation(raw['preferredBibleTranslation'] as string)) {
    result.preferredBibleTranslation = raw[
      'preferredBibleTranslation'
    ] as ClientPreferences['preferredBibleTranslation'];
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
