import {
  applyCommunityLoadErrorPlan,
  applyCommunityPrayersCacheSnapshot,
  planCommunityLoadErrorFallback,
  publishCommunityPrayersFromDb,
  shouldShowCommunityLoadingIndicator,
  shouldSkipCommunityPrayersDbOnSilentRefresh,
} from './prayer-catalog-load';
import { formatApprovedCommunityPrayersFromDb } from './prayer-community-load';
import type { PrayerRequest } from './prayer-types';

export type CommunityPrayerLoadWireDeps = {
  readCache: () => PrayerRequest[] | null | undefined;
  setFetchInFlight: (inFlight: boolean) => void;
  markDbFetchComplete: () => void;
  setAllPrayersInMemory: (prayers: PrayerRequest[]) => void;
  setCache: (prayers: PrayerRequest[]) => void;
  reapplyFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (message: string | null) => void;
  refreshBadges: () => void;
  emitErrorToast: () => void;
  getLastErrorToastTime: () => number;
  loadErrorToastCooldownMs: number;
  isFetchInFlight: () => boolean;
  fetchApprovedFromDb: () => Promise<Record<string, unknown>[]>;
  getLoadGeneration?: () => number;
};

export async function runCommunityPrayerCatalogLoad(
  deps: CommunityPrayerLoadWireDeps,
  silentRefresh = false
): Promise<void> {
  const cachedPrayers = deps.readCache();
  const skipDb = shouldSkipCommunityPrayersDbOnSilentRefresh(silentRefresh, cachedPrayers);
  const generation = deps.getLoadGeneration?.() ?? 0;
  const isCurrent = () => (deps.getLoadGeneration?.() ?? 0) === generation;

  try {
    console.log('[PrayerService] Loading prayers...');
    if (!skipDb) {
      deps.setFetchInFlight(true);
    }

    if (cachedPrayers && cachedPrayers.length > 0) {
      if (!isCurrent()) {
        return;
      }
      console.log(`[PrayerService] Using cached prayers (${cachedPrayers.length} items)`);
      applyCommunityPrayersCacheSnapshot(cachedPrayers, {
        setAllPrayers: (prayers) => deps.setAllPrayersInMemory(prayers),
        reapplyFilters: () => deps.reapplyFilters(),
      });

      if (skipDb) {
        console.log('[PrayerService] Cache hit for silent refresh - skipping database query');
        if (!deps.isFetchInFlight()) {
          deps.markDbFetchComplete();
        }
        return;
      }
    }

    if (shouldShowCommunityLoadingIndicator(silentRefresh, cachedPrayers)) {
      deps.setLoading(true);
    }
    deps.setError(null);

    const prayersData = await deps.fetchApprovedFromDb();
    if (!isCurrent()) {
      return;
    }

    console.log(
      `[PrayerService] Loaded ${prayersData?.length || 0} approved prayers from database`
    );

    publishCommunityPrayersFromDb(prayersData || [], formatApprovedCommunityPrayersFromDb, {
      setAllPrayers: (prayers) => deps.setAllPrayersInMemory(prayers),
      setCache: (prayers) => deps.setCache(prayers),
      reapplyFilters: () => deps.reapplyFilters(),
      refreshBadges: () => deps.refreshBadges(),
      markDbFetchComplete: () => deps.markDbFetchComplete(),
    });
  } catch (err) {
    if (!isCurrent()) {
      return;
    }
    console.error('[PrayerService] Failed to load prayers:', err);

    const fallbackPlan = planCommunityLoadErrorFallback(
      deps.readCache(),
      err,
      deps.getLastErrorToastTime(),
      deps.loadErrorToastCooldownMs
    );

    if (fallbackPlan.kind === 'use_cache') {
      console.log(
        `[PrayerService] Showing ${fallbackPlan.prayers.length} cached prayers (error fallback)`
      );
    }

    applyCommunityLoadErrorPlan(fallbackPlan, {
      setAllPrayers: (prayers) => deps.setAllPrayersInMemory(prayers),
      reapplyFilters: () => deps.reapplyFilters(),
      setError: (message) => deps.setError(message),
      emitErrorToast: () => deps.emitErrorToast(),
    });
    deps.markDbFetchComplete();
  } finally {
    if (isCurrent()) {
      if (!skipDb) {
        deps.setFetchInFlight(false);
      }
      deps.setLoading(false);
    }
  }
}
