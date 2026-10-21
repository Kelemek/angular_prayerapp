import { describe, expect, it, vi } from 'vitest';
import {
  clearChurchCacheStorage,
  clearChurchCacheStorageLayers,
  clearChurchIndexedDb,
  clearChurchPreferences,
} from './church-content-cache-layers';

describe('church-content-cache-layers', () => {
  it('removes church cache entries from Cache Storage and keeps personal URLs', async () => {
    const deleted: string[] = [];
    const cache = {
      keys: vi.fn(async () => [
        new Request('https://x.test/rest/v1/prayers?select=*'),
        new Request('https://x.test/rest/v1/personal_prayers?select=*'),
      ]),
      delete: vi.fn(async (request: Request) => {
        deleted.push(request.url);
        return true;
      }),
    };
    const cacheStorage = {
      keys: vi.fn(async () => ['app-v1']),
      open: vi.fn(async () => cache),
    } as unknown as CacheStorage;

    await clearChurchCacheStorage(cacheStorage);

    expect(deleted).toContain('https://x.test/rest/v1/prayers?select=*');
    expect(deleted).not.toContain('https://x.test/rest/v1/personal_prayers?select=*');
  });

  it('removes church keys from Capacitor Preferences and keeps native auth keys', async () => {
    const store = new Map<string, string>([
      ['prayers_cache', 'church'],
      ['personalPrayers_cache', 'keep'],
      ['prayerapp_native_auth_bridge', 'keep'],
      ['prayed_for_abc', 'church'],
      ['prayed_for_personal_xyz', 'keep'],
    ]);
    const preferences = {
      keys: async () => ({ keys: [...store.keys()] }),
      remove: async ({ key }: { key: string }) => {
        store.delete(key);
      },
    };

    await clearChurchPreferences(preferences);

    expect(store.has('prayers_cache')).toBe(false);
    expect(store.has('prayed_for_abc')).toBe(false);
    expect(store.get('personalPrayers_cache')).toBe('keep');
    expect(store.get('prayed_for_personal_xyz')).toBe('keep');
    expect(store.get('prayerapp_native_auth_bridge')).toBe('keep');
  });

  it('deletes only church-named IndexedDB databases', async () => {
    const deleted: string[] = [];
    const idb = {
      databases: vi.fn(async () => [
        { name: 'prayers_cache' },
        { name: 'groupPrayerCatalog_cache' },
      ]),
      deleteDatabase: vi.fn((name: string) => {
        deleted.push(name);
        return { onsuccess: null, onerror: null, onblocked: null };
      }),
    } as unknown as IDBFactory;

    await clearChurchIndexedDb(idb);

    expect(deleted).toEqual(['prayers_cache']);
  });

  it('clearChurchCacheStorageLayers runs all layer clears', async () => {
    const remove = vi.fn(async () => undefined);
    const preferences = {
      keys: async () => ({ keys: ['prayers_cache'] }),
      remove,
    };
    await clearChurchCacheStorageLayers({
      indexedDB: null,
      caches: null,
      preferences,
    });
    expect(remove).toHaveBeenCalledWith({ key: 'prayers_cache' });
  });
});
