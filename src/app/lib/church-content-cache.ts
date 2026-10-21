import {
  BADGE_READ_PRAYERS_DATA_KEY,
  BADGE_READ_PROMPTS_DATA_KEY,
} from './badge-cache';
import { MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY } from './prayer-member-pray-for';
import { MEMBER_PRAYER_UPDATES_CACHE_KEY } from './prayer-member-updates';
import { PRESENTATION_SETTINGS_STORAGE_KEY } from '../services/presentation-settings.service';
import {
  HOME_RETURN_CONTEXT_STATE_KEY,
  PRESENTATION_HOME_HANDOFF_STATE_KEY,
  PRESENTATION_HOME_NAV_STATE_KEY,
} from '../types/presentation';

export const CHURCH_CACHE_SERVICE_KEYS = [
  'prayers',
  'updates',
  'prompts',
  'prayerTypes',
  'planningCenterListData',
  'adminSettings',
  'emailSettings',
  'analytics',
] as const;

const CHURCH_LOCAL_STORAGE_KEYS = [
  'prayers_cache',
  'updates_cache',
  'prompts_cache',
  'prayerTypes_cache',
  'planningCenterListData_cache',
  'adminSettings_cache',
  'emailSettings_cache',
  'analytics_cache',
  MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY,
  MEMBER_PRAYER_UPDATES_CACHE_KEY,
  BADGE_READ_PRAYERS_DATA_KEY,
  BADGE_READ_PROMPTS_DATA_KEY,
  'read_prayers',
  'read_prayer_updates',
  'read_prompts',
  'read_prompt_updates',
  PRESENTATION_HOME_HANDOFF_STATE_KEY,
  HOME_RETURN_CONTEXT_STATE_KEY,
  PRESENTATION_HOME_NAV_STATE_KEY,
] as const;

const PLANNING_CENTER_LIST_CACHE_PREFIX = 'prayerapp_planning_center_list_';
const PERSONAL_PRAYED_FOR_PREFIX = 'prayed_for_personal_';
const PRAYED_FOR_PREFIX = 'prayed_for_';

export const CHURCH_CACHE_KEEP_KEYS = [
  'personalPrayers_cache',
  'personalCategoryColors_cache',
  'groupPrayerCatalog_cache',
  'memorizationRecommendations_cache',
  'userSession',
] as const;

export type ChurchCacheStore = {
  invalidate(key: string): void;
};

function removeLocalStorageKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function stripChurchTypesFromPresentationSettings(): void {
  try {
    const raw = localStorage.getItem(PRESENTATION_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as {
      contentTypes?: unknown;
      contentType?: unknown;
    };
    const types = Array.isArray(parsed.contentTypes)
      ? parsed.contentTypes.filter(
          (type) => type === 'groups' || type === 'personal'
        )
      : [];
    if (types.length === 0 && parsed.contentType === 'prayers') {
      parsed.contentTypes = ['personal'];
    } else {
      parsed.contentTypes = types.length > 0 ? types : ['personal'];
    }
    localStorage.setItem(PRESENTATION_SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

/** Drop church-tied cache. Keep Personal, Memorize, Groups, and the user session. */
export function clearChurchContentStorage(cache: ChurchCacheStore): void {
  for (const key of CHURCH_CACHE_SERVICE_KEYS) {
    cache.invalidate(key);
  }
  for (const key of CHURCH_LOCAL_STORAGE_KEYS) {
    removeLocalStorageKey(key);
  }
  stripChurchTypesFromPresentationSettings();
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) {
        continue;
      }
      if (key.startsWith(PLANNING_CENTER_LIST_CACHE_PREFIX)) {
        toRemove.push(key);
        continue;
      }
      if (
        key.startsWith(PRAYED_FOR_PREFIX) &&
        !key.startsWith(PERSONAL_PRAYED_FOR_PREFIX)
      ) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
