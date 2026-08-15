import { isMemberPrayerId } from './prayer-card-kind';

export type PrayerItemDeepLinkTab =
  | 'current'
  | 'answered'
  | 'archived'
  | 'total'
  | 'personal'
  | 'planning_center_list';

export type PersonalDeepLinkCategoryMode = 'current' | 'answered' | 'total';

/** Personal chip mode so `#prayer-card-{id}` is in the DOM for Home deep links. */
export function resolvePersonalDeepLinkCategoryMode(
  prayerId: string,
  personalPrayers: ReadonlyArray<{ id: string; category?: string | null }>
): PersonalDeepLinkCategoryMode | null {
  const prayer = personalPrayers.find((p) => p.id === prayerId);
  if (!prayer) {
    return null;
  }
  if (prayer.category === 'Answered') {
    return 'answered';
  }
  return 'current';
}

/** Home tab to show before scrolling to `#prayer-card-{id}` from email/push deep links. */
export function resolvePrayerItemDeepLinkTab(
  prayerId: string,
  communityPrayers: ReadonlyArray<{ id: string; status: string }>,
  personalPrayers: ReadonlyArray<{ id: string }>
): PrayerItemDeepLinkTab | null {
  if (isMemberPrayerId(prayerId)) {
    return 'planning_center_list';
  }
  if (personalPrayers.some((p) => p.id === prayerId)) {
    return 'personal';
  }
  const community = communityPrayers.find((p) => p.id === prayerId);
  if (community) {
    if (community.status === 'answered') {
      return 'answered';
    }
    if (community.status === 'archived') {
      return 'archived';
    }
    return 'current';
  }
  return null;
}
