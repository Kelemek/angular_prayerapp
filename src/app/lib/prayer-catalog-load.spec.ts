import { describe, expect, it, vi } from 'vitest';
import {
  applyCommunityPrayersCacheSnapshot,
  applyPersonalPrayersCacheSnapshot,
  applyCommunityLoadErrorPlan,
  publishCommunityPrayersFromDb,
  COMMUNITY_PRAYERS_CACHE_KEY,
  PERSONAL_PRAYERS_CACHE_KEY,
  planCommunityLoadErrorFallback,
  planPersonalPrayerLoadCacheFallback,
  prayerLoadErrorMessage,
  personalCachedPrayersMatchUser,
  shouldShowCommunityLoadingIndicator,
  shouldSkipCommunityPrayersDbOnSilentRefresh,
} from './prayer-catalog-load';
import type { PrayerRequest } from './prayer-types';

function prayer(email: string): PrayerRequest {
  return {
    id: '1',
    title: 't',
    description: 'd',
    status: 'current',
    prayer_for: 'p',
    category: null,
    requester: email,
    email,
    is_anonymous: false,
    date_requested: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    approval_status: 'approved',
    type: 'prayer',
    updates: [],
  };
}

describe('prayer-catalog-load', () => {
  it('exports stable cache keys', () => {
    expect(COMMUNITY_PRAYERS_CACHE_KEY).toBe('prayers');
    expect(PERSONAL_PRAYERS_CACHE_KEY).toBe('personalPrayers');
  });

  it('shouldSkipCommunityPrayersDbOnSilentRefresh only when silent + cache', () => {
    const cached = [prayer('a@test.com')];
    expect(shouldSkipCommunityPrayersDbOnSilentRefresh(true, cached)).toBe(true);
    expect(shouldSkipCommunityPrayersDbOnSilentRefresh(false, cached)).toBe(false);
    expect(shouldSkipCommunityPrayersDbOnSilentRefresh(true, [])).toBe(false);
  });

  it('shouldShowCommunityLoadingIndicator when no cache and not silent', () => {
    expect(shouldShowCommunityLoadingIndicator(false, undefined)).toBe(true);
    expect(shouldShowCommunityLoadingIndicator(true, undefined)).toBe(false);
    expect(shouldShowCommunityLoadingIndicator(false, [prayer('a@test.com')])).toBe(false);
  });

  it('prayerLoadErrorMessage prefers Error.message', () => {
    expect(prayerLoadErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(prayerLoadErrorMessage('x', 'fallback')).toBe('fallback');
  });

  it('planCommunityLoadErrorFallback uses cache when available', () => {
    const cached = [prayer('a@test.com')];
    const plan = planCommunityLoadErrorFallback(cached, new Error('net'), 0, 60000);
    expect(plan).toEqual({ kind: 'use_cache', prayers: cached });
  });

  it('planCommunityLoadErrorFallback shows error when no cache', () => {
    const plan = planCommunityLoadErrorFallback(undefined, new Error('net'), 0, 60000);
    expect(plan.kind).toBe('show_error');
    if (plan.kind === 'show_error') {
      expect(plan.errorMessage).toBe('net');
      expect(plan.emitToast).toBe(true);
    }
  });

  it('personalCachedPrayersMatchUser requires all rows match email', () => {
    const rows = [prayer('me@test.com'), prayer('me@test.com')];
    expect(personalCachedPrayersMatchUser(rows, 'me@test.com')).toBe(true);
    expect(personalCachedPrayersMatchUser(rows, 'other@test.com')).toBe(false);
    expect(personalCachedPrayersMatchUser(rows, null)).toBe(false);
  });

  it('planPersonalPrayerLoadCacheFallback discards mismatched cache', () => {
    const cached = [prayer('other@test.com')];
    expect(planPersonalPrayerLoadCacheFallback(cached, 'me@test.com')).toEqual({
      kind: 'discard_cache',
    });
    expect(planPersonalPrayerLoadCacheFallback(cached, 'other@test.com')).toEqual({
      kind: 'apply_cache',
      prayers: cached,
    });
    expect(planPersonalPrayerLoadCacheFallback([], 'me@test.com')).toEqual({ kind: 'noop' });
  });

  it('applyCommunityPrayersCacheSnapshot publishes and reapplies filters', () => {
    const cached = [prayer('me@test.com')];
    const setAll = vi.fn();
    const reapply = vi.fn();
    applyCommunityPrayersCacheSnapshot(cached, {
      setAllPrayers: setAll,
      reapplyFilters: reapply,
    });
    expect(setAll).toHaveBeenCalledWith(cached);
    expect(reapply).toHaveBeenCalled();
  });

  it('applyPersonalPrayersCacheSnapshot normalizes and drops answered reminders', () => {
    const cached = [prayer('me@test.com')];
    const setPersonal = vi.fn();
    const dropReminders = vi.fn();
    const normalized = applyPersonalPrayersCacheSnapshot(
      cached,
      (rows) => rows,
      {
        setPersonalPrayers: setPersonal,
        dropAnsweredReminders: dropReminders,
      }
    );
    expect(normalized).toEqual(cached);
    expect(setPersonal).toHaveBeenCalledWith(cached);
    expect(dropReminders).toHaveBeenCalledWith(cached);
  });

  it('publishCommunityPrayersFromDb formats, caches, and refreshes badges', () => {
    const setAll = vi.fn();
    const setCache = vi.fn();
    const reapply = vi.fn();
    const refreshBadges = vi.fn();
    const markComplete = vi.fn();
    const formatted = [prayer('me@test.com')];

    publishCommunityPrayersFromDb([], () => formatted, {
      setAllPrayers: setAll,
      setCache,
      reapplyFilters: reapply,
      refreshBadges,
      markDbFetchComplete: markComplete,
    });

    expect(setAll).toHaveBeenCalledWith(formatted);
    expect(setCache).toHaveBeenCalledWith(formatted);
    expect(reapply).toHaveBeenCalled();
    expect(refreshBadges).toHaveBeenCalled();
    expect(markComplete).toHaveBeenCalled();
  });

  it('applyCommunityLoadErrorPlan handles cache and error branches', () => {
    const cached = [prayer('me@test.com')];
    const setAll = vi.fn();
    const reapply = vi.fn();
    const setError = vi.fn();
    const emitToast = vi.fn();

    applyCommunityLoadErrorPlan({ kind: 'use_cache', prayers: cached }, {
      setAllPrayers: setAll,
      reapplyFilters: reapply,
      setError,
      emitErrorToast: emitToast,
    });
    expect(setAll).toHaveBeenCalledWith(cached);
    expect(setError).toHaveBeenCalledWith(null);
    expect(emitToast).not.toHaveBeenCalled();

    applyCommunityLoadErrorPlan(
      { kind: 'show_error', errorMessage: 'boom', emitToast: true },
      { setAllPrayers: setAll, reapplyFilters: reapply, setError, emitErrorToast: emitToast }
    );
    expect(setError).toHaveBeenCalledWith('boom');
    expect(emitToast).toHaveBeenCalled();
  });
});
