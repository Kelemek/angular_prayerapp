import type { PrayerRequest } from './prayer-types';

export function parsePrayedForRpcCount(newCount: unknown): number | null {
  const count = typeof newCount === 'number' && newCount > 0 ? newCount : null;
  return count;
}

export function updatePrayerRequestPrayedForCount(
  prayers: PrayerRequest[],
  prayerId: string,
  count: number
): PrayerRequest[] {
  return prayers.map((p) =>
    p.id === prayerId ? { ...p, prayed_for_count: count } : p
  );
}

export function patchCommunityPrayerListsPrayedForCount(
  allPrayers: PrayerRequest[],
  filteredPrayers: PrayerRequest[],
  prayerId: string,
  count: number
): { all: PrayerRequest[]; filtered: PrayerRequest[] } {
  return {
    all: updatePrayerRequestPrayedForCount(allPrayers, prayerId, count),
    filtered: updatePrayerRequestPrayedForCount(filteredPrayers, prayerId, count),
  };
}

export function patchPersonalPrayersPrayedForCount(
  prayers: PrayerRequest[],
  prayerId: string,
  count: number
): PrayerRequest[] {
  return updatePrayerRequestPrayedForCount(prayers, prayerId, count);
}
