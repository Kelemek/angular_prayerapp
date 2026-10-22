import {
  BADGE_READ_PRAYERS_DATA_KEY,
  BADGE_READ_PROMPTS_DATA_KEY,
} from './badge-cache';
import { MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY } from './prayer-member-pray-for';
import { MEMBER_PRAYER_UPDATES_CACHE_KEY } from './prayer-member-updates';
import {
  HOME_RETURN_CONTEXT_STATE_KEY,
  PRESENTATION_HOME_HANDOFF_STATE_KEY,
  PRESENTATION_HOME_NAV_STATE_KEY,
} from '../types/presentation';
import {
  NATIVE_AUTH_BRIDGE_PREFS_KEY,
  NATIVE_AUTH_BRIDGE_REVOKED_KEY,
  NATIVE_AUTH_LOCAL_SESSION_AT_KEY,
} from '../../lib/native-auth-storage-bridge';

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

export const CHURCH_CACHE_KEEP_KEYS = [
  'personalPrayers_cache',
  'personalCategoryColors_cache',
  'groupPrayerCatalog_cache',
  'memorizationRecommendations_cache',
  'userSession',
] as const;

export const CHURCH_LOCAL_STORAGE_KEYS = [
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

export const CHURCH_INDEXED_DB_NAMES = CHURCH_CACHE_SERVICE_KEYS.map(
  (key) => `${key}_cache`,
);

/** Prefixes removed from localStorage and Preferences. */
export const CHURCH_DROP_PREFIXES = [
  'prayerapp_planning_center_list_',
  'prayed_for_',
] as const;

/** Kept even when a drop prefix would match. */
export const CHURCH_KEEP_PREFIXES = [
  'prayed_for_personal_',
  'prayer_app_memorize_',
] as const;

const CHURCH_EXACT_KEYS = new Set<string>(CHURCH_LOCAL_STORAGE_KEYS);
const CHURCH_KEEP_EXACT_KEYS = new Set<string>([
  ...CHURCH_CACHE_KEEP_KEYS,
  NATIVE_AUTH_BRIDGE_PREFS_KEY,
  NATIVE_AUTH_BRIDGE_REVOKED_KEY,
  NATIVE_AUTH_LOCAL_SESSION_AT_KEY,
]);

/** True when a localStorage or Preferences key is church content. */
export function isChurchContentStorageKey(key: string): boolean {
  if (CHURCH_KEEP_EXACT_KEYS.has(key)) {
    return false;
  }
  for (const prefix of CHURCH_KEEP_PREFIXES) {
    if (key.startsWith(prefix)) {
      return false;
    }
  }
  if (CHURCH_EXACT_KEYS.has(key)) {
    return true;
  }
  for (const prefix of CHURCH_DROP_PREFIXES) {
    if (key.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}
