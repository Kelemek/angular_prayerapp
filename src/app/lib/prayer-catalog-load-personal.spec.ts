import { describe, expect, it, vi } from 'vitest';
import {
  applyCachedPersonalPrayersSnapshot,
  applyPersonalPrayerLoadCacheFallbackPlan,
  publishPersonalPrayersFromDb,
} from './prayer-catalog-load';
import type { PrayerRequest } from './prayer-types';

function prayer(email: string): PrayerRequest {
  return {
    id: '1',
    title: 't',
    description: 'd',
    status: 'current',
    prayer_for: 'p',
    category: null,
    requester: email,
    email,
    is_anonymous: false,
    date_requested: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    approval_status: 'approved',
    type: 'prayer',
    updates: [],
  };
}

describe('personal catalog load helpers', () => {
  it('publishPersonalPrayersFromDb sets state and drops answered reminders', () => {
    const prayers = [prayer('me@test.com')];
    const setPersonal = vi.fn();
    const dropReminders = vi.fn();

    publishPersonalPrayersFromDb(prayers, {
      setPersonalPrayers: setPersonal,
      dropAnsweredReminders: dropReminders,
    });

    expect(setPersonal).toHaveBeenCalledWith(prayers);
    expect(dropReminders).toHaveBeenCalledWith(prayers);
  });

  it('applyPersonalPrayerLoadCacheFallbackPlan applies cache snapshot', () => {
    const cached = [prayer('me@test.com')];
    const applyCached = vi.fn();
    const invalidate = vi.fn();
    const clear = vi.fn();

    applyPersonalPrayerLoadCacheFallbackPlan(
      { kind: 'apply_cache', prayers: cached },
      {
        applyCachedSnapshot: applyCached,
        invalidatePersonalCache: invalidate,
        clearPersonalPrayers: clear,
      }
    );

    expect(applyCached).toHaveBeenCalledWith(cached);
    expect(invalidate).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
  });

  it('applyCachedPersonalPrayersSnapshot normalizes cached rows', () => {
    const cached = [prayer('me@test.com')];
    const setPersonal = vi.fn();
    const dropReminders = vi.fn();

    applyCachedPersonalPrayersSnapshot(cached, {
      normalize: (rows) => rows,
      setPersonalPrayers: setPersonal,
      dropAnsweredReminders: dropReminders,
    });

    expect(setPersonal).toHaveBeenCalledWith(cached);
    expect(dropReminders).toHaveBeenCalledWith(cached);
  });
});
