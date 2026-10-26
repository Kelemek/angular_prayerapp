import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import type { MemorizationReciteSettings } from '../types/memorization';
import { SupabaseService } from './supabase.service';

const CACHE_KEY = 'memorization_recite_enabled';
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedFlag {
  value: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class MemorizationReciteSettingsService {
  private settingsSubject = new BehaviorSubject<MemorizationReciteSettings>({ enabled: false });
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private supabase: SupabaseService
  ) {
    this.seedFromLocalStorage();
  }

  getReciteEnabled$(): Observable<boolean> {
    this.ensureLoaded();
    return this.settingsSubject.pipe(map((s) => s.enabled));
  }

  getSettings$(): Observable<MemorizationReciteSettings> {
    this.ensureLoaded();
    return this.settingsSubject.asObservable();
  }

  async getSettings(): Promise<MemorizationReciteSettings> {
    await this.ensureLoadedAsync();
    return this.settingsSubject.value;
  }

  /** Always reads `admin_settings` (used when opening practice so stale cache cannot hide Recite). */
  async getSettingsFromServer(): Promise<MemorizationReciteSettings> {
    await this.reloadFromSupabase();
    return this.settingsSubject.value;
  }

  invalidateCache(): void {
    this.loaded = false;
    this.loadPromise = null;
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
    this.ensureLoaded();
  }

  private seedFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed: CachedFlag = JSON.parse(raw);
      if (typeof parsed.value === 'boolean' && typeof parsed.timestamp === 'number') {
        // Only seed enabled=true from cache. A stale cached false hides Recite in browsers
        // that have not refetched since the admin toggle (common in Safari/Firefox).
        if (parsed.value && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          this.settingsSubject.next({ enabled: true });
        }
      }
    } catch {
      // ignore
    }
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    if (this.loadPromise) return;
    this.loadPromise = this.reloadFromSupabase().finally(() => {
      this.loadPromise = null;
    });
  }

  private async ensureLoadedAsync(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }
    this.loadPromise = this.reloadFromSupabase().finally(() => {
      this.loadPromise = null;
    });
    await this.loadPromise;
  }

  private async reloadFromSupabase(): Promise<void> {
    const enabled = await this.fetchEnabledFromServer();
    if (enabled === null) {
      // Do not trust a stale localStorage seed when the server flag cannot be read.
      this.settingsSubject.next({ enabled: false });
      this.loaded = true;
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        // ignore
      }
      return;
    }

    this.settingsSubject.next({ enabled });
    this.loaded = true;

    if (enabled) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ value: true, timestamp: Date.now() } satisfies CachedFlag)
        );
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        // ignore
      }
    }
  }

  private async fetchEnabledFromServer(): Promise<boolean | null> {
    try {
      const { data, error } = await this.supabase.directQuery<
        { memorization_recite_enabled: boolean }[]
      >('admin_settings', {
        select: 'memorization_recite_enabled',
        eq: { id: 1 },
        limit: 1,
      });

      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) return !!row.memorization_recite_enabled;
      }

      if (error) {
        console.warn('[MemorizationReciteSettings] directQuery failed, retrying client', error);
      }

      const { data: clientData, error: clientError } = await (await this.supabase.db())
        .from('admin_settings')
        .select('memorization_recite_enabled')
        .eq('id', 1)
        .maybeSingle();

      if (clientError) {
        console.warn('[MemorizationReciteSettings] Failed to load flag', clientError);
        return null;
      }

      return !!clientData?.memorization_recite_enabled;
    } catch (e) {
      console.warn('[MemorizationReciteSettings] Error loading flag', e);
      return null;
    }
  }
}
