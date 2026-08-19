import { shouldEmitPrayerLoadErrorToast } from './prayer-service-constants';
import type { PrayerRequest } from './prayer-types';

export const COMMUNITY_PRAYERS_CACHE_KEY = 'prayers';
export const PERSONAL_PRAYERS_CACHE_KEY = 'personalPrayers';

export function shouldSkipCommunityPrayersDbOnSilentRefresh(
  silentRefresh: boolean,
  cachedPrayers: PrayerRequest[] | null | undefined
): boolean {
  return Boolean(silentRefresh && cachedPrayers && cachedPrayers.length > 0);
}

export function shouldShowCommunityLoadingIndicator(
  silentRefresh: boolean,
  cachedPrayers: PrayerRequest[] | null | undefined
): boolean {
  return !silentRefresh && !cachedPrayers;
}

export function prayerLoadErrorMessage(err: unknown, defaultMessage: string): string {
  return err instanceof Error ? err.message : defaultMessage;
}

export type CommunityLoadErrorPlan =
  | { kind: 'use_cache'; prayers: PrayerRequest[] }
  | { kind: 'show_error'; errorMessage: string; emitToast: boolean };

export function planCommunityLoadErrorFallback(
  cachedPrayers: PrayerRequest[] | null | undefined,
  err: unknown,
  lastToastTime: number,
  toastCooldownMs: number
): CommunityLoadErrorPlan {
  const errorMessage = prayerLoadErrorMessage(err, 'Failed to load prayers');
  if (cachedPrayers && cachedPrayers.length > 0) {
    return { kind: 'use_cache', prayers: cachedPrayers };
  }
  return {
    kind: 'show_error',
    errorMessage,
    emitToast: shouldEmitPrayerLoadErrorToast(lastToastTime, toastCooldownMs),
  };
}

export function personalCachedPrayersMatchUser(
  cachedPrayers: PrayerRequest[],
  userEmail: string | null
): boolean {
  if (!userEmail) {
    return false;
  }
  return cachedPrayers.every((p) => p.email === userEmail);
}

export type PersonalLoadCacheFallbackPlan =
  | { kind: 'apply_cache'; prayers: PrayerRequest[] }
  | { kind: 'discard_cache' }
  | { kind: 'noop' };

export function planPersonalPrayerLoadCacheFallback(
  cachedPersonalPrayers: PrayerRequest[] | null | undefined,
  userEmail: string | null
): PersonalLoadCacheFallbackPlan {
  if (!cachedPersonalPrayers || cachedPersonalPrayers.length === 0) {
    return { kind: 'noop' };
  }
  if (personalCachedPrayersMatchUser(cachedPersonalPrayers, userEmail)) {
    return { kind: 'apply_cache', prayers: cachedPersonalPrayers };
  }
  return { kind: 'discard_cache' };
}

export function applyCommunityPrayersCacheSnapshot(
  cachedPrayers: PrayerRequest[],
  actions: {
    setAllPrayers: (prayers: PrayerRequest[]) => void;
    reapplyFilters: () => void;
  }
): void {
  actions.setAllPrayers(cachedPrayers);
  actions.reapplyFilters();
}

export function applyPersonalPrayersCacheSnapshot(
  cachedPrayers: PrayerRequest[],
  normalize: (prayers: PrayerRequest[]) => PrayerRequest[],
  actions: {
    setPersonalPrayers: (prayers: PrayerRequest[]) => void;
    dropAnsweredReminders: (prayers: PrayerRequest[]) => void;
  }
): PrayerRequest[] {
  const normalized = normalize(cachedPrayers);
  actions.setPersonalPrayers(normalized);
  actions.dropAnsweredReminders(normalized);
  return normalized;
}

export function publishCommunityPrayersFromDb(
  prayersData: Record<string, unknown>[],
  formatFromDb: (rows: Record<string, unknown>[]) => PrayerRequest[],
  actions: {
    setAllPrayers: (prayers: PrayerRequest[]) => void;
    setCache: (prayers: PrayerRequest[]) => void;
    reapplyFilters: () => void;
    refreshBadges: () => void;
    markDbFetchComplete: () => void;
  }
): void {
  const sortedPrayers = formatFromDb(prayersData);
  actions.setAllPrayers(sortedPrayers);
  actions.setCache(sortedPrayers);
  actions.reapplyFilters();
  actions.refreshBadges();
  actions.markDbFetchComplete();
}

export function applyCommunityLoadErrorPlan(
  plan: CommunityLoadErrorPlan,
  actions: {
    setAllPrayers: (prayers: PrayerRequest[]) => void;
    reapplyFilters: () => void;
    setError: (message: string | null) => void;
    emitErrorToast: () => void;
  }
): void {
  if (plan.kind === 'use_cache') {
    actions.setAllPrayers(plan.prayers);
    actions.reapplyFilters();
    actions.setError(null);
    return;
  }

  actions.setError(plan.errorMessage);
  if (plan.emitToast) {
    actions.emitErrorToast();
  }
}

export function publishPersonalPrayersFromDb(
  personalPrayers: PrayerRequest[],
  actions: {
    setPersonalPrayers: (prayers: PrayerRequest[]) => void;
    dropAnsweredReminders: (prayers: PrayerRequest[]) => void;
  }
): void {
  actions.setPersonalPrayers(personalPrayers);
  actions.dropAnsweredReminders(personalPrayers);
}

export type PersonalPrayersCacheSnapshotActions = {
  normalize: (prayers: PrayerRequest[]) => PrayerRequest[];
  setPersonalPrayers: (prayers: PrayerRequest[]) => void;
  dropAnsweredReminders: (prayers: PrayerRequest[]) => void;
};

export function applyCachedPersonalPrayersSnapshot(
  cachedPrayers: PrayerRequest[],
  actions: PersonalPrayersCacheSnapshotActions
): void {
  applyPersonalPrayersCacheSnapshot(cachedPrayers, actions.normalize, {
    setPersonalPrayers: actions.setPersonalPrayers,
    dropAnsweredReminders: actions.dropAnsweredReminders,
  });
}

export function applyPersonalPrayerLoadCacheFallbackPlan(
  plan: PersonalLoadCacheFallbackPlan,
  actions: {
    applyCachedSnapshot: (prayers: PrayerRequest[]) => void;
    invalidatePersonalCache: () => void;
    clearPersonalPrayers: () => void;
  }
): void {
  if (plan.kind === 'apply_cache') {
    actions.applyCachedSnapshot(plan.prayers);
    return;
  }

  if (plan.kind === 'discard_cache') {
    actions.invalidatePersonalCache();
    actions.clearPersonalPrayers();
  }
}
