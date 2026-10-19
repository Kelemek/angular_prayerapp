import {
  type GroupPrayerCatalogSnapshot,
  shouldShowGroupCatalogLoadingIndicator,
} from './prayer-group-catalog-load';

export type GroupPrayerCatalogLoadWireDeps = {
  readCache: () => GroupPrayerCatalogSnapshot | null | undefined;
  writeCache: (snapshot: GroupPrayerCatalogSnapshot) => void;
  invalidateCache: () => void;
  setLoading: (loading: boolean) => void;
  markFetchComplete: () => void;
  publishSnapshot: (snapshot: GroupPrayerCatalogSnapshot) => void;
  fetchFromDb: () => Promise<GroupPrayerCatalogSnapshot>;
};

export async function runGroupPrayerCatalogLoad(
  deps: GroupPrayerCatalogLoadWireDeps,
  silentRefresh = false,
): Promise<void> {
  const cached = deps.readCache();
  if (shouldShowGroupCatalogLoadingIndicator(silentRefresh, cached)) {
    deps.setLoading(true);
  }
  if (cached && (cached.groups.length > 0 || cached.prayers.length > 0)) {
    deps.publishSnapshot(cached);
    if (silentRefresh) {
      deps.markFetchComplete();
      deps.setLoading(false);
      return;
    }
  }

  try {
    const snapshot = await deps.fetchFromDb();
    deps.writeCache(snapshot);
    deps.publishSnapshot(snapshot);
  } finally {
    deps.markFetchComplete();
    deps.setLoading(false);
  }
}
