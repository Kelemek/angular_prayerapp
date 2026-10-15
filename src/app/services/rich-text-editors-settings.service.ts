import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

const FLAG_CACHE_KEY = 'rich_text_editors_enabled';
const FLAG_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedFlag {
  value: boolean;
  timestamp: number;
}

/**
 * Reads `admin_settings.rich_text_editors_enabled` (row id=1) for user-facing
 * prayer/update forms. Cached in memory + localStorage with TTL; call
 * `invalidateFlagCache()` after admin saves the toggle.
 */
@Injectable({
  providedIn: 'root',
})
export class RichTextEditorsSettingsService {
  private enabledSubject = new BehaviorSubject<boolean>(true);
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(private supabase: SupabaseService) {
    this.seedFromLocalStorage();
  }

  getRichTextEditorsEnabled$(): Observable<boolean> {
    this.ensureLoaded();
    return this.enabledSubject.asObservable();
  }

  /** Current value without waiting for network (default true until fetch completes). */
  getSnapshot(): boolean {
    return this.enabledSubject.value;
  }

  invalidateFlagCache(): void {
    this.loaded = false;
    this.loadPromise = null;
    try {
      localStorage.removeItem(FLAG_CACHE_KEY);
    } catch {}
    this.ensureLoaded();
  }

  private seedFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(FLAG_CACHE_KEY);
      if (!raw) return;
      const parsed: CachedFlag = JSON.parse(raw);
      if (typeof parsed.value === 'boolean' && typeof parsed.timestamp === 'number') {
        if (Date.now() - parsed.timestamp < FLAG_CACHE_TTL_MS) {
          this.enabledSubject.next(parsed.value);
        }
      }
    } catch {}
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    if (this.loadPromise) return;
    this.loadPromise = this.fetchAndCacheFlag();
  }

  private async fetchAndCacheFlag(): Promise<void> {
    try {
      const { data, error } = await (await this.supabase.db())
        .from('admin_settings')
        .select('rich_text_editors_enabled')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('[RichTextEditorsSettings] Failed to load flag', error);
        return;
      }

      const value = data?.rich_text_editors_enabled !== false;
      this.enabledSubject.next(value);
      this.loaded = true;

      try {
        localStorage.setItem(
          FLAG_CACHE_KEY,
          JSON.stringify({ value, timestamp: Date.now() } satisfies CachedFlag)
        );
      } catch {}
    } catch (e) {
      console.warn('[RichTextEditorsSettings] Error loading flag', e);
    } finally {
      this.loadPromise = null;
    }
  }
}
