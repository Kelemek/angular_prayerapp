import { describe, expect, it } from 'vitest';
import { parseClientPreferencesJson } from './client-preferences-parse';
import { PRESENTATION_STATUS_FILTERS_DEFAULT } from '../types/presentation';

describe('parseClientPreferencesJson', () => {
  it('returns undefined for null or non-object', () => {
    expect(parseClientPreferencesJson(null)).toBeUndefined();
    expect(parseClientPreferencesJson('x')).toBeUndefined();
  });

  it('parses valid theme and skip modal flag', () => {
    const parsed = parseClientPreferencesJson({
      theme: 'dark',
      skipPrayForExplanationModal: true,
    });
    expect(parsed?.theme).toBe('dark');
    expect(parsed?.skipPrayForExplanationModal).toBe(true);
  });

  it('rejects invalid presentation settings blob', () => {
    const parsed = parseClientPreferencesJson({
      presentationSettings: { randomize: 'nope' },
    });
    expect(parsed?.presentationSettings).toBeUndefined();
  });

  it('parses presentation settings when valid', () => {
    const parsed = parseClientPreferencesJson({
      presentationSettings: {
        contentTypes: ['prayers'],
        randomize: false,
        smartMode: true,
        displayDuration: 10,
        loop: false,
        timeFilter: 'all',
        statusFilters: { ...PRESENTATION_STATUS_FILTERS_DEFAULT },
        prayerTimerMinutes: 10,
      },
    });
    expect(parsed?.presentationSettings?.loop).toBe(false);
  });
});
