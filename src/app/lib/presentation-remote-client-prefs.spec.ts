import { describe, expect, it } from 'vitest';
import { applyRemotePresentationSettingsToPage } from './presentation-remote-client-prefs';
import { PRESENTATION_STATUS_FILTERS_DEFAULT } from '../types/presentation';
import type { PresentationSettingsPageState } from '../services/presentation-settings.coordinator';

function pageState(): PresentationSettingsPageState {
  return {
    contentTypes: ['prompts'],
    randomize: true,
    smartMode: false,
    displayDuration: 20,
    loop: false,
    timeFilter: 'week',
    statusFilters: { current: true, answered: false, archived: false },
    prayerTimerMinutes: 5,
  };
}

const remote = {
  contentTypes: ['prayers'] as const,
  randomize: false,
  smartMode: true,
  displayDuration: 10,
  loop: true,
  timeFilter: 'all' as const,
  statusFilters: { ...PRESENTATION_STATUS_FILTERS_DEFAULT },
  prayerTimerMinutes: 15,
};

describe('applyRemotePresentationSettingsToPage', () => {
  it('updates only non-handoff fields when handoff is active', () => {
    const page = pageState();
    applyRemotePresentationSettingsToPage(page, remote, { handoffActive: true });
    expect(page.contentTypes).toEqual(['prompts']);
    expect(page.statusFilters.answered).toBe(false);
    expect(page.loop).toBe(true);
    expect(page.smartMode).toBe(true);
    expect(page.prayerTimerMinutes).toBe(15);
  });

  it('applies full settings when handoff is not active', () => {
    const page = pageState();
    applyRemotePresentationSettingsToPage(page, remote, { handoffActive: false });
    expect(page.contentTypes).toEqual(['prayers']);
    expect(page.loop).toBe(true);
    expect(page.statusFilters).toEqual(PRESENTATION_STATUS_FILTERS_DEFAULT);
  });
});
