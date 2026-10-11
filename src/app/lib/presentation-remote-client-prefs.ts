import type { PresentationSettings } from '../types/presentation';
import type { PresentationSettingsPageState } from '../services/presentation-settings.coordinator';

/** Apply synced Pray page settings without overwriting a Home handoff slice. */
export function applyRemotePresentationSettingsToPage(
  page: PresentationSettingsPageState,
  settings: PresentationSettings,
  options: { handoffActive: boolean }
): void {
  if (options.handoffActive) {
    page.loop = settings.loop;
    page.smartMode = settings.smartMode;
    page.randomize = settings.randomize;
    page.displayDuration = settings.displayDuration;
    page.prayerTimerMinutes = settings.prayerTimerMinutes;
    page.timeFilter = settings.timeFilter;
    return;
  }

  page.contentTypes = [...settings.contentTypes];
  page.randomize = settings.randomize;
  page.smartMode = settings.smartMode;
  page.displayDuration = settings.displayDuration;
  page.loop = settings.loop;
  page.timeFilter = settings.timeFilter;
  page.statusFilters = { ...settings.statusFilters };
  page.prayerTimerMinutes = settings.prayerTimerMinutes;
}
