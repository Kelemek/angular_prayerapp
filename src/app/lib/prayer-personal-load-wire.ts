import {
  applyCachedPersonalPrayersSnapshot,
  applyPersonalPrayerLoadCacheFallbackPlan,
  planPersonalPrayerLoadCacheFallback,
  publishPersonalPrayersFromDb,
  shouldShowPersonalLoadingIndicator,
  type PersonalPrayersCacheSnapshotActions,
} from "./prayer-catalog-load";
import type { PrayerRequest } from "./prayer-types";

export type PersonalPrayerLoadWireDeps = {
  getUserEmail: () => Promise<string | null>;
  readCache: () => PrayerRequest[] | null | undefined;
  invalidateCache: () => void;
  setLoading: (loading: boolean) => void;
  markFetchComplete: () => void;
  setPersonalPrayers: (prayers: PrayerRequest[]) => void;
  /** Clear in-memory catalog only (after cache invalidate on mismatched-user discard). */
  clearPersonalPrayersInMemory: () => void;
  cacheSnapshotActions: () => PersonalPrayersCacheSnapshotActions;
  fetchFromDb: (userEmail: string) => Promise<PrayerRequest[]>;
  dropAnsweredReminders: (prayers: PrayerRequest[]) => void;
};

export async function runPersonalPrayerCatalogLoad(
  deps: PersonalPrayerLoadWireDeps,
  silentRefresh = false
): Promise<void> {
  try {
    console.log("[PrayerService] Loading personal prayers...");

    const userEmail = await deps.getUserEmail();
    if (!userEmail) {
      console.warn(
        "[PrayerService] User email not available for personal prayers"
      );
      deps.markFetchComplete();
      return;
    }

    const cachedPersonalPrayers = deps.readCache();
    if (
      shouldShowPersonalLoadingIndicator(silentRefresh, cachedPersonalPrayers)
    ) {
      deps.setLoading(true);
    }
    if (cachedPersonalPrayers && cachedPersonalPrayers.length > 0) {
      console.log(
        `[PrayerService] Using cached personal prayers (${cachedPersonalPrayers.length} items)`
      );
      applyCachedPersonalPrayersSnapshot(
        cachedPersonalPrayers,
        deps.cacheSnapshotActions()
      );

      if (silentRefresh) {
        console.log(
          "[PrayerService] Cache hit for silent refresh - skipping personal prayers database query"
        );
        return;
      }
    }

    const personalPrayers = await deps.fetchFromDb(userEmail);

    console.log(
      `[PrayerService] Loaded ${personalPrayers.length} personal prayers from database`
    );
    publishPersonalPrayersFromDb(personalPrayers, {
      setPersonalPrayers: (prayers) => deps.setPersonalPrayers(prayers),
      dropAnsweredReminders: (prayers) => deps.dropAnsweredReminders(prayers),
    });
  } catch (err) {
    console.error("[PrayerService] Failed to load personal prayers:", err);

    const userEmail = await deps.getUserEmail();
    const cacheFallback = planPersonalPrayerLoadCacheFallback(
      deps.readCache(),
      userEmail
    );

    applyPersonalPrayerLoadCacheFallbackPlan(cacheFallback, {
      applyCachedSnapshot: (prayers) => {
        console.log(
          `[PrayerService] Showing ${prayers.length} cached personal prayers`
        );
        applyCachedPersonalPrayersSnapshot(
          prayers,
          deps.cacheSnapshotActions()
        );
      },
      invalidatePersonalCache: () => deps.invalidateCache(),
      clearPersonalPrayers: () => {
        console.warn(
          "[PrayerService] Cached personal prayers do not match current user - discarding cache"
        );
        deps.clearPersonalPrayersInMemory();
      },
    });
  } finally {
    deps.setLoading(false);
    deps.markFetchComplete();
  }
}
