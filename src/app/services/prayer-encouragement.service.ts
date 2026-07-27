import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, merge, of, timer } from 'rxjs';
import { distinctUntilChanged, filter, first, map, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import {
  UserSessionService,
} from './user-session.service';

const DEFAULT_COOLDOWN_HOURS = 4;
const FLAG_CACHE_KEY = 'prayer_encouragement_enabled';
const FLAG_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const COMMUNITY_COOLDOWN_PREFIX = 'prayed_for_';
const PERSONAL_COOLDOWN_PREFIX = 'prayed_for_personal_';

interface CachedFlag {
  value: boolean;
  cooldownHours: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PrayerEncouragementService {
  private enabledSubject = new BehaviorSubject<boolean>(false);
  private cooldownHoursSubject = new BehaviorSubject<number>(DEFAULT_COOLDOWN_HOURS);
  private cooldownRevisionSubject = new BehaviorSubject(0);
  readonly cooldownRevision$ = this.cooldownRevisionSubject.asObservable();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private supabase: SupabaseService,
    private userSessionService: UserSessionService
  ) {
    this.seedFromLocalStorage();
    // Wait for session so personal cooldown uses the user's setting, not the default.
    this.userSessionService.sessionInitialized$
      .pipe(filter((initialized) => initialized), first())
      .subscribe(() => {
        this.cleanExpiredCooldownKeys();
        this.bumpCooldownRevision();
      });
  }

  private bumpCooldownRevision(): void {
    this.cooldownRevisionSubject.next(this.cooldownRevisionSubject.value + 1);
  }

  /** Community-prayer cooldown duration in ms (admin setting). */
  private getCommunityCooldownMs(): number {
    const hours = this.cooldownHoursSubject.value;
    return hours * 60 * 60 * 1000;
  }

  private getPersonalCooldownMs(): number {
    const hours = this.userSessionService.getPersonalPrayerCooldownHours();
    return hours * 60 * 60 * 1000;
  }

  private getCooldownMs(personal: boolean): number {
    return personal ? this.getPersonalCooldownMs() : this.getCommunityCooldownMs();
  }

  /**
   * Remove expired prayed_for_* keys from localStorage to avoid buildup.
   * Runs once on service init.
   */
  private cleanExpiredCooldownKeys(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const personal = key.startsWith(PERSONAL_COOLDOWN_PREFIX);
        if (!personal && !key.startsWith(COMMUNITY_COOLDOWN_PREFIX)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const at = new Date(raw).getTime();
        const cooldownMs = this.getCooldownMs(personal);
        if (isNaN(at) || (Date.now() - at) >= cooldownMs) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  /**
   * Observable of the feature flag. Sourced from cache/localStorage first, then one Supabase read per TTL.
   */
  getPrayerEncouragementEnabled$(): Observable<boolean> {
    this.ensureLoaded();
    return this.enabledSubject.asObservable();
  }

  /** Observable of community cooldown hours (cached same as enabled flag). */
  getCooldownHours$(): Observable<number> {
    this.ensureLoaded();
    return this.cooldownHoursSubject.asObservable();
  }

  /** Cooldown hours for a card type: personal uses user setting; community uses admin setting. */
  getCooldownHoursForPrayer$(personal: boolean): Observable<number> {
    return personal
      ? this.userSessionService.getPersonalPrayerCooldownHours$()
      : this.getCooldownHours$();
  }

  getCooldownKey(prayerId: string): string {
    return `${COMMUNITY_COOLDOWN_PREFIX}${prayerId}`;
  }

  getPersonalCooldownKey(prayerId: string): string {
    return `${PERSONAL_COOLDOWN_PREFIX}${prayerId}`;
  }

  private resolveCooldownKey(prayerId: string, personal: boolean): string {
    return personal ? this.getPersonalCooldownKey(prayerId) : this.getCooldownKey(prayerId);
  }

  private isPersonalCooldownSettingReady(): boolean {
    return (
      this.userSessionService.isSessionInitialized() &&
      this.userSessionService.getCurrentSession()?.personalPrayerCooldownHours !==
        undefined
    );
  }

  private getCooldownRemainingMs(prayerId: string, personal: boolean): number | null {
    try {
      const key = this.resolveCooldownKey(prayerId, personal);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      if (personal && !this.isPersonalCooldownSettingReady()) {
        return null;
      }
      const at = new Date(raw).getTime();
      if (isNaN(at)) return null;
      const remaining = this.getCooldownMs(personal) - (Date.now() - at);
      return remaining > 0 ? remaining : null;
    } catch {
      return null;
    }
  }

  private emitCanPrayForWithExpiry(
    prayerId: string,
    personal: boolean
  ): Observable<boolean> {
    const canPray = this.canPrayFor(prayerId, personal);
    const remainingMs = this.getCooldownRemainingMs(prayerId, personal);
    if (canPray || remainingMs === null) {
      return of(canPray);
    }
    return merge(
      of(false),
      timer(remainingMs).pipe(
        map(() => {
          this.canPrayFor(prayerId, personal);
          this.bumpCooldownRevision();
          return true;
        })
      )
    );
  }

  /** Re-evaluates when session or cooldown localStorage changes (for OnPush templates). */
  getCanPrayFor$(prayerId: string, personal = false): Observable<boolean> {
    if (personal) {
      return combineLatest([
        this.cooldownRevision$,
        this.userSessionService.sessionInitialized$,
        this.userSessionService.getPersonalPrayerCooldownHours$(),
      ]).pipe(
        switchMap(() => this.emitCanPrayForWithExpiry(prayerId, personal)),
        distinctUntilChanged()
      );
    }
    return combineLatest([this.cooldownRevision$, this.getCooldownHours$()]).pipe(
      switchMap(() => this.emitCanPrayForWithExpiry(prayerId, personal)),
      distinctUntilChanged()
    );
  }

  /**
   * True if the user can click Pray For (no cooldown or cooldown expired).
   * Removes the key from localStorage when cooldown has expired to avoid buildup.
   */
  canPrayFor(prayerId: string, personal = false): boolean {
    try {
      const key = this.resolveCooldownKey(prayerId, personal);
      const raw = localStorage.getItem(key);
      if (!raw) return true;
      if (personal && !this.isPersonalCooldownSettingReady()) {
        return false;
      }
      const at = new Date(raw).getTime();
      if (isNaN(at)) {
        localStorage.removeItem(key);
        return true;
      }
      const expired = (Date.now() - at) >= this.getCooldownMs(personal);
      if (expired) {
        localStorage.removeItem(key);
        return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Record that the user clicked Pray For (starts cooldown per configured hours).
   */
  recordPrayedFor(prayerId: string, personal = false): void {
    try {
      localStorage.setItem(
        this.resolveCooldownKey(prayerId, personal),
        new Date().toISOString()
      );
      this.bumpCooldownRevision();
    } catch (e) {
      console.warn('[PrayerEncouragement] Failed to set cooldown', e);
    }
  }

  /** Remove cooldown for a prayer (e.g. when increment RPC fails after optimistic lock). */
  clearPrayedForCooldown(prayerId: string, personal = false): void {
    try {
      localStorage.removeItem(this.resolveCooldownKey(prayerId, personal));
      this.bumpCooldownRevision();
    } catch (e) {
      console.warn('[PrayerEncouragement] Failed to clear cooldown', e);
    }
  }

  /**
   * Remove all prayed_for_* cooldown keys from localStorage (e.g. on logout).
   */
  clearCooldownKeys(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key?.startsWith(COMMUNITY_COOLDOWN_PREFIX) ||
          key?.startsWith(PERSONAL_COOLDOWN_PREFIX)
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  /**
   * Invalidate cached flag (call after admin saves the toggle).
   */
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
          const hours = typeof parsed.cooldownHours === 'number' && parsed.cooldownHours >= 1 && parsed.cooldownHours <= 168
            ? parsed.cooldownHours
            : DEFAULT_COOLDOWN_HOURS;
          this.cooldownHoursSubject.next(hours);
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
      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select('prayer_encouragement_enabled, prayer_encouragement_cooldown_hours')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('[PrayerEncouragement] Failed to load flag', error);
        return;
      }

      const value = !!data?.prayer_encouragement_enabled;
      const rawHours = data?.prayer_encouragement_cooldown_hours;
      const cooldownHours = typeof rawHours === 'number' && rawHours >= 1 && rawHours <= 168
        ? rawHours
        : DEFAULT_COOLDOWN_HOURS;

      this.enabledSubject.next(value);
      this.cooldownHoursSubject.next(cooldownHours);
      this.loaded = true;

      try {
        localStorage.setItem(FLAG_CACHE_KEY, JSON.stringify({
          value,
          cooldownHours,
          timestamp: Date.now()
        } as CachedFlag));
      } catch {}
    } catch (e) {
      console.warn('[PrayerEncouragement] Error loading flag', e);
    } finally {
      this.loadPromise = null;
    }
  }
}
