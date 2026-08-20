import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import {
  badgeReadStateCacheKey,
  badgeReadStateNeedsUpsert,
  mergeBadgeReadStateSnapshots,
  normalizeBadgeReadPrayersData,
  normalizeBadgeReadPromptsData,
  type BadgeReadStateSnapshot,
} from '../lib/badge-read-merge';
import {
  getBadgeReadPrayersData,
  getBadgeReadPromptsData,
  setBadgeReadPrayersData,
  setBadgeReadPromptsData,
} from '../lib/badge-read-storage';
import type { BadgeReadPrayersData, BadgeReadPromptsData } from '../lib/badge-types';
import { CacheService } from './cache.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

const BADGE_READ_STATE_CACHE_TTL_MS = 20 * 60 * 1000;
const PERSIST_DEBOUNCE_MS = 400;

interface CachedBadgeReadState extends BadgeReadStateSnapshot {
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class BadgeReadStateService {
  private syncedEmail: string | null = null;
  private readonly syncedEmailSubject = new BehaviorSubject<string | null>(null);
  readonly syncedEmail$ = this.syncedEmailSubject.asObservable();

  private syncInFlight: Promise<void> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persistInFlight: Promise<void> | null = null;
  private pendingPersistEmail: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private cache: CacheService,
    private userSessionService: UserSessionService
  ) {
    this.userSessionService.userSession$
      .pipe(distinctUntilChanged((prev, curr) => prev?.email === curr?.email))
      .subscribe((session) => {
        if (!session?.email) {
          this.invalidate();
          return;
        }
        void this.syncForCurrentUser();
      });
  }

  isSyncedForEmail(email: string | null | undefined): boolean {
    if (!email) {
      return false;
    }
    return this.syncedEmail === email.toLowerCase().trim();
  }

  /** True when read-state can be shown (logged out = local only; logged in = after sync). */
  isReadyForReads(): boolean {
    const email = this.userSessionService.getUserEmail();
    if (!email) {
      return true;
    }
    return this.isSyncedForEmail(email);
  }

  getReadPrayersData(): BadgeReadPrayersData {
    return getBadgeReadPrayersData();
  }

  getReadPromptsData(): BadgeReadPromptsData {
    return getBadgeReadPromptsData();
  }

  setReadPrayersData(data: BadgeReadPrayersData): void {
    setBadgeReadPrayersData(data);
    this.schedulePersist();
  }

  setReadPromptsData(data: BadgeReadPromptsData): void {
    setBadgeReadPromptsData(data);
    this.schedulePersist();
  }

  async syncForCurrentUser(): Promise<void> {
    const userEmail = await this.userSessionService.resolveUserEmail();
    if (!userEmail) {
      this.invalidate();
      return;
    }

    const normalizedEmail = userEmail.toLowerCase().trim();

    if (this.syncedEmail === normalizedEmail) {
      return;
    }

    if (this.syncInFlight) {
      await this.syncInFlight;
      if (this.syncedEmail === normalizedEmail) {
        return;
      }
    }

    this.syncInFlight = this.loadAndMergeForEmail(normalizedEmail);
    try {
      await this.syncInFlight;
    } finally {
      this.syncInFlight = null;
    }
  }

  schedulePersist(): void {
    void this.userSessionService.resolveUserEmail().then((email) => {
      if (!email) {
        return;
      }
      this.pendingPersistEmail = email.toLowerCase().trim();
      if (this.persistTimer) {
        clearTimeout(this.persistTimer);
      }
      this.persistTimer = setTimeout(() => {
        this.persistTimer = null;
        void this.flushPersist();
      }, PERSIST_DEBOUNCE_MS);
    });
  }

  async flushBeforeLogout(logoutEmail?: string | null): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }

    if (logoutEmail) {
      this.pendingPersistEmail = logoutEmail.toLowerCase().trim();
    } else if (!this.pendingPersistEmail) {
      const email = await this.userSessionService.resolveUserEmail();
      if (email) {
        this.pendingPersistEmail = email.toLowerCase().trim();
      }
    }

    await this.flushPersist();
  }

  invalidate(): void {
    this.syncedEmail = null;
    this.syncedEmailSubject.next(null);
    this.pendingPersistEmail = null;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
  }

  invalidateForEmail(email: string): void {
    const normalized = email.toLowerCase().trim();
    this.cache.invalidate(badgeReadStateCacheKey(normalized));
    if (this.syncedEmail === normalized) {
      this.syncedEmail = null;
      this.syncedEmailSubject.next(null);
    }
  }

  private getLocalSnapshot(): BadgeReadStateSnapshot {
    return {
      prayersData: getBadgeReadPrayersData(),
      promptsData: getBadgeReadPromptsData(),
    };
  }

  private hydrateLocal(snapshot: BadgeReadStateSnapshot, email: string): void {
    setBadgeReadPrayersData(snapshot.prayersData);
    setBadgeReadPromptsData(snapshot.promptsData);
    this.cache.set<CachedBadgeReadState>(
      badgeReadStateCacheKey(email),
      {
        email,
        prayersData: snapshot.prayersData,
        promptsData: snapshot.promptsData,
      },
      BADGE_READ_STATE_CACHE_TTL_MS
    );
    this.syncedEmail = email;
    this.syncedEmailSubject.next(email);
  }

  private async loadAndMergeForEmail(normalizedEmail: string): Promise<void> {
    const loadForEmail = normalizedEmail;
    const cached = this.cache.get<CachedBadgeReadState>(
      badgeReadStateCacheKey(loadForEmail)
    );

    if (cached?.email === loadForEmail) {
      const remoteSnapshot: BadgeReadStateSnapshot = {
        prayersData: cached.prayersData,
        promptsData: cached.promptsData,
      };
      const merged = mergeBadgeReadStateSnapshots(
        this.getLocalSnapshot(),
        remoteSnapshot
      );
      this.hydrateLocal(merged, loadForEmail);

      if (badgeReadStateNeedsUpsert(merged, remoteSnapshot)) {
        await this.persistSnapshot(loadForEmail, merged);
      }
      return;
    }

    try {
      const { data, error } = await this.supabase.client
        .from('user_badge_read_state')
        .select('prayers_data, prompts_data')
        .ilike('user_email', loadForEmail)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const currentEmail = await this.userSessionService.resolveUserEmail();
      if (
        !currentEmail ||
        currentEmail.toLowerCase().trim() !== loadForEmail
      ) {
        return;
      }

      const remoteSnapshot: BadgeReadStateSnapshot = {
        prayersData: normalizeBadgeReadPrayersData(data?.prayers_data),
        promptsData: normalizeBadgeReadPromptsData(data?.prompts_data),
      };

      const merged = mergeBadgeReadStateSnapshots(
        this.getLocalSnapshot(),
        remoteSnapshot
      );
      this.hydrateLocal(merged, loadForEmail);

      if (!data || badgeReadStateNeedsUpsert(merged, remoteSnapshot)) {
        await this.persistSnapshot(loadForEmail, merged);
      }
    } catch (err) {
      console.error('[BadgeReadStateService] Failed to sync badge read state:', err);

      const currentEmail = await this.userSessionService.resolveUserEmail();
      if (
        !currentEmail ||
        currentEmail.toLowerCase().trim() !== loadForEmail
      ) {
        return;
      }

      if (cached?.email === loadForEmail) {
        this.hydrateLocal(
          mergeBadgeReadStateSnapshots(this.getLocalSnapshot(), cached),
          loadForEmail
        );
        return;
      }
      this.hydrateLocal(this.getLocalSnapshot(), loadForEmail);
    }
  }

  private async flushPersist(): Promise<void> {
    if (this.persistInFlight) {
      await this.persistInFlight;
    }

    const email = this.pendingPersistEmail;
    if (!email || this.persistInFlight) {
      return;
    }

    this.persistInFlight = this.persistSnapshot(email, this.getLocalSnapshot());
    try {
      await this.persistInFlight;
    } finally {
      this.persistInFlight = null;
    }
  }

  private async persistSnapshot(
    email: string,
    snapshot: BadgeReadStateSnapshot
  ): Promise<void> {
    const persistForEmail = email.toLowerCase().trim();

    try {
      const { error } = await this.supabase.client.rpc('upsert_user_badge_read_state', {
        p_user_email: persistForEmail,
        p_prayers_data: snapshot.prayersData,
        p_prompts_data: snapshot.promptsData,
      });

      if (error) {
        throw error;
      }

      const currentEmail = await this.userSessionService.resolveUserEmail();
      if (
        !currentEmail ||
        currentEmail.toLowerCase().trim() !== persistForEmail
      ) {
        return;
      }

      this.cache.set<CachedBadgeReadState>(
        badgeReadStateCacheKey(persistForEmail),
        {
          email: persistForEmail,
          prayersData: snapshot.prayersData,
          promptsData: snapshot.promptsData,
        },
        BADGE_READ_STATE_CACHE_TTL_MS
      );
    } catch (err) {
      console.error('[BadgeReadStateService] Failed to persist badge read state:', err);
    }
  }
}
