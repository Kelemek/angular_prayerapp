import {
  ADMIN_SESSION_START_STORAGE_KEY,
  MFA_AUTHENTICATED_EMAIL_STORAGE_KEY,
  MFA_AUTH_RESUME_TOKEN_STORAGE_KEY,
  clearPendingLoginMfaSession,
} from '../../lib/auth-storage-keys';
import {
  BADGE_READ_PRAYERS_DATA_KEY,
  BADGE_READ_PROMPTS_DATA_KEY,
} from './badge-cache';
import { clearClientPreferenceLocalMirrors } from './client-preferences-local';
import {
  COMMUNITY_PRAYERS_CACHE_KEY,
  PERSONAL_PRAYERS_CACHE_KEY,
} from './prayer-catalog-load';
import { MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY } from './prayer-member-pray-for';
import { MEMBER_PRAYER_UPDATES_CACHE_KEY } from './prayer-member-updates';
import {
  FULL_GUIDED_TOUR_QUEUE_KEY,
  PRESENTATION_HELP_TOUR_SESSION_KEY,
} from './help-tour-ids';
import {
  HOME_RETURN_CONTEXT_STATE_KEY,
  PRESENTATION_HOME_HANDOFF_STATE_KEY,
  PRESENTATION_HOME_NAV_STATE_KEY,
} from '../types/presentation';
import { clearUserInfo } from '../../utils/userInfoStorage';

const USER_SESSION_KEY = 'userSession';
const VERIFIED_SESSIONS_KEY = 'prayer_app_verified_sessions';
const MEMORIZE_ADD_TESTAMENT_KEY = 'prayer_app_memorize_add_testament';
const MEMORIZE_RECITE_ENABLED_KEY = 'memorization_recite_enabled';
const PUSH_NOTIFICATION_TOKEN_KEY = 'push_notification_token';
const PLANNING_CENTER_LIST_CACHE_PREFIX = 'prayerapp_planning_center_list_';
const LEGACY_PLANNING_CENTER_CACHE_KEY = 'planningCenterListData_cache';

/** CacheService `*_cache` keys plus legacy direct catalog keys. */
const DATA_CACHE_KEYS = [
  'prayers_cache',
  'updates_cache',
  'personalPrayers_cache',
  'personalCategoryColors_cache',
  'planningCenterListData_cache',
  'prompts_cache',
  'prayerTypes_cache',
  'adminSettings_cache',
  'emailSettings_cache',
  'analytics_cache',
  'memorizationRecommendations_cache',
  COMMUNITY_PRAYERS_CACHE_KEY,
  PERSONAL_PRAYERS_CACHE_KEY,
  MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY,
  MEMBER_PRAYER_UPDATES_CACHE_KEY,
  LEGACY_PLANNING_CENTER_CACHE_KEY,
] as const;

const APPROVAL_LOGOUT_KEYS = [
  'approvalAdminEmail',
  'approvalSessionValidated',
  'approvalApprovalType',
  'approvalApprovalId',
] as const;

function removeLocalStorageKeys(keys: readonly string[]): void {
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function removeLocalStorageKeysMatching(
  predicate: (key: string) => boolean
): void {
  const toRemove: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && predicate(key)) {
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

/**
 * Drop user-scoped localStorage on logout. Does not clear church branding, site-wide
 * admin flag caches, or Supabase auth tokens (handled separately during sign-out).
 */
export function clearUserScopedLocalStorageOnLogout(
  userEmail?: string | null
): void {
  clearClientPreferenceLocalMirrors();
  clearUserInfo();
  clearPendingLoginMfaSession();

  removeLocalStorageKeys([
    USER_SESSION_KEY,
    MFA_AUTHENTICATED_EMAIL_STORAGE_KEY,
    MFA_AUTH_RESUME_TOKEN_STORAGE_KEY,
    ADMIN_SESSION_START_STORAGE_KEY,
    VERIFIED_SESSIONS_KEY,
    BADGE_READ_PRAYERS_DATA_KEY,
    BADGE_READ_PROMPTS_DATA_KEY,
    MEMORIZE_ADD_TESTAMENT_KEY,
    MEMORIZE_RECITE_ENABLED_KEY,
    PUSH_NOTIFICATION_TOKEN_KEY,
    PRESENTATION_HOME_HANDOFF_STATE_KEY,
    HOME_RETURN_CONTEXT_STATE_KEY,
    PRESENTATION_HOME_NAV_STATE_KEY,
    PRESENTATION_HELP_TOUR_SESSION_KEY,
    FULL_GUIDED_TOUR_QUEUE_KEY,
    ...APPROVAL_LOGOUT_KEYS,
    ...DATA_CACHE_KEYS,
  ]);

  const normalized = userEmail?.toLowerCase().trim();
  if (normalized) {
    removeLocalStorageKeys([
      `last_activity_update_${normalized}`,
      `${PLANNING_CENTER_LIST_CACHE_PREFIX}${normalized}`,
    ]);
  }

  removeLocalStorageKeysMatching((key) => {
    if (key.startsWith(PLANNING_CENTER_LIST_CACHE_PREFIX)) {
      return true;
    }
    if (key.startsWith('prayed_for_')) {
      return true;
    }
    if (key.startsWith('last_activity_update_')) {
      return true;
    }
    return false;
  });
}
