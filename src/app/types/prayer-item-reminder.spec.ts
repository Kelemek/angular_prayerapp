import { describe, it, expect } from 'vitest';
import {
  resolvePrayerItemKind,
  prayerItemReminderSchedulesMatch,
} from './prayer-item-reminder';

describe('resolvePrayerItemKind', () => {
  it('returns prompt when isPrompt is true', () => {
    expect(
      resolvePrayerItemKind({
        prayerId: 'any-id',
        isPersonal: false,
        isPrompt: true,
      })
    ).toBe('prompt');
  });

  it('returns pc_member for pc-member- prefix', () => {
    expect(
      resolvePrayerItemKind({
        prayerId: 'pc-member-abc',
        isPersonal: false,
      })
    ).toBe('pc_member');
  });

  it('returns personal when isPersonal is true', () => {
    expect(
      resolvePrayerItemKind({
        prayerId: 'p1',
        isPersonal: true,
      })
    ).toBe('personal');
  });

  it('returns community by default', () => {
    expect(
      resolvePrayerItemKind({
        prayerId: 'p1',
        isPersonal: false,
      })
    ).toBe('community');
  });
});

describe('prayerItemReminderSchedulesMatch', () => {
  const base = {
    prayer_kind: 'community' as const,
    prayer_id: 'p1',
    mode: 'daily' as const,
    local_hour: 9,
    local_minute: 15,
    local_date: null,
    local_weekday: null,
  };

  it('matches identical daily schedules', () => {
    expect(
      prayerItemReminderSchedulesMatch(base, {
        ...base,
        title_snapshot: '',
        prayer_for_snapshot: '',
        iana_timezone: 'UTC',
      })
    ).toBe(true);
  });

  it('does not match different once dates', () => {
    expect(
      prayerItemReminderSchedulesMatch(
        { ...base, mode: 'once', local_date: '2026-08-05' },
        {
          prayer_kind: 'community',
          prayer_id: 'p1',
          mode: 'once',
          local_hour: 9,
          local_minute: 15,
          local_date: '2026-08-06',
          title_snapshot: '',
          prayer_for_snapshot: '',
          iana_timezone: 'UTC',
        }
      )
    ).toBe(false);
  });
});
