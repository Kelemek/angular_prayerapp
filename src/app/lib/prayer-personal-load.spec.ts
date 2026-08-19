import { describe, expect, it } from 'vitest';
import {
  answeredPersonalPrayerIds,
  arePrayerCatalogsReadyFromFlags,
  personalPrayersFromDbRows,
} from './prayer-personal-load';
import type { PrayerRequest } from './prayer-types';

describe('prayer-personal-load', () => {
  it('arePrayerCatalogsReadyFromFlags requires all gates', () => {
    expect(
      arePrayerCatalogsReadyFromFlags({
        loadingCommunity: false,
        loadingPersonal: false,
        communityFetchInFlight: false,
        communityDbComplete: true,
        personalDbComplete: true,
      })
    ).toBe(true);
    expect(
      arePrayerCatalogsReadyFromFlags({
        loadingCommunity: true,
        loadingPersonal: false,
        communityFetchInFlight: false,
        communityDbComplete: true,
        personalDbComplete: true,
      })
    ).toBe(false);
  });

  it('maps and normalizes personal prayer rows', () => {
    const prayers = personalPrayersFromDbRows(
      [{ id: 'p1' }],
      (row) => ({ ...(row as PrayerRequest), title: 'mapped' }),
      (rows) => rows.map((p) => ({ ...p, email: 'me@test.com' }))
    );
    expect(prayers[0].title).toBe('mapped');
    expect(prayers[0].email).toBe('me@test.com');
  });

  it('collects answered personal prayer ids', () => {
    expect(
      answeredPersonalPrayerIds([
        { id: 'a', category: 'Answered' } as PrayerRequest,
        { id: 'b', category: 'Family' } as PrayerRequest,
      ])
    ).toEqual(['a']);
  });
});
