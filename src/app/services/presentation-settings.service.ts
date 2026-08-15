import { Injectable } from '@angular/core';
import {
  DefaultPrayerView,
  HomePresentationFilter,
  PresentationContentType,
  PresentationSettings,
  PresentationTimeFilter,
  SelectablePresentationContentType,
  isSelectablePresentationContentType,
  normalizeContentTypes,
  normalizePresentationStatusFilters,
  PRESENTATION_STATUS_FILTERS_DEFAULT,
} from '../types/presentation';

const STORAGE_KEY = 'prayer_app_presentation_settings';

const TIME_FILTERS: readonly PresentationTimeFilter[] = [
  'week',
  'twoweeks',
  'month',
  'year',
  'all',
];

export function mapHomeFilterToContentType(
  filter: HomePresentationFilter,
  defaultPrayerView: DefaultPrayerView = 'current'
): SelectablePresentationContentType {
  switch (filter) {
    case 'current':
    case 'answered':
    case 'archived':
    case 'total':
      return 'prayers';
    case 'prompts':
      return 'prompts';
    case 'personal':
      return 'personal';
    case 'planning_center_list':
      return 'members';
    case 'memorize':
      return defaultPrayerView === 'personal' ? 'personal' : 'prayers';
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

function isPresentationTimeFilter(
  value: unknown
): value is PresentationTimeFilter {
  return (
    typeof value === 'string' &&
    (TIME_FILTERS as readonly string[]).includes(value)
  );
}

function parseContentTypes(
  settings: Partial<PresentationSettings> & {
    contentType?: PresentationContentType;
  }
): SelectablePresentationContentType[] | null {
  if (settings.contentTypes !== undefined) {
    return normalizeContentTypes(settings.contentTypes);
  }

  if (settings.contentType !== undefined) {
    return normalizeContentTypes(settings.contentType);
  }

  return null;
}

function parseStoredSettings(
  value: unknown,
  defaults: PresentationSettings
): PresentationSettings | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const settings = value as Partial<PresentationSettings> & {
    contentType?: PresentationContentType;
  };

  const contentTypes = parseContentTypes(settings);
  if (contentTypes === null) {
    return null;
  }

  if (typeof settings.randomize !== 'boolean') {
    return null;
  }

  if (!isPresentationTimeFilter(settings.timeFilter)) {
    return null;
  }

  const statusFilters = normalizePresentationStatusFilters(
    settings.statusFilters
  );
  if (!statusFilters) {
    return null;
  }

  if (
    typeof settings.prayerTimerMinutes !== 'number' ||
    !Number.isFinite(settings.prayerTimerMinutes) ||
    settings.prayerTimerMinutes < 1 ||
    settings.prayerTimerMinutes > 60
  ) {
    return null;
  }

  if (
    settings.smartMode !== undefined &&
    typeof settings.smartMode !== 'boolean'
  ) {
    return null;
  }

  if (
    settings.displayDuration !== undefined &&
    (typeof settings.displayDuration !== 'number' ||
      !Number.isFinite(settings.displayDuration) ||
      settings.displayDuration < 5 ||
      settings.displayDuration > 60)
  ) {
    return null;
  }

  if (
    settings.loop !== undefined &&
    typeof settings.loop !== 'boolean'
  ) {
    return null;
  }

  return {
    contentTypes,
    randomize: settings.randomize,
    smartMode:
      typeof settings.smartMode === 'boolean'
        ? settings.smartMode
        : defaults.smartMode,
    displayDuration:
      typeof settings.displayDuration === 'number'
        ? settings.displayDuration
        : defaults.displayDuration,
    loop:
      typeof settings.loop === 'boolean' ? settings.loop : defaults.loop,
    timeFilter: settings.timeFilter,
    statusFilters,
    prayerTimerMinutes: settings.prayerTimerMinutes,
  };
}

@Injectable({
  providedIn: 'root',
})
export class PresentationSettingsService {
  getDefaults(): PresentationSettings {
    return {
      contentTypes: ['prayers'],
      randomize: false,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: 'all',
      statusFilters: { ...PRESENTATION_STATUS_FILTERS_DEFAULT },
      prayerTimerMinutes: 10,
    };
  }

  load(): PresentationSettings {
    const defaults = this.getDefaults();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaults;
      }

      const parsed: unknown = JSON.parse(raw);
      const settings = parseStoredSettings(parsed, defaults);
      if (!settings) {
        return defaults;
      }

      return settings;
    } catch {
      return defaults;
    }
  }

  save(settings: PresentationSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore quota / private mode */
    }
  }
}
