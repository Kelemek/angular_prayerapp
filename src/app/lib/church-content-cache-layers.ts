import {
  NATIVE_AUTH_BRIDGE_PREFS_KEY,
  NATIVE_AUTH_BRIDGE_REVOKED_KEY,
  NATIVE_AUTH_LOCAL_SESSION_AT_KEY,
} from '../../lib/native-auth-storage-bridge';
import { CHURCH_CACHE_SERVICE_KEYS } from './church-content-cache-keys';

const CHURCH_CACHE_LOCAL_SUFFIXES = CHURCH_CACHE_SERVICE_KEYS.map(
  (key) => `${key}_cache`
);

const CHURCH_PREFERENCES_EXACT_KEYS = new Set<string>(CHURCH_CACHE_LOCAL_SUFFIXES);

const CHURCH_PREFERENCES_PREFIXES = [
  'prayerapp_planning_center_list_',
  'prayed_for_',
] as const;

const CHURCH_PREFERENCES_KEEP_PREFIXES = ['prayed_for_personal_'] as const;

const CHURCH_CACHE_URL_MARKERS = [
  '/rest/v1/prayers',
  '/rest/v1/prayer_updates',
  '/rest/v1/prayer_prompts',
  '/rest/v1/prayer_types',
  '/rest/v1/admin_settings',
  '/rest/v1/analytics',
  '/functions/v1/planning-center-lists',
  '/functions/v1/planning-center-lookup',
] as const;

const CHURCH_INDEXED_DB_NAMES = new Set<string>([
  'prayers_cache',
  'updates_cache',
  'prompts_cache',
  'prayerTypes_cache',
  'planningCenterListData_cache',
  'adminSettings_cache',
  'emailSettings_cache',
  'analytics_cache',
]);

export type PreferencesApi = {
  keys(): Promise<{ keys: string[] }>;
  remove(options: { key: string }): Promise<void>;
};

export type ChurchCacheLayerDeps = {
  indexedDB?: IDBFactory | null;
  caches?: CacheStorage | null;
  preferences?: PreferencesApi | null;
};

function shouldRemovePreferenceKey(key: string): boolean {
  if (
    key === NATIVE_AUTH_BRIDGE_PREFS_KEY ||
    key === NATIVE_AUTH_BRIDGE_REVOKED_KEY ||
    key === NATIVE_AUTH_LOCAL_SESSION_AT_KEY
  ) {
    return false;
  }
  if (CHURCH_PREFERENCES_EXACT_KEYS.has(key)) {
    return true;
  }
  for (const keep of CHURCH_PREFERENCES_KEEP_PREFIXES) {
    if (key.startsWith(keep)) {
      return false;
    }
  }
  for (const prefix of CHURCH_PREFERENCES_PREFIXES) {
    if (key.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

function requestMatchesChurchCacheUrl(url: string): boolean {
  return CHURCH_CACHE_URL_MARKERS.some((marker) => url.includes(marker));
}

export async function clearChurchIndexedDb(
  idb: IDBFactory | null | undefined
): Promise<void> {
  if (!idb?.databases) {
    return;
  }
  const databases = await idb.databases();
  for (const dbInfo of databases) {
    const name = dbInfo.name;
    if (!name || !CHURCH_INDEXED_DB_NAMES.has(name)) {
      continue;
    }
    idb.deleteDatabase(name);
  }
}

export async function clearChurchCacheStorage(
  cacheStorage: CacheStorage | null | undefined
): Promise<void> {
  if (!cacheStorage) {
    return;
  }
  const names = await cacheStorage.keys();
  for (const cacheName of names) {
    const cache = await cacheStorage.open(cacheName);
    const requests = await cache.keys();
    for (const request of requests) {
      if (requestMatchesChurchCacheUrl(request.url)) {
        await cache.delete(request);
      }
    }
  }
}

export async function clearChurchPreferences(
  preferences: PreferencesApi | null | undefined
): Promise<void> {
  if (!preferences) {
    return;
  }
  const { keys } = await preferences.keys();
  for (const key of keys) {
    if (shouldRemovePreferenceKey(key)) {
      await preferences.remove({ key });
    }
  }
}

export async function clearChurchCacheStorageLayers(
  deps: ChurchCacheLayerDeps = {}
): Promise<void> {
  const indexedDB =
    deps.indexedDB ??
    (typeof globalThis.indexedDB !== 'undefined' ? globalThis.indexedDB : null);
  const cachesApi =
    deps.caches ??
    (typeof globalThis.caches !== 'undefined' ? globalThis.caches : null);

  await clearChurchIndexedDb(indexedDB);
  await clearChurchCacheStorage(cachesApi);
  await clearChurchPreferences(deps.preferences ?? null);
}
