import {
  CHURCH_INDEXED_DB_NAMES,
  isChurchContentStorageKey,
} from './church-content-cache-keys';

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

const CHURCH_INDEXED_DB_NAME_SET = new Set<string>(CHURCH_INDEXED_DB_NAMES);

const PREFERENCES_KEYS_TIMEOUT_MS = 800;

export type PreferencesApi = {
  keys(): Promise<{ keys: string[] }>;
  remove(options: { key: string }): Promise<void>;
};

export type ChurchCacheLayerDeps = {
  indexedDB?: IDBFactory | null;
  caches?: CacheStorage | null;
  preferences?: PreferencesApi | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Preferences keys timed out'));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
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
    if (!name || !CHURCH_INDEXED_DB_NAME_SET.has(name)) {
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
  let keys: string[];
  try {
    const listed = await withTimeout(
      preferences.keys(),
      PREFERENCES_KEYS_TIMEOUT_MS,
    );
    keys = listed.keys;
  } catch {
    return;
  }
  for (const key of keys) {
    if (!isChurchContentStorageKey(key)) {
      continue;
    }
    try {
      await preferences.remove({ key });
    } catch {
      /* one failed key must not abort the rest */
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
