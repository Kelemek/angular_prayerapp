import type {
  GroupPrayerRow,
  GroupPrayerUpdateRow,
  PrayerGroupSummary,
} from '../services/prayer-group.service';

export const GROUP_PRAYER_CATALOG_CACHE_KEY = 'groupPrayerCatalog';

export interface GroupPrayerCatalogSnapshot {
  viewerEmail: string;
  groups: PrayerGroupSummary[];
  prayers: GroupPrayerRow[];
  updates: GroupPrayerUpdateRow[];
}

export function groupPrayerCatalogCacheMatchesViewer(
  cached: GroupPrayerCatalogSnapshot | null | undefined,
  viewerEmail: string | null | undefined,
): boolean {
  const want = viewerEmail?.trim().toLowerCase() ?? '';
  if (!want || !cached) {
    return false;
  }
  return cached.viewerEmail.trim().toLowerCase() === want;
}

export function shouldShowGroupCatalogLoadingIndicator(
  silentRefresh: boolean,
  cached: GroupPrayerCatalogSnapshot | null | undefined,
): boolean {
  return !silentRefresh && !cached;
}

export function groupPrayerUpdatesByPrayerId(
  updates: GroupPrayerUpdateRow[],
): Map<string, GroupPrayerUpdateRow[]> {
  const map = new Map<string, GroupPrayerUpdateRow[]>();
  for (const update of updates) {
    const list = map.get(update.group_prayer_id) ?? [];
    list.push(update);
    map.set(update.group_prayer_id, list);
  }
  return map;
}

export function publishGroupPrayerCatalogSnapshot(
  snapshot: GroupPrayerCatalogSnapshot,
  publish: (snapshot: GroupPrayerCatalogSnapshot) => void,
): void {
  publish(snapshot);
}
