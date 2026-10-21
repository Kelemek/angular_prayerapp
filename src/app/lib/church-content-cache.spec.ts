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

  it('clears church layers and keeps personal, memorize, and group data', () => {
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

    clearChurchContentStorage({ invalidate });

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
});
