import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PlanningCenterRestService } from './planning-center-rest.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

export interface PlanningCenterListMember {
  id: string;
  name: string;
  avatar?: string | null;
}

interface PlanningCenterListCache {
  email: string;
  listId: string | null;
  listName?: string | null;
  members: PlanningCenterListMember[];
}

interface StoredPlanningCenterListCache {
  data: PlanningCenterListCache;
  timestamp: number;
  ttl: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_KEY_PREFIX = 'prayerapp_planning_center_list_';
const LEGACY_CACHE_KEY = 'planningCenterListData_cache';

@Injectable({
  providedIn: 'root'
})
export class PlanningCenterListService {
  private readonly listIdSubject = new BehaviorSubject<string | null>(null);
  private readonly membersSubject = new BehaviorSubject<PlanningCenterListMember[]>([]);
  private readonly listNameSubject = new BehaviorSubject<string | null>(null);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  readonly listId$ = this.listIdSubject.asObservable();
  readonly members$ = this.membersSubject.asObservable();
  readonly listName$ = this.listNameSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  private loadInFlight: Promise<void> | null = null;
  private loadedEmail: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private userSessionService: UserSessionService,
    private planningCenterRest: PlanningCenterRestService
  ) {
    const email = this.resolveEmail();
    if (email) {
      void this.loadForUser(email);
    }
  }

  getCurrentListId(): string | null {
    return this.listIdSubject.value;
  }

  getCurrentMembers(): PlanningCenterListMember[] {
    return this.membersSubject.value;
  }

  getCurrentListName(): string | null {
    return this.listNameSubject.value;
  }

  loadForCurrentUser(forceReload = false): Promise<void> {
    const email = this.resolveEmail();
    if (!email) {
      this.clearState();
      return Promise.resolve();
    }
    return this.loadForUser(email, forceReload);
  }

  async loadForUser(email: string, forceReload = false): Promise<void> {
    const normalized = this.normalizeEmail(email);
    if (!normalized) {
      this.clearState();
      return;
    }

    if (this.loadInFlight && this.loadedEmail === normalized && !forceReload) {
      return this.loadInFlight;
    }

    this.loadedEmail = normalized;
    this.hydrateFromCache(normalized);

    this.loadInFlight = this.refreshFromServer(normalized, forceReload).finally(() => {
      this.loadInFlight = null;
    });

    return this.loadInFlight;
  }

  invalidateForUser(email: string | null | undefined): void {
    const normalized = email ? this.normalizeEmail(email) : '';
    if (!normalized) {
      return;
    }
    try {
      localStorage.removeItem(this.cacheStorageKey(normalized));
    } catch {
      // ignore
    }
    if (this.loadedEmail === normalized) {
      this.clearState();
    }
  }

  private resolveEmail(): string | null {
    const sessionEmail = this.userSessionService.getCurrentSession()?.email;
    if (sessionEmail?.trim()) {
      return sessionEmail.trim();
    }
    try {
      const raw = localStorage.getItem('userSession');
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as { email?: string };
      return parsed?.email?.trim() || null;
    } catch {
      return null;
    }
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private cacheStorageKey(normalizedEmail: string): string {
    return `${CACHE_KEY_PREFIX}${normalizedEmail}`;
  }

  /** True when this email is still the active load (not superseded by another account). */
  private isActiveLoad(normalizedEmail: string): boolean {
    return this.loadedEmail === normalizedEmail;
  }

  private hydrateFromCache(normalizedEmail: string): void {
    if (!this.isActiveLoad(normalizedEmail)) {
      return;
    }

    const cached = this.readCache(normalizedEmail);
    if (!cached) {
      return;
    }

    this.listIdSubject.next(cached.listId);
    this.membersSubject.next(cached.members ?? []);
    this.listNameSubject.next(cached.listName ?? null);
  }

  private readCache(normalizedEmail: string): PlanningCenterListCache | null {
    const fromUserKey = this.readStoredCache(this.cacheStorageKey(normalizedEmail), normalizedEmail);
    if (fromUserKey) {
      return fromUserKey;
    }
    return this.readLegacyCache(normalizedEmail);
  }

  private readStoredCache(storageKey: string, normalizedEmail: string): PlanningCenterListCache | null {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as StoredPlanningCenterListCache;
      if (!parsed?.data || parsed.data.email !== normalizedEmail) {
        return null;
      }
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  /** One-time migration from shared CacheService key (members only; list id from DB refresh). */
  private readLegacyCache(normalizedEmail: string): PlanningCenterListCache | null {
    try {
      const raw = localStorage.getItem(LEGACY_CACHE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as { data?: { members?: PlanningCenterListMember[]; listName?: string }; timestamp?: number; ttl?: number };
      const legacy = parsed?.data;
      if (!legacy?.members?.length) {
        return null;
      }
      const ttl = parsed.ttl ?? CACHE_TTL_MS;
      const ts = parsed.timestamp ?? 0;
      if (Date.now() - ts > ttl) {
        return null;
      }
      const migrated: PlanningCenterListCache = {
        email: normalizedEmail,
        listId: null,
        listName: legacy.listName ?? null,
        members: legacy.members
      };
      return migrated;
    } catch {
      return null;
    }
  }

  private writeCache(normalizedEmail: string, data: PlanningCenterListCache): void {
    const stored: StoredPlanningCenterListCache = {
      data: { ...data, email: normalizedEmail },
      timestamp: Date.now(),
      ttl: CACHE_TTL_MS
    };
    try {
      localStorage.setItem(this.cacheStorageKey(normalizedEmail), JSON.stringify(stored));
    } catch (err) {
      console.warn('[PlanningCenterListService] Failed to persist cache:', err);
    }
  }

  private clearState(): void {
    this.listIdSubject.next(null);
    this.membersSubject.next([]);
    this.listNameSubject.next(null);
    this.loadingSubject.next(false);
    this.loadedEmail = null;
  }

  private async refreshFromServer(normalizedEmail: string, forceReload: boolean): Promise<void> {
    if (this.isActiveLoad(normalizedEmail)) {
      this.loadingSubject.next(true);
    }

    try {
      const { data, error } = await (await this.supabase.db())
        .from('email_subscribers')
        .select('planning_center_list_id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!this.isActiveLoad(normalizedEmail)) {
        return;
      }

      if (error) {
        console.error('[PlanningCenterListService] Error fetching list id:', error);
        return;
      }

      const listId = data?.planning_center_list_id ?? null;

      if (!listId) {
        this.listIdSubject.next(null);
        this.membersSubject.next([]);
        this.listNameSubject.next(null);
        this.writeCache(normalizedEmail, {
          email: normalizedEmail,
          listId: null,
          members: [],
          listName: null
        });
        return;
      }

      const previousListId = this.listIdSubject.value;
      const cached = this.readCache(normalizedEmail);
      const listIdChanged = previousListId !== listId && cached?.listId !== listId;

      // Home uses combineLatest(listId$, members$). Emitting a new list id while members
      // still belong to the previous list would trigger member-prayer loads with wrong IDs.
      if (previousListId !== listId) {
        this.membersSubject.next([]);
        this.listNameSubject.next(null);
      }

      this.listIdSubject.next(listId);

      const canSkipApi =
        !forceReload &&
        !listIdChanged &&
        cached != null &&
        cached.listId === listId &&
        cached.members.length > 0;

      if (canSkipApi && cached) {
        this.membersSubject.next(cached.members);
        this.listNameSubject.next(cached.listName ?? null);
        return;
      }

      const result = await this.planningCenterRest.fetchListMembers(listId);

      if (!this.isActiveLoad(normalizedEmail)) {
        return;
      }

      if (result.error) {
        console.error('[PlanningCenterListService] Error fetching members:', result.error);
        this.membersSubject.next([]);
        this.listNameSubject.next(null);
        this.writeCache(normalizedEmail, {
          email: normalizedEmail,
          listId,
          listName: null,
          members: []
        });
        return;
      }

      const members = result.members ?? [];
      this.membersSubject.next(members);

      this.writeCache(normalizedEmail, {
        email: normalizedEmail,
        listId,
        listName: this.listNameSubject.value,
        members
      });
    } catch (err) {
      console.error('[PlanningCenterListService] Error loading list data:', err);
    } finally {
      if (this.isActiveLoad(normalizedEmail)) {
        this.loadingSubject.next(false);
      }
    }
  }
}
