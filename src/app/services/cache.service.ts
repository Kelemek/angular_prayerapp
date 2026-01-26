import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, shareReplay, catchError } from 'rxjs/operators';

/**
 * Cache configuration for different data types
 */
export interface CacheConfig {
  key: string;
  ttl: number; // Time to live in milliseconds
}

/**
 * Cached data structure
 */
interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * CacheService provides in-memory and localStorage caching with TTL support.
 * 
 * Features:
 * - In-memory cache for fast access
 * - LocalStorage for persistent cache
 * - TTL (Time-To-Live) for automatic cache invalidation
 * - Observable caching with RxJS shareReplay
 * - Cache invalidation on mutations
 * 
 * Default TTL values (Tier 1 optimizations):
 * - Prayers: 20 minutes (cache-first to reduce DB hits)
 * - Personal Prayers: 20 minutes (only change when user adds)
 * - Prompts: 1 hour (rarely change)
 * - Prayer Types: 1 hour (rarely change)
 * - Admin Settings: 1 hour (rarely change)
 * - Email Settings: 1 hour (rarely change)
 * - Analytics: 15 minutes (safe to cache for longer)
 */
@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private inMemoryCache = new Map<string, CachedData<any>>();
  private observableCache = new Map<string, Observable<any>>();
  private localStorageEnabled = this.isLocalStorageAvailable();

  // Default cache configurations (in milliseconds)
  // Tier 1: Cache-first approach with extended TTLs to reduce database queries
  private cacheConfigs: Map<string, CacheConfig> = new Map([
    ['prayers', { key: 'prayers_cache', ttl: 20 * 60 * 1000 }],        // 20 min (was 5)
    ['updates', { key: 'updates_cache', ttl: 20 * 60 * 1000 }],        // 20 min (was 5)
    ['personalPrayers', { key: 'personalPrayers_cache', ttl: 20 * 60 * 1000 }],  // 20 min (was 5)
    ['planningCenterListData', { key: 'planningCenterListData_cache', ttl: 30 * 60 * 1000 }],  // 30 min (dynamic key with listId)
    ['prompts', { key: 'prompts_cache', ttl: 60 * 60 * 1000 }],        // 1 hour (was 10 min)
    ['prayerTypes', { key: 'prayerTypes_cache', ttl: 60 * 60 * 1000 }],  // 1 hour (was 10 min)
    ['adminSettings', { key: 'adminSettings_cache', ttl: 60 * 60 * 1000 }],  // 1 hour (was 15 min)
    ['emailSettings', { key: 'emailSettings_cache', ttl: 60 * 60 * 1000 }],  // 1 hour (was 15 min)
    ['analytics', { key: 'analytics_cache', ttl: 15 * 60 * 1000 }]     // 15 min (was 5)
  ]);

  constructor() {
    this.initializeFromLocalStorage();
  }

  /**
   * Initialize in-memory cache from localStorage
   */
  private initializeFromLocalStorage(): void {
    if (!this.localStorageEnabled) return;

    try {
      for (const [, config] of this.cacheConfigs) {
        const cached = localStorage.getItem(config.key);
        if (cached) {
          const parsed = JSON.parse(cached) as CachedData<any>;
          this.inMemoryCache.set(config.key, parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to initialize cache from localStorage:', error);
    }
  }

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    const configKey = key.split('_')[0];
    const config = this.cacheConfigs.get(configKey);
    const storageKey = config?.key || key;

    const cached = this.inMemoryCache.get(storageKey);

    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (this.isExpired(cached)) {
      this.inMemoryCache.delete(storageKey);
      if (this.localStorageEnabled) {
        localStorage.removeItem(storageKey);
      }
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set cached data with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const configKey = key.split('_')[0];
    const config = this.cacheConfigs.get(configKey);
    const storageKey = config?.key || key;
    const finalTtl = ttl || config?.ttl || 5 * 60 * 1000;

    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      ttl: finalTtl
    };

    this.inMemoryCache.set(storageKey, cached);

    // Persist to localStorage if available
    if (this.localStorageEnabled) {
      try {
        console.log('[CacheService] Setting cache for', storageKey, 'with', Array.isArray(data) ? data.length + ' items' : 'data');
        localStorage.setItem(storageKey, JSON.stringify(cached));
      } catch (error) {
        console.warn('Failed to persist cache to localStorage:', error);
      }
    }
  }

  /**
   * Cache an Observable and return cached value on subsequent calls
   */
  cacheObservable<T>(
    key: string,
    source$: Observable<T>,
    ttl?: number
  ): Observable<T> {
    // Return cached observable if available and not expired
    const cached = this.observableCache.get(key);
    if (cached) {
      const data = this.get<T>(key);
      if (data !== null) {
        return of(data);
      }
    }

    // Cache the observable with shareReplay for multiple subscribers
    const cached$ = source$.pipe(
      tap(data => this.set(key, data, ttl)),
      shareReplay(1)
    );

    this.observableCache.set(key, cached$);
    return cached$;
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key: string): void {
    this.inMemoryCache.delete(key);
    this.observableCache.delete(key);

    if (this.localStorageEnabled) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Failed to remove cache from localStorage:', error);
      }
    }
  }

  /**
   * Invalidate all caches
   */
  invalidateAll(): void {
    this.inMemoryCache.clear();
    this.observableCache.clear();

    if (this.localStorageEnabled) {
      try {
        for (const [, config] of this.cacheConfigs) {
          localStorage.removeItem(config.key);
        }
      } catch (error) {
        console.warn('Failed to clear localStorage cache:', error);
      }
    }
  }

  /**
   * Invalidate cache by category
   */
  invalidateCategory(category: string): void {
    const keysToInvalidate: string[] = [];

    this.inMemoryCache.forEach((_, key) => {
      if (key.startsWith(category)) {
        keysToInvalidate.push(key);
      }
    });

    keysToInvalidate.forEach(key => this.invalidate(key));
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): {
    inMemoryCount: number;
    localStorageCount: number;
    details: Array<{ key: string; size: string; expired: boolean }>;
  } {
    const details: Array<{ key: string; size: string; expired: boolean }> = [];

    this.inMemoryCache.forEach((cached, key) => {
      const size = JSON.stringify(cached.data).length;
      const sizeStr = this.formatBytes(size);
      details.push({
        key,
        size: sizeStr,
        expired: this.isExpired(cached)
      });
    });

    return {
      inMemoryCount: this.inMemoryCache.size,
      localStorageCount: this.localStorageEnabled ? localStorage.length : 0,
      details
    };
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(cached: CachedData<any>): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  /**
   * Check if localStorage is available
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
