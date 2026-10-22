import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  CHURCH_CACHE_KEEP_KEYS,
  clearChurchContentStorage,
} from './church-content-cache';
import { PRESENTATION_SETTINGS_STORAGE_KEY } from '../services/presentation-settings.service';

describe('clearChurchContentStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clears church layers and keeps personal, memorize, and group data', async () => {
    localStorage.setItem('prayers_cache', '{"data":[{"id":"church"}]}');
    localStorage.setItem('prompts_cache', '{"data":[{"id":"prompt"}]}');
    localStorage.setItem('memberPrayerUpdates', '{}');
    localStorage.setItem('prayed_for_abc', '1');
    localStorage.setItem('prayed_for_personal_xyz', '1');
    localStorage.setItem('personalPrayers_cache', '{"data":[{"id":"mine"}]}');
    localStorage.setItem('personalCategoryColors_cache', '{"data":{}}');
    localStorage.setItem('groupPrayerCatalog_cache', '{"data":[]}');
    localStorage.setItem('memorizationRecommendations_cache', '{"data":[]}');
    localStorage.setItem('userSession', '{"email":"a@b.com","isChurchMember":false}');
    localStorage.setItem(
      PRESENTATION_SETTINGS_STORAGE_KEY,
      JSON.stringify({ contentTypes: ['prayers', 'groups'] })
    );
    const invalidate = vi.fn();

    const { layers } = clearChurchContentStorage(
      { invalidate },
      { preferences: null },
    );
    await layers;

    expect(invalidate).toHaveBeenCalledWith('prayers');
    expect(invalidate).toHaveBeenCalledWith('prompts');
    expect(localStorage.getItem('prayers_cache')).toBeNull();
    expect(localStorage.getItem('prompts_cache')).toBeNull();
    expect(localStorage.getItem('prayed_for_abc')).toBeNull();
    expect(localStorage.getItem('prayed_for_personal_xyz')).toBe('1');
    expect(localStorage.getItem('personalPrayers_cache')).toBe(
      '{"data":[{"id":"mine"}]}'
    );
    expect(localStorage.getItem('groupPrayerCatalog_cache')).toBe('{"data":[]}');
    expect(localStorage.getItem('memorizationRecommendations_cache')).toBe(
      '{"data":[]}'
    );
    expect(localStorage.getItem('userSession')).toContain('a@b.com');
    const settings = JSON.parse(
      localStorage.getItem(PRESENTATION_SETTINGS_STORAGE_KEY) ?? '{}'
    ) as { contentTypes: string[] };
    expect(settings.contentTypes).toEqual(['groups']);
    for (const key of CHURCH_CACHE_KEEP_KEYS) {
      expect(localStorage.getItem(key)).not.toBeNull();
    }
  });

  it('clears church Preferences keys and keeps auth, personal, memorize, and groups', async () => {
    const store = new Map<string, string>([
      ['prayers_cache', 'church'],
      ['read_prayers', 'church'],
      ['prayerapp_planning_center_list_1', 'church'],
      ['prayed_for_abc', 'church'],
      ['prayed_for_personal_xyz', 'keep'],
      ['personalPrayers_cache', 'keep'],
      ['personalCategoryColors_cache', 'keep'],
      ['groupPrayerCatalog_cache', 'keep'],
      ['memorizationRecommendations_cache', 'keep'],
      ['prayer_app_memorize_verse', 'keep'],
      ['userSession', 'keep'],
      ['prayerapp_native_auth_bridge', 'keep'],
      ['prayerapp_native_auth_revoked', 'keep'],
      ['prayerapp_native_auth_local_session_at', 'keep'],
    ]);
    const preferences = {
      keys: async () => ({ keys: [...store.keys()] }),
      remove: async ({ key }: { key: string }) => {
        store.delete(key);
      },
    };

    const { layers } = clearChurchContentStorage(
      { invalidate: vi.fn() },
      { preferences },
    );
    await layers;

    expect(store.has('prayers_cache')).toBe(false);
    expect(store.has('read_prayers')).toBe(false);
    expect(store.has('prayerapp_planning_center_list_1')).toBe(false);
    expect(store.has('prayed_for_abc')).toBe(false);
    expect(store.get('prayed_for_personal_xyz')).toBe('keep');
    expect(store.get('personalPrayers_cache')).toBe('keep');
    expect(store.get('groupPrayerCatalog_cache')).toBe('keep');
    expect(store.get('memorizationRecommendations_cache')).toBe('keep');
    expect(store.get('prayer_app_memorize_verse')).toBe('keep');
    expect(store.get('userSession')).toBe('keep');
    expect(store.get('prayerapp_native_auth_bridge')).toBe('keep');
    expect(store.get('prayerapp_native_auth_revoked')).toBe('keep');
    expect(store.get('prayerapp_native_auth_local_session_at')).toBe('keep');
  });

  it('does not throw when preferences is null or omitted on web', async () => {
    const { layers } = clearChurchContentStorage(
      { invalidate: vi.fn() },
      { preferences: null },
    );
    await expect(layers).resolves.toBeUndefined();

    const omitted = clearChurchContentStorage({ invalidate: vi.fn() });
    await expect(omitted.layers).resolves.toBeUndefined();
  });
});
