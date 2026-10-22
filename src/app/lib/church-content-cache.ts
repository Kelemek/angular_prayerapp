import { Capacitor } from '@capacitor/core';
import { PRESENTATION_SETTINGS_STORAGE_KEY } from '../services/presentation-settings.service';
import {
  CHURCH_CACHE_KEEP_KEYS,
  CHURCH_CACHE_SERVICE_KEYS,
  CHURCH_LOCAL_STORAGE_KEYS,
  isChurchContentStorageKey,
} from './church-content-cache-keys';
import {
  clearChurchCacheStorageLayers,
  type PreferencesApi,
} from './church-content-cache-layers';

export { CHURCH_CACHE_KEEP_KEYS, CHURCH_CACHE_SERVICE_KEYS };

export type ChurchCacheStore = {
  invalidate(key: string): void;
};

export type ClearChurchContentDeps = {
  preferences?: PreferencesApi | null;
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

async function resolvePreferences(
  deps?: ClearChurchContentDeps,
): Promise<PreferencesApi | null> {
  if (deps && 'preferences' in deps) {
    return deps.preferences ?? null;
  }
  try {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }
    if (!Capacitor.isPluginAvailable('Preferences')) {
      return null;
    }
    // Deferred so web startup does not require the native plugin.
    const { Preferences } = await import('@capacitor/preferences');
    return Preferences;
  } catch {
    return null;
  }
}

/** Drop church-tied cache. Keep Personal, Memorize, Groups, and the user session. */
export function clearChurchContentStorage(
  cache: ChurchCacheStore,
  deps?: ClearChurchContentDeps,
): { layers: Promise<void> } {
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
      if (key && isChurchContentStorageKey(key)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }

  const layers = (async () => {
    try {
      const preferences = await resolvePreferences(deps);
      await clearChurchCacheStorageLayers({ preferences });
    } catch {
      /* a hung plugin must not reject downgrade */
    }
  })();

  return { layers };
}
