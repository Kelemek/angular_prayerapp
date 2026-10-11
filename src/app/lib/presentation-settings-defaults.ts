import {
  PRESENTATION_STATUS_FILTERS_DEFAULT,
  type PresentationSettings,
} from '../types/presentation';

/** Default Pray page / presentation settings (no Angular DI). */
export function getPresentationSettingsDefaults(): PresentationSettings {
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
