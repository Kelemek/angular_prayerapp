import { describe, it, expect } from 'vitest';
import {
  getDisplayedPrayerCardUpdates,
  shouldShowPrayerCardUpdatesToggle,
} from './prayer-card-updates-display';
import type { PrayerUpdateRecord } from './prayer-update-header';

function update(
  id: string,
  createdAt: string
): PrayerUpdateRecord {
  return {
    id,
    content: 'update',
    created_at: createdAt,
    updated_at: createdAt,
    is_answered: false,
    is_anonymous: false,
  };
}

describe('getDisplayedPrayerCardUpdates', () => {
  it('returns empty for no updates', () => {
    expect(getDisplayedPrayerCardUpdates([], false)).toEqual([]);
  });

  it('returns all updates when showAllUpdates is true', () => {
    const updates = [
      update('a', '2026-01-01T00:00:00Z'),
      update('b', '2026-01-02T00:00:00Z'),
    ];
    expect(getDisplayedPrayerCardUpdates(updates, true)).toHaveLength(2);
  });

  it('shows only recent week updates or the latest when none are recent', () => {
    const old = update('old', '2020-01-01T00:00:00Z');
    const recent = update('recent', new Date().toISOString());
    const displayed = getDisplayedPrayerCardUpdates([old, recent], false);
    expect(displayed.map((u) => u.id)).toEqual(['recent']);

    const onlyOld = getDisplayedPrayerCardUpdates([old], false);
    expect(onlyOld).toHaveLength(1);
    expect(onlyOld[0].id).toBe('old');
  });
});

describe('shouldShowPrayerCardUpdatesToggle', () => {
  it('returns false when there are no updates', () => {
    expect(shouldShowPrayerCardUpdatesToggle([], [], false)).toBe(false);
  });

  it('returns true when hidden updates exist or showAll is active', () => {
    const all = [
      update('a', '2026-01-01T00:00:00Z'),
      update('b', '2026-01-02T00:00:00Z'),
    ];
    const displayed = [all[1]];
    expect(shouldShowPrayerCardUpdatesToggle(all, displayed, false)).toBe(true);
    expect(shouldShowPrayerCardUpdatesToggle(all, all, true)).toBe(true);
  });
});
