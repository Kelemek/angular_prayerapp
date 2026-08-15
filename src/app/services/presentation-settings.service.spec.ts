import { describe, it, expect, beforeEach } from 'vitest';
import {
  mapHomeFilterToContentType,
  PresentationSettingsService,
} from './presentation-settings.service';

describe('mapHomeFilterToContentType', () => {
  it('maps current, answered, and total to prayers', () => {
    expect(mapHomeFilterToContentType('current')).toBe('prayers');
    expect(mapHomeFilterToContentType('answered')).toBe('prayers');
    expect(mapHomeFilterToContentType('archived')).toBe('prayers');
    expect(mapHomeFilterToContentType('total')).toBe('prayers');
  });

  it('maps prompts, personal, and members tabs', () => {
    expect(mapHomeFilterToContentType('prompts')).toBe('prompts');
    expect(mapHomeFilterToContentType('personal')).toBe('personal');
    expect(mapHomeFilterToContentType('planning_center_list')).toBe('members');
  });

  it('maps memorize using defaultPrayerView', () => {
    expect(mapHomeFilterToContentType('memorize', 'current')).toBe('prayers');
    expect(mapHomeFilterToContentType('memorize', 'personal')).toBe('personal');
  });
});

describe('PresentationSettingsService', () => {
  let service: PresentationSettingsService;

  beforeEach(() => {
    localStorage.clear();
    service = new PresentationSettingsService();
  });

  it('getDefaults matches presentation component defaults', () => {
    expect(service.getDefaults()).toEqual({
      contentTypes: ['prayers'],
      randomize: false,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: 'all',
      statusFilters: { current: true, answered: true, archived: false },
      prayerTimerMinutes: 10,
    });
  });

  it('load returns defaults when storage is empty', () => {
    expect(service.load()).toEqual(service.getDefaults());
  });

  it('save and load round-trip settings', () => {
    const settings = {
      contentTypes: ['prompts'] as const,
      randomize: true,
      smartMode: false,
      displayDuration: 20,
      loop: false,
      timeFilter: 'week' as const,
      statusFilters: { current: true, answered: false, archived: false },
      prayerTimerMinutes: 25,
    };

    service.save(settings);
    expect(service.load()).toEqual(settings);
  });

  it('load returns defaults for invalid JSON', () => {
    localStorage.setItem('prayer_app_presentation_settings', 'not-json');
    expect(service.load()).toEqual(service.getDefaults());
  });

  it('load defaults smartMode and displayDuration when missing from older saved settings', () => {
    localStorage.setItem(
      'prayer_app_presentation_settings',
      JSON.stringify({
        contentType: 'prompts',
        randomize: true,
        timeFilter: 'week',
        statusFilters: { current: true, answered: false, archived: false },
        prayerTimerMinutes: 25,
      })
    );

    expect(service.load()).toEqual({
      contentTypes: ['prompts'],
      randomize: true,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: 'week',
      statusFilters: { current: true, answered: false, archived: false },
      prayerTimerMinutes: 25,
    });
  });

  it('load defaults loop when missing from older saved settings', () => {
    localStorage.setItem(
      'prayer_app_presentation_settings',
      JSON.stringify({
        contentTypes: ['prayers'],
        randomize: false,
        smartMode: true,
        displayDuration: 10,
        timeFilter: 'all',
        statusFilters: { current: true, answered: true, archived: false },
        prayerTimerMinutes: 10,
      })
    );

    expect(service.load().loop).toBe(true);
  });

  it('migrates legacy contentType all to empty contentTypes', () => {
    localStorage.setItem(
      'prayer_app_presentation_settings',
      JSON.stringify({
        contentType: 'all',
        randomize: false,
        timeFilter: 'month',
        statusFilters: { current: true, answered: true, archived: false },
        prayerTimerMinutes: 10,
      })
    );

    expect(service.load().contentTypes).toEqual([]);
  });

  it('loads saved contentTypes arrays', () => {
    localStorage.setItem(
      'prayer_app_presentation_settings',
      JSON.stringify({
        contentTypes: ['prayers', 'prompts'],
        randomize: false,
        smartMode: true,
        displayDuration: 10,
        timeFilter: 'month',
        statusFilters: { current: true, answered: true, archived: false },
        prayerTimerMinutes: 10,
      })
    );

    expect(service.load().contentTypes).toEqual(['prayers', 'prompts']);
  });

  it('load returns defaults for invalid shape', () => {
    localStorage.setItem(
      'prayer_app_presentation_settings',
      JSON.stringify({ contentType: 'invalid', randomize: 'yes' })
    );
    expect(service.load()).toEqual(service.getDefaults());
  });

});
