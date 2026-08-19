import type { PrayerRequest } from './prayer-types';

export function arePrayerCatalogsReadyFromFlags(flags: {
  loadingCommunity: boolean;
  loadingPersonal: boolean;
  communityFetchInFlight: boolean;
  communityDbComplete: boolean;
  personalDbComplete: boolean;
}): boolean {
  return (
    !flags.loadingCommunity &&
    !flags.loadingPersonal &&
    !flags.communityFetchInFlight &&
    flags.communityDbComplete &&
    flags.personalDbComplete
  );
}

export function personalPrayersFromDbRows(
  rows: unknown[],
  mapRow: (row: unknown) => PrayerRequest,
  normalize: (prayers: PrayerRequest[]) => PrayerRequest[]
): PrayerRequest[] {
  return normalize(rows.map(mapRow));
}

export function answeredPersonalPrayerIds(prayers: PrayerRequest[]): string[] {
  return prayers.filter((p) => p.category === 'Answered').map((p) => p.id);
}
