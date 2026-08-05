import { isMemberPrayerId } from './prayer-card-kind';

export type PrayerItemDeepLinkTab =
  | 'current'
  | 'answered'
  | 'total'
  | 'personal'
  | 'planning_center_list';

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
      return 'total';
    }
    return 'current';
  }
  return null;
}
