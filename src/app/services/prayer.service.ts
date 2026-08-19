import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, type Subscription } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { EmailNotificationService } from './email-notification.service';
import { VerificationService } from './verification.service';
import { CacheService } from './cache.service';
import { BadgeService } from './badge.service';
import { UserSessionService } from './user-session.service';
import { PrayerItemReminderService } from './prayer-item-reminder.service';
import { resolvePrayerUpdateContent } from '../lib/prayer-update-content';
import { personalCategoryNamesFromPrayers } from '../lib/personal-category-order';
import {
  COMMUNITY_PRAYERS_WITH_UPDATES_SELECT,
  formatApprovedCommunityPrayersFromDb,
  formatPrayersByMonthFromDb,
  prayersByMonthIsoRange,
  prayersByMonthOrFilter,
} from '../lib/prayer-community-load';
import {
  COMMUNITY_PRAYERS_CACHE_KEY,
  PERSONAL_PRAYERS_CACHE_KEY,
  applyCachedPersonalPrayersSnapshot,
  applyCommunityPrayersCacheSnapshot,
  applyCommunityLoadErrorPlan,
  applyPersonalPrayerLoadCacheFallbackPlan,
  publishCommunityPrayersFromDb,
  publishPersonalPrayersFromDb,
  planCommunityLoadErrorFallback,
  planPersonalPrayerLoadCacheFallback,
  shouldShowCommunityLoadingIndicator,
  shouldSkipCommunityPrayersDbOnSilentRefresh,
  type PersonalPrayersCacheSnapshotActions,
} from '../lib/prayer-catalog-load';
import {
  buildCommunityPrayerInsertRow,
  buildCommunityPrayerAdminNotificationPayload,
  buildCommunityPrayerStatusUpdatePayload,
  afterCommunityPendingUpdateInserted,
  buildPendingCommunityUpdateInsertRow,
  buildSimplePendingUpdateInsertRow,
  ensureEmailSubscriberForPrayerSubmit,
  patchCommunityPrayerStatus,
  applyCommunityPrayerDeleteSnapshot,
  shouldDropCommunityReminderForStatus,
} from '../lib/prayer-community-mutations';
import {
  buildPrayerDeletionRequestRow,
  buildUpdateDeletionRequestRow,
  notifyPrayerDeletionRequestSubmitted,
  notifyUpdateDeletionRequestSubmitted,
} from '../lib/prayer-community-deletion-requests';
import {
  applyPrayerCatalogFilters,
  filterPrayerRequestsByStatusAndSearch,
} from '../lib/prayer-filter';
import {
  validatePersonalCategoryRename,
  type PersonalPrayerDisplayOrderUpdate,
  type CategoryDisplayOrderRange,
} from '../lib/prayer-personal-category';
import {
  fetchPersonalCategoryPrayerCountWithDb,
  resolvePersonalCategoryRangeWithDb,
} from '../lib/prayer-personal-category-query-db';
import {
  applyPersonalCategoryRenameSnapshot,
  orchestratePersonalCategoryReorder,
  orchestratePersonalCategorySwap,
  orchestratePersonalPrayerOrderUpdate,
  type PersonalCategoryOrchestrationDeps,
} from '../lib/prayer-personal-category-orchestrate';
import { planPersonalPrayerAdd, type PersonalCategoryDeps } from '../lib/prayer-personal-add-plan';
import { resolvePersonalPrayerCategoryChangeDisplayOrder } from '../lib/prayer-personal-update-category-plan';
import {
  isPersonalPrayerDisplayOrderOnlyChange as isPersonalPrayerDisplayOrderOnlyDbChange,
  normalizePersonalPrayerCache as normalizePersonalPrayerCacheRows,
  personalPrayerRowToPrayerRequest,
  PERSONAL_PRAYERS_LIST_SELECT,
  PRAYER_PERSONAL_UNCATEGORIZED_MAX,
  sanitizePersonalPrayerCategory,
  withPersonalPrayerUserEmail as withPersonalPrayerUserEmailRow,
} from '../lib/prayer-personal-display';
import {
  appendPersonalPrayerUpdate,
  applyPersonalPrayerFieldUpdate,
  buildPersonalPrayerDbUpdatePayload,
  buildPersonalPrayerInsertRow,
  buildPersonalPrayerUpdateInsertRow,
  mapDbPersonalPrayerUpdateRow,
  markPersonalPrayerUpdateAnsweredPatch,
  personalPrayerRequestFromInsertedRow,
  patchPersonalPrayerUpdateLocally,
  personalPrayerUpdatePatchWithTimestamp,
  personalPrayerListAfterInsert,
  removePersonalPrayerById,
  removePersonalPrayerUpdateById,
} from '../lib/prayer-personal-mutations';
import {
  buildPersonalPrayerDisplayOrderDbPayload,
  runPersonalPrayerDisplayOrderBatchUpdates,
} from '../lib/prayer-personal-display-order';
import { buildClearPersonalPrayerAnsweredFlagsPayload } from '../lib/prayer-personal-update';
import {
  personalPrayerUpdateClearsAnsweredFlags,
  shouldDropPersonalPrayerRemindersAfterUpdate,
  startPersonalPrayerUpdatePlan,
} from '../lib/prayer-personal-update-plan';
import {
  hasPersonalCategoryRenameTargets,
  matchingPersonalPrayerIdsForCategoryRename,
  personalCategoryRenameDbPayload,
} from '../lib/prayer-personal-rename';
import {
  answeredPersonalPrayerIds,
  arePrayerCatalogsReadyFromFlags,
  personalPrayersFromDbRows,
} from '../lib/prayer-personal-load';
import { extractSupabaseErrorMessage } from '../lib/prayer-error-message';
import {
  MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY,
  memberPrayedForCountsFromRows,
  writeMemberPrayedForCountToCache,
} from '../lib/prayer-member-pray-for';
import {
  MEMBER_PRAYER_UPDATES_CACHE_KEY,
  buildMemberPrayerUpdateInsertRow,
  buildMemberPrayerUpdatePatch,
  groupMemberPrayerUpdatesByPersonId,
  mapMemberPrayerUpdateRow,
  memberPrayerCacheKeysToInvalidate,
  memberUpdatesCacheForPerson,
  planningCenterListDataCacheKey,
  trimMemberPersonId,
  writeMemberUpdatesCacheForPerson,
} from '../lib/prayer-member-updates';
import {
  MEMBER_PRAYER_UPDATE_TOAST,
  runMemberPrayerCacheMutation,
} from '../lib/prayer-member-mutation-wire';
import {
  parsePrayedForRpcCount,
  patchCommunityPrayerListsPrayedForCount,
  patchPersonalPrayersPrayedForCount,
} from '../lib/prayer-prayed-for-increment';
import {
  clearTimeoutIdMap,
  mergePrayerResumeListenerSubscriptions,
  runResumeCommunityPrayerRefresh,
  scheduleDebouncedResumeRefresh,
  unsubscribePrayerResumeListeners,
  wirePrayerResumeListeners,
} from '../lib/prayer-service-resume';
import { subscribePrayerCatalogRealtime } from '../lib/prayer-service-realtime';
import { buildPrayerCatalogRealtimeHandlers } from '../lib/prayer-service-realtime-handlers';
import {
  PRAYER_SERVICE_INACTIVITY_THRESHOLD_MS,
  PRAYER_SERVICE_LOAD_ERROR_TOAST_COOLDOWN_MS,
  PRAYER_SERVICE_RESUME_REFRESH_DEBOUNCE_MS,
} from '../lib/prayer-service-constants';
import { resolvePrayerServiceUserEmail } from '../lib/prayer-service-user-email';
import {
  personalPrayerSessionAction,
  userSessionEmailDistinctEqual,
} from '../lib/prayer-service-session-wire';
import type {
  PrayerFilters,
  PrayerRequest,
  PrayerStatus,
  PrayerUpdate,
} from '../lib/prayer-types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type { PrayerFilters, PrayerRequest, PrayerStatus, PrayerUpdate };

@Injectable({
  providedIn: 'root'
})
export class PrayerService {
  private allPrayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  private prayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  private allPersonalPrayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  private loadingPersonalPrayersSubject = new BehaviorSubject<boolean>(true);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private realtimeChannel: RealtimeChannel | null = null;
  private currentFilters: PrayerFilters = {};
  private inactivityTimeout: any = null;
  private inactivityThresholdMs = PRAYER_SERVICE_INACTIVITY_THRESHOLD_MS;
  private backgroundRecoveryTimeouts: Map<string, number> = new Map();
  private isInBackground = document.hidden;
  /** Debounce resume-triggered refresh so visibility/focus/app-became-visible only trigger one load */
  private resumeRefreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private resumeListenerSubscriptions: Subscription[] = [];
  private static readonly RESUME_REFRESH_DEBOUNCE_MS =
    PRAYER_SERVICE_RESUME_REFRESH_DEBOUNCE_MS;
  /** Avoid multiple "Failed to load prayers" toasts when several loads fail at once (e.g. after long background) */
  private lastLoadErrorToastTime = 0;
  private static readonly LOAD_ERROR_TOAST_COOLDOWN_MS =
    PRAYER_SERVICE_LOAD_ERROR_TOAST_COOLDOWN_MS;
  /** True while a community-prayer DB fetch is in flight (cache may already be shown). */
  private communityPrayersFetchInFlight = false;
  /** True after community prayers have been loaded from the database at least once. */
  private communityPrayersDbFetchComplete = false;
  /** True after personal prayers have finished a load attempt (DB or cache). */
  private personalPrayersDbFetchComplete = false;

  public allPrayers$ = this.allPrayersSubject.asObservable();
  public prayers$ = this.prayersSubject.asObservable();
  public allPersonalPrayers$ = this.allPersonalPrayersSubject.asObservable();
  public loadingPersonalPrayers$ = this.loadingPersonalPrayersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  getAllCommunityPrayersSnapshot(): PrayerRequest[] {
    return this.allPrayersSubject.value;
  }

  getPersonalPrayersSnapshot(): PrayerRequest[] {
    return this.allPersonalPrayersSubject.value;
  }

  /** True when initial community + personal prayer loads have finished (may still be empty). */
  arePrayerCatalogsReady(): boolean {
    return arePrayerCatalogsReadyFromFlags({
      loadingCommunity: this.loadingSubject.value,
      loadingPersonal: this.loadingPersonalPrayersSubject.value,
      communityFetchInFlight: this.communityPrayersFetchInFlight,
      communityDbComplete: this.communityPrayersDbFetchComplete,
      personalDbComplete: this.personalPrayersDbFetchComplete,
    });
  }

  private dropRemindersForAnsweredPersonalPrayers(prayers: PrayerRequest[]): void {
    for (const prayerId of answeredPersonalPrayerIds(prayers)) {
      this.prayerItemReminderService?.dropRemindersForPrayer(prayerId, 'personal');
    }
  }

  private setPersonalPrayersState(prayers: PrayerRequest[]): void {
    this.allPersonalPrayersSubject.next(prayers);
    this.cache.set(PERSONAL_PRAYERS_CACHE_KEY, prayers);
  }

  private personalCacheSnapshotActions(): PersonalPrayersCacheSnapshotActions {
    return {
      normalize: (prayers) => this.normalizePersonalPrayerCache(prayers),
      setPersonalPrayers: (prayers) => this.allPersonalPrayersSubject.next(prayers),
      dropAnsweredReminders: (prayers) =>
        this.dropRemindersForAnsweredPersonalPrayers(prayers),
    };
  }

  private personalCategoryOrchestrationDeps(): PersonalCategoryOrchestrationDeps {
    return {
      getUserEmail: () => this.getUserEmail(),
      local: {
        getPrayers: () => this.allPersonalPrayersSubject.value,
        setPrayers: (prayers) => this.setPersonalPrayersState(prayers),
      },
      runCategoryRpc: async (rpcName, args) => {
        const result = await this.supabase.client.rpc(rpcName, args);
        return { data: result.data, error: result.error };
      },
      runPrayerOrderRpc: async (args) => {
        const result = await this.supabase.client.rpc('reorder_personal_prayers', args);
        return { data: result.data, error: result.error };
      },
      applyDisplayOrderUpdates: (updates, options) =>
        this.applyPersonalPrayerDisplayOrderUpdates(updates, options),
      getCategoryRange: (category) => this.getCategoryRange(category),
    };
  }

  private mapFetchedPersonalPrayers(data: unknown[]): PrayerRequest[] {
    return personalPrayersFromDbRows(
      data,
      (row) => personalPrayerRowToPrayerRequest(row as never),
      (prayers) => this.normalizePersonalPrayerCache(prayers)
    );
  }

  private async fetchPersonalPrayersFromDb(userEmail: string): Promise<PrayerRequest[]> {
    const { data, error } = await this.supabase.client
      .from('personal_prayers')
      .select(PERSONAL_PRAYERS_LIST_SELECT)
      .eq('user_email', userEmail)
      .order('display_order', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return this.mapFetchedPersonalPrayers(data || []);
  }

  /** True when a personal_prayers UPDATE only reordered a row (drag-and-drop). */
  private isPersonalPrayerDisplayOrderOnlyChange(
    oldRow: Record<string, unknown> | undefined,
    newRow: Record<string, unknown> | undefined
  ): boolean {
    return isPersonalPrayerDisplayOrderOnlyDbChange(oldRow, newRow);
  }

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private emailNotification: EmailNotificationService,
    private verificationService: VerificationService,
    private cache: CacheService,
    private badgeService: BadgeService,
    private userSessionService: UserSessionService,
    @Optional() private prayerItemReminderService?: PrayerItemReminderService
  ) {
    this.initializePrayers();
  }

  private async initializePrayers(): Promise<void> {
    await this.loadPrayers();
    
    // Subscribe to user session changes to auto-load personal prayers
    this.userSessionService.userSession$
      .pipe(
        distinctUntilChanged(userSessionEmailDistinctEqual)
      )
      .subscribe((session) => {
        const action = personalPrayerSessionAction(session);
        if (action === 'load') {
          this.personalPrayersDbFetchComplete = false;
          this.loadPersonalPrayers().catch((err) =>
            console.error(
              '[PrayerService] Error loading personal prayers on session change:',
              err
            )
          );
        } else {
          this.allPersonalPrayersSubject.next([]);
          this.personalPrayersDbFetchComplete = true;
          this.cache.invalidate(PERSONAL_PRAYERS_CACHE_KEY);
        }
      });
    
    this.setupRealtimeSubscription();
    this.setupResumeListeners();
  }

  /**
   * Load prayers from database with cache-first approach (Tier 1 optimization)
   * - Check cache first before hitting database
   * - For silent refreshes, skip DB if cache is recent (<20 min)
   * - Fallback to cached data on network failure
   */
  async loadPrayers(silentRefresh = false): Promise<void> {
    const cachedPrayers = this.cache.get<PrayerRequest[]>(COMMUNITY_PRAYERS_CACHE_KEY);
    const skipDb = shouldSkipCommunityPrayersDbOnSilentRefresh(silentRefresh, cachedPrayers);

    try {
      console.log('[PrayerService] Loading prayers...');
      if (!skipDb) {
        this.communityPrayersFetchInFlight = true;
      }

      if (cachedPrayers && cachedPrayers.length > 0) {
        console.log(`[PrayerService] Using cached prayers (${cachedPrayers.length} items)`);
        applyCommunityPrayersCacheSnapshot(cachedPrayers, {
          setAllPrayers: (prayers) => this.allPrayersSubject.next(prayers),
          reapplyFilters: () => this.applyFilters(this.currentFilters),
        });

        if (skipDb) {
          console.log('[PrayerService] Cache hit for silent refresh - skipping database query');
          if (!this.communityPrayersFetchInFlight) {
            this.communityPrayersDbFetchComplete = true;
          }
          return;
        }
      }

      if (shouldShowCommunityLoadingIndicator(silentRefresh, cachedPrayers)) {
        this.loadingSubject.next(true);
      }
      this.errorSubject.next(null);

      const { data: prayersData, error } = await this.supabase.client
        .from('prayers')
        .select(COMMUNITY_PRAYERS_WITH_UPDATES_SELECT)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`[PrayerService] Loaded ${prayersData?.length || 0} approved prayers from database`);

      publishCommunityPrayersFromDb(
        prayersData || [],
        formatApprovedCommunityPrayersFromDb,
        {
          setAllPrayers: (prayers) => this.allPrayersSubject.next(prayers),
          setCache: (prayers) => this.cache.set(COMMUNITY_PRAYERS_CACHE_KEY, prayers),
          reapplyFilters: () => this.applyFilters(this.currentFilters),
          refreshBadges: () => this.badgeService.refreshBadgeCounts(),
          markDbFetchComplete: () => {
            this.communityPrayersDbFetchComplete = true;
          },
        }
      );
    } catch (err) {
      console.error('[PrayerService] Failed to load prayers:', err);
      
      const fallbackPlan = planCommunityLoadErrorFallback(
        this.cache.get<PrayerRequest[]>(COMMUNITY_PRAYERS_CACHE_KEY),
        err,
        this.lastLoadErrorToastTime,
        PrayerService.LOAD_ERROR_TOAST_COOLDOWN_MS
      );

      if (fallbackPlan.kind === 'use_cache') {
        console.log(
          `[PrayerService] Showing ${fallbackPlan.prayers.length} cached prayers (error fallback)`
        );
      }

      applyCommunityLoadErrorPlan(fallbackPlan, {
        setAllPrayers: (prayers) => this.allPrayersSubject.next(prayers),
        reapplyFilters: () => this.applyFilters(this.currentFilters),
        setError: (message) => this.errorSubject.next(message),
        emitErrorToast: () => {
          this.lastLoadErrorToastTime = Date.now();
          this.toast.error('Failed to load prayers');
        },
      });
      this.communityPrayersDbFetchComplete = true;
    } finally {
      if (!skipDb) {
        this.communityPrayersFetchInFlight = false;
      }
      this.loadingSubject.next(false);
    }
  }

  /**
   * Load personal prayers from database with cache-first approach (Tier 1 optimization)
   * - Check cache first before hitting database
   * - Personal prayers only change when the current user adds them (DB updates cache immediately)
   * - For silent refreshes, skip DB if cache exists
   */
  async loadPersonalPrayers(silentRefresh = false): Promise<void> {
    try {
      this.loadingPersonalPrayersSubject.next(true);
      console.log('[PrayerService] Loading personal prayers...');
      
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.warn('[PrayerService] User email not available for personal prayers');
        this.personalPrayersDbFetchComplete = true;
        return;
      }

      // ✅ TIER 1: Check cache first
      const cachedPersonalPrayers = this.cache.get<PrayerRequest[]>(PERSONAL_PRAYERS_CACHE_KEY);
      if (cachedPersonalPrayers && cachedPersonalPrayers.length > 0) {
        console.log(`[PrayerService] Using cached personal prayers (${cachedPersonalPrayers.length} items)`);
        applyCachedPersonalPrayersSnapshot(
          cachedPersonalPrayers,
          this.personalCacheSnapshotActions()
        );

        // ✅ TIER 1: Skip DB for silent refresh - personal prayers only change when user adds them
        if (silentRefresh) {
          console.log('[PrayerService] Cache hit for silent refresh - skipping personal prayers database query');
          return;
        }
      }

      const { data, error } = await this.supabase.client
        .from('personal_prayers')
        .select(PERSONAL_PRAYERS_LIST_SELECT)
        .eq('user_email', userEmail)
        .order('display_order', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const personalPrayers = this.mapFetchedPersonalPrayers(data || []);

      console.log(`[PrayerService] Loaded ${personalPrayers.length} personal prayers from database`);
      publishPersonalPrayersFromDb(personalPrayers, {
        setPersonalPrayers: (prayers) => this.setPersonalPrayersState(prayers),
        dropAnsweredReminders: (prayers) =>
          this.dropRemindersForAnsweredPersonalPrayers(prayers),
      });
    } catch (err) {
      console.error('[PrayerService] Failed to load personal prayers:', err);

      const userEmail = await this.getUserEmail();
      const cacheFallback = planPersonalPrayerLoadCacheFallback(
        this.cache.get<PrayerRequest[]>(PERSONAL_PRAYERS_CACHE_KEY),
        userEmail
      );

      applyPersonalPrayerLoadCacheFallbackPlan(cacheFallback, {
        applyCachedSnapshot: (prayers) => {
          console.log(
            `[PrayerService] Showing ${prayers.length} cached personal prayers`
          );
          applyCachedPersonalPrayersSnapshot(prayers, this.personalCacheSnapshotActions());
        },
        invalidatePersonalCache: () => this.cache.invalidate(PERSONAL_PRAYERS_CACHE_KEY),
        clearPersonalPrayers: () => {
          console.warn(
            '[PrayerService] Cached personal prayers do not match current user - discarding cache'
          );
          this.allPersonalPrayersSubject.next([]);
        },
      });
    } finally {
      this.loadingPersonalPrayersSubject.next(false);
      this.personalPrayersDbFetchComplete = true;
    }
  }
  async getPrayersByMonth(year: number, month: number): Promise<PrayerRequest[]> {
    try {
      const { startDate, endDate } = prayersByMonthIsoRange(year, month);

      const { data: prayersData, error } = await this.supabase.client
        .from('prayers')
        .select(COMMUNITY_PRAYERS_WITH_UPDATES_SELECT)
        .or(prayersByMonthOrFilter(startDate, endDate))
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return formatPrayersByMonthFromDb(prayersData || []);
    } catch (err) {
      console.error(`[PrayerService] Failed to load prayers for ${year}-${month}:`, err);
      return [];
    }
  }

  /**
   * Refresh data when window regains focus or after inactivity
   */
  private setupResumeListeners(): void {
    const added = wirePrayerResumeListeners({
      scheduleResumeRefresh: () => this.scheduleResumeRefresh(),
      onEnterBackground: () => {
        this.isInBackground = true;
        console.log(
          '[PrayerService] App going to background - pausing aggressive operations'
        );
        clearTimeoutIdMap(this.backgroundRecoveryTimeouts);
      },
      onLeaveBackground: () => {
        this.isInBackground = false;
        console.log(
          '[PrayerService] App returning from background - triggering recovery'
        );
        this.triggerBackgroundRecovery();
      },
      inactivityThresholdMs: this.inactivityThresholdMs,
      getInactivityTimeout: () => this.inactivityTimeout,
      setInactivityTimeout: (id) => {
        this.inactivityTimeout = id;
      },
      clearBackgroundRecoveryTimeouts: () => {
        clearTimeoutIdMap(this.backgroundRecoveryTimeouts);
      },
    });
    this.resumeListenerSubscriptions = mergePrayerResumeListenerSubscriptions(
      this.resumeListenerSubscriptions,
      added
    );
  }

  /** @internal Used by specs to wire inactivity timer only (same path as setupResumeListeners). */
  private setupInactivityListener(): void {
    this.setupResumeListeners();
  }

  /** @internal Used by specs — consolidated into setupResumeListeners. */
  private setupBackgroundRecoveryListener(): void {
    this.setupResumeListeners();
  }

  /**
   * Schedule a single resume refresh (debounced). Called from visibilitychange, focus, and app-became-visible
   * so we only run one refresh after coming back from background instead of several.
   */
  private scheduleResumeRefresh(): void {
    this.resumeRefreshTimeoutId = scheduleDebouncedResumeRefresh(
      this.resumeRefreshTimeoutId,
      PrayerService.RESUME_REFRESH_DEBOUNCE_MS,
      () => {
        this.resumeRefreshTimeoutId = null;
        this.runResumeRefresh();
      }
    );
  }

  /**
   * Run resume refresh once: ensure session/connection, then load prayers. Used after long background
   * so the session is refreshed before fetching (avoids "Failed to load prayers" from expired token).
   */
  private async runResumeRefresh(): Promise<void> {
    await runResumeCommunityPrayerRefresh({
      readCachedPrayers: () =>
        this.cache.get<PrayerRequest[]>(COMMUNITY_PRAYERS_CACHE_KEY),
      onShowCachedPrayers: (cached) => {
        this.allPrayersSubject.next(cached);
        this.applyFilters(this.currentFilters);
      },
      ensureConnected: () => this.supabase.ensureConnected(),
      loadPrayersSilent: () => this.loadPrayers(true),
      reconnectRealtimeIfNeeded: () => {
        if (!this.realtimeChannel) {
          this.setupRealtimeSubscription();
        }
      },
    });
  }

  /**
   * Trigger background recovery - refresh data and ensure connections are healthy.
   * Now invoked only via scheduleResumeRefresh for a single debounced run.
   */
  private triggerBackgroundRecovery(): void {
    this.scheduleResumeRefresh();
  }

  /**
   * Apply filters to prayers list
   */
  applyFilters(filters: PrayerFilters): void {
    this.currentFilters = filters;
    this.prayersSubject.next(
      applyPrayerCatalogFilters(this.allPrayersSubject.getValue(), filters)
    );
  }

  /**
   * Add a new prayer request
   */
  async addPrayer(prayer: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates'>): Promise<boolean> {
    try {
      const prayerData = buildCommunityPrayerInsertRow(prayer);

      const { data, error } = await this.supabase.client
        .from('prayers')
        .insert(prayerData)
        .select()
        .single();

      if (error) throw error;

      // Auto-subscribe user to email notifications if email provided
      if (prayer.email) {
        try {
          await ensureEmailSubscriberForPrayerSubmit(
            prayer.requester,
            prayer.email,
            async (normalizedEmail) => {
              const { data: existing } = await this.supabase.client
                .from('email_subscribers')
                .select('id')
                .eq('email', normalizedEmail)
                .maybeSingle();
              return existing;
            },
            async (row) => {
              await this.supabase.client.from('email_subscribers').insert(row);
            }
          );
        } catch (subscribeError) {
          console.error('Failed to auto-subscribe user:', subscribeError);
        }
      }

      this.emailNotification.sendAdminNotification(
        buildCommunityPrayerAdminNotificationPayload(prayer, data.id)
      ).catch((err) => console.error('Failed to send admin notification:', err));

      this.toast.success('Prayer request submitted for approval');
      return true;
    } catch (error) {
      console.error('Error adding prayer:', error);
      this.toast.error('Failed to submit prayer request');
      return false;
    }
  }

  /**
   * Update prayer status
   */
  async updatePrayerStatus(id: string, status: PrayerStatus): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayers')
        .update(buildCommunityPrayerStatusUpdatePayload(status))
        .eq('id', id);

      if (error) throw error;

      // Update local state
      this.prayersSubject.next(
        patchCommunityPrayerStatus(this.prayersSubject.value, id, status)
      );

      if (shouldDropCommunityReminderForStatus(status)) {
        this.prayerItemReminderService?.dropRemindersForPrayer(id, 'community');
      }

      this.toast.success(`Prayer marked as ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating prayer status:', error);
      this.toast.error('Failed to update prayer status');
      return false;
    }
  }

  /**
   * Increment prayed_for_count for a prayer via RPC. Updates in-memory list only (no refetch).
   * @returns The new count, or null on error.
   */
  async incrementPrayedFor(prayerId: string): Promise<number | null> {
    try {
      const { data: newCount, error } = await this.supabase.client
        .rpc('increment_prayed_for_count', { prayer_id: prayerId });

      if (error) throw error;
      const count = parsePrayedForRpcCount(newCount);
      if (count === null) return null;

      const patched = patchCommunityPrayerListsPrayedForCount(
        this.allPrayersSubject.value,
        this.prayersSubject.value,
        prayerId,
        count
      );
      this.allPrayersSubject.next(patched.all);
      this.prayersSubject.next(patched.filtered);

      return count;
    } catch (err) {
      console.error('[PrayerService] incrementPrayedFor failed', err);
      return null;
    }
  }

  /**
   * Increment prayed_for_count for a personal prayer via RPC. Updates in-memory list and cache only (no refetch).
   * @returns The new count, or null on error.
   */
  async incrementPersonalPrayedFor(prayerId: string): Promise<number | null> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        return null;
      }

      const { data: newCount, error } = await this.supabase.client
        .rpc('increment_personal_prayed_for_count', {
          personal_prayer_id: prayerId,
          p_user_email: userEmail,
        });

      if (error) throw error;
      const count = parsePrayedForRpcCount(newCount);
      if (count === null) return null;

      const updated = patchPersonalPrayersPrayedForCount(
        this.allPersonalPrayersSubject.value,
        prayerId,
        count
      );
      this.setPersonalPrayersState(updated);

      return count;
    } catch (err) {
      console.error('[PrayerService] incrementPersonalPrayedFor failed', err);
      return null;
    }
  }

  /**
   * Increment prayed_for_count for a Planning Center member via RPC.
   * Updates the in-memory counts cache only (member cards live on Home/Presentation).
   * @returns The new count, or null on error.
   */
  async incrementMemberPrayedFor(personId: string): Promise<number | null> {
    try {
      const trimmedId = trimMemberPersonId(personId);
      if (!trimmedId) {
        return null;
      }

      const { data: newCount, error } = await this.supabase.client.rpc(
        'increment_member_prayed_for_count',
        { p_person_id: trimmedId }
      );

      if (error) throw error;
      const count = parsePrayedForRpcCount(newCount);
      if (count === null) return null;

      this.cache.set(
        MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY,
        writeMemberPrayedForCountToCache(
          this.cache.get(MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY) as Record<string, number> | null,
          trimmedId,
          count
        )
      );

      return count;
    } catch (err) {
      console.error('[PrayerService] incrementMemberPrayedFor failed', err);
      return null;
    }
  }

  /**
   * Batch-load Pray For counts for Planning Center members.
   * Returns a map keyed by person_id (missing ids imply 0).
   */
  async getMemberPrayedForCountsBatch(personIds: string[]): Promise<Record<string, number>> {
    try {
      if (personIds.length === 0) {
        return {};
      }

      const { data, error } = await this.supabase.client
        .from('member_prayed_for_counts')
        .select('person_id, prayed_for_count')
        .in('person_id', personIds);

      if (error) throw error;

      const countsMap = memberPrayedForCountsFromRows(data || []);
      this.cache.set(MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY, countsMap);
      return countsMap;
    } catch (error) {
      console.error('Error fetching batch member prayed-for counts:', error);
      return {};
    }
  }

  /**
   * Add an update to a prayer
   */
  async addPrayerUpdate(prayerId: string, content: string, author: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('prayer_updates')
        .insert(buildSimplePendingUpdateInsertRow(prayerId, content, author))
        .select()
        .single();

      if (error) throw error;

      await afterCommunityPendingUpdateInserted(
        prayerId,
        author,
        content,
        data.id,
        async (id) => {
          const { data: prayer } = await this.supabase.client
            .from('prayers')
            .select('title')
            .eq('id', id)
            .single();
          return prayer?.title;
        },
        (payload) => this.emailNotification.sendAdminNotification(payload)
      );

      this.toast.success('Update submitted for approval');
      return true;
    } catch (error) {
      console.error('Error adding prayer update:', error);
      this.toast.error('Failed to add update');
      return false;
    }
  }

  /**
   * Add an update to a Planning Center member prayer card
   */
  async addMemberPrayerUpdate(personId: string, memberName: string, content: string, author: string, authorEmail: string = '', isAnswered: boolean = false, listId?: string): Promise<boolean> {
    return runMemberPrayerCacheMutation(
      async () => {
        const { error } = await this.supabase.client
          .from('member_prayer_updates')
          .insert(buildMemberPrayerUpdateInsertRow(personId, content, isAnswered))
          .select()
          .single();
        if (error) {
          throw error;
        }
      },
      () => this.invalidateMemberPrayerCaches(listId),
      (message) => this.toast.success(message),
      (message) => this.toast.error(message),
      {
        success: MEMBER_PRAYER_UPDATE_TOAST.addSuccess,
        fail: MEMBER_PRAYER_UPDATE_TOAST.addFail,
      },
      'Error adding member prayer update:'
    );
  }

  /**
   * Get updates for Planning Center members by batch fetching
   * Fetches updates only for specified person IDs (much faster than fetching all)
   * Returns a map keyed by person_id for easy access
   */
  async getMemberPrayerUpdatesBatch(personIds: string[]): Promise<Record<string, any[]>> {
    try {
      if (personIds.length === 0) {
        return {};
      }

      // Batch fetch updates for specific members only
      const { data, error } = await this.supabase.client
        .from('member_prayer_updates')
        .select('id, person_id, content, created_at, updated_at, is_answered')
        .in('person_id', personIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const updatesMap = groupMemberPrayerUpdatesByPersonId(data || []);

      // Cache the batch results
      this.cache.set(MEMBER_PRAYER_UPDATES_CACHE_KEY, updatesMap);

      console.log(`[PrayerService] Batch loaded updates for ${personIds.length} members`);
      return updatesMap;
    } catch (error) {
      console.error('Error fetching batch member prayer updates:', error);
      return {};
    }
  }

  /**
   * Get updates for a Planning Center member by person_id
   * Uses cache first, falls back to batch fetch if needed
   */
  async getMemberPrayerUpdates(personId: string): Promise<any[]> {
    try {
      // Try to get from cache first
      const cachedUpdates = this.cache.get(MEMBER_PRAYER_UPDATES_CACHE_KEY) as
        | Record<string, any[]>
        | undefined;
      const cachedForPerson = memberUpdatesCacheForPerson(cachedUpdates, personId);
      if (cachedForPerson) {
        return cachedForPerson;
      }

      // Cache miss - fetch just this person's updates
      const { data, error } = await this.supabase.client
        .from('member_prayer_updates')
        .select('id, person_id, content, created_at, updated_at, is_answered')
        .eq('person_id', personId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const updates = (data || []).map((u) => mapMemberPrayerUpdateRow(u));

      this.cache.set(
        MEMBER_PRAYER_UPDATES_CACHE_KEY,
        writeMemberUpdatesCacheForPerson(cachedUpdates, personId, updates)
      );

      return updates;
    } catch (error) {
      console.error('Error fetching member prayer updates:', error);
      return [];
    }
  }

  /**
   * Clear cache for Planning Center list data (call after adding/editing/deleting member updates)
   * Clears the consolidated list cache so it refetches with updated member updates
   * Note: listId needed because member updates are cached at the list level
   */
  clearPlanningCenterListDataCache(listId: string): void {
    this.cache.invalidate(planningCenterListDataCacheKey(listId));
  }

  /**
   * Delete a member prayer update by ID and clear cache
   */
  async deleteMemberPrayerUpdate(updateId: string, personId: string, listId?: string): Promise<boolean> {
    return runMemberPrayerCacheMutation(
      async () => {
        const { error } = await this.supabase.client
          .from('member_prayer_updates')
          .delete()
          .eq('id', updateId);
        if (error) {
          throw error;
        }
      },
      () => this.invalidateMemberPrayerCaches(listId),
      (message) => this.toast.success(message),
      (message) => this.toast.error(message),
      {
        success: MEMBER_PRAYER_UPDATE_TOAST.deleteSuccess,
        fail: MEMBER_PRAYER_UPDATE_TOAST.deleteFail,
      },
      '[PrayerService] Error deleting member update:'
    );
  }

  /**
   * Update a member prayer update
   */
  async updateMemberPrayerUpdate(updateId: string, personId: string, updates: Partial<PrayerUpdate>, listId?: string): Promise<boolean> {
    return runMemberPrayerCacheMutation(
      async () => {
        const updateData = buildMemberPrayerUpdatePatch(updates);
        const { error } = await this.supabase.client
          .from('member_prayer_updates')
          .update(updateData)
          .eq('id', updateId)
          .select();
        if (error) {
          throw error;
        }
      },
      () => this.invalidateMemberPrayerCaches(listId),
      (message) => this.toast.success(message),
      (message) => this.toast.error(message),
      {
        success: MEMBER_PRAYER_UPDATE_TOAST.updateSuccess,
        fail: MEMBER_PRAYER_UPDATE_TOAST.updateFail,
      },
      'Error updating member prayer update:'
    );
  }

  /**
   * Delete a prayer
   */
  async deletePrayer(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      applyCommunityPrayerDeleteSnapshot(
        this.prayersSubject.value,
        this.allPrayersSubject.value,
        id,
        {
          setFilteredPrayers: (prayers) => this.prayersSubject.next(prayers),
          setAllPrayers: (prayers) => this.allPrayersSubject.next(prayers),
          setCache: (prayers) => this.cache.set(COMMUNITY_PRAYERS_CACHE_KEY, prayers),
          reapplyFilters: () => this.applyFilters(this.currentFilters),
          refreshBadges: () => this.badgeService.refreshBadgeCounts(),
          dropReminders: (prayerId) =>
            this.prayerItemReminderService?.dropRemindersForPrayer(prayerId, 'community'),
        }
      );

      this.toast.success('Prayer deleted');
      return true;
    } catch (error) {
      console.error('Error deleting prayer:', error);
      this.toast.error('Failed to delete prayer');
      return false;
    }
  }

  /**
   * Delete a prayer update
   */
  async deletePrayerUpdate(updateId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      // Reload prayers to reflect the change
      await this.loadPrayers();
      
      this.toast.success('Update deleted');
      return true;
    } catch (error) {
      console.error('Error deleting prayer update:', error);
      this.toast.error('Failed to delete update');
      return false;
    }
  }

  /**
   * Get filtered prayers
   */
  getFilteredPrayers(filters: PrayerFilters): PrayerRequest[] {
    return filterPrayerRequestsByStatusAndSearch(this.prayersSubject.value, filters);
  }

  /**
   * Set up real-time subscription for prayer changes
   */
  private setupRealtimeSubscription(): void {
    try {
      console.log('[PrayerService] Setting up realtime subscription...');

      this.realtimeChannel = subscribePrayerCatalogRealtime(
        this.supabase.client,
        buildPrayerCatalogRealtimeHandlers({
          dropRemindersForPrayer: (prayerId, kind) =>
            this.prayerItemReminderService?.dropRemindersForPrayer(prayerId, kind),
          reloadCommunityPrayers: () => this.loadPrayers(true),
          reloadPersonalPrayers: () => this.loadPersonalPrayers(false),
        })
      );
    } catch (error) {
      console.error('[PrayerService] Error setting up realtime subscription:', error);
      // Continue without realtime - fallback to polling
    }
  }

  /**
   * Clean up subscriptions and resources when service is destroyed
   */
  async cleanup(): Promise<void> {
    console.log('[PrayerService] Cleaning up...');
    try {
      unsubscribePrayerResumeListeners(this.resumeListenerSubscriptions);
      this.resumeListenerSubscriptions = [];
      if (this.resumeRefreshTimeoutId != null) {
        clearTimeout(this.resumeRefreshTimeoutId);
        this.resumeRefreshTimeoutId = null;
      }
      if (this.realtimeChannel) {
        await this.supabase.client.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
        this.inactivityTimeout = null;
      }
    } catch (error) {
      console.error('[PrayerService] Error during cleanup:', error);
    }
  }

  /**
   * Reload prayers when page becomes visible (debounced via scheduleResumeRefresh).
   */
  private setupVisibilityListener(): void {
    this.setupResumeListeners();
  }

  private invalidateMemberPrayerCaches(listId?: string): void {
    for (const key of memberPrayerCacheKeysToInvalidate(listId)) {
      this.cache.invalidate(key);
    }
  }

  /**
   * Add an update to a prayer with full details
   */
  async addUpdate(updateData: any): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('prayer_updates')
        .insert(buildPendingCommunityUpdateInsertRow(updateData))
        .select()
        .single();

      if (error) throw error;

      await afterCommunityPendingUpdateInserted(
        updateData.prayer_id,
        updateData.author,
        updateData.content,
        data.id,
        async (id) => {
          const { data: prayer } = await this.supabase.client
            .from('prayers')
            .select('title')
            .eq('id', id)
            .single();
          return prayer?.title;
        },
        (payload) => this.emailNotification.sendAdminNotification(payload)
      );

      this.toast.success('Update submitted for approval');
      return true;
    } catch (error) {
      console.error('Error adding update:', error);
      this.toast.error('Failed to add update');
      return false;
    }
  }

  /**
   * Delete an update
   */
  async deleteUpdate(updateId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      this.toast.success('Update deleted');
      await this.loadPrayers();
      return true;
    } catch (error) {
      console.error('Error deleting update:', error);
      this.toast.error('Failed to delete update');
      return false;
    }
  }

  /**
   * Request deletion of a prayer
   */
  async requestDeletion(requestData: any): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('deletion_requests')
        .insert(buildPrayerDeletionRequestRow(requestData))
        .select('id')
        .single();

      if (error) throw error;

      await notifyPrayerDeletionRequestSubmitted(
        requestData,
        data?.id,
        async () => {
          const { data: prayerRow } = await this.supabase.client
            .from('prayers')
            .select('title')
            .eq('id', requestData.prayer_id)
            .single();
          return prayerRow;
        },
        (payload) => this.emailNotification.sendAdminNotification(payload)
      );

      this.toast.success('Deletion request submitted for review');
      return true;
    } catch (error) {
      console.error('Error requesting deletion:', error);
      this.toast.error('Failed to submit deletion request');
      return false;
    }
  }

  /**
   * Request deletion of a prayer update
   */
  async requestUpdateDeletion(requestData: any): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('update_deletion_requests')
        .insert(buildUpdateDeletionRequestRow(requestData))
        .select('id')
        .single();

      if (error) throw error;

      await notifyUpdateDeletionRequestSubmitted(
        requestData,
        data?.id,
        async () => {
          const { data: updateRow } = await this.supabase.client
            .from('prayer_updates')
            .select('*, prayers!inner(title)')
            .eq('id', requestData.update_id)
            .single();
          return updateRow;
        },
        (payload) => this.emailNotification.sendAdminNotification(payload)
      );

      this.toast.success('Update deletion request submitted for review');
      return true;
    } catch (error) {
      console.error('Error requesting update deletion:', error);
      this.toast.error('Failed to submit update deletion request');
      return false;
    }
  }

  /**
   * Validate and sanitize category name (50 character max)
   */
  private sanitizeCategory(category: string | null | undefined): string | null {
    return sanitizePersonalPrayerCategory(category);
  }

  /**
   * Get the display_order range for a category (category-scoped range system)
   * Uncategorized (null): 0-999
   * Categories assigned sequentially by creation order: 1000-1999, 2000-2999, etc.
   */
  private personalCategoryDeps(): PersonalCategoryDeps {
    return {
      getCategoryCount: (category) => this.getCategoryPrayerCount(category),
      getCategoryRange: (category) => this.getCategoryRange(category),
      queryMaxDisplayOrderInRange: (email, category, range) =>
        this.queryMaxDisplayOrderInCategoryRange(email, category, range),
    };
  }

  private async queryMaxDisplayOrderInCategoryRange(
    userEmail: string,
    category: string | null,
    range: CategoryDisplayOrderRange
  ): Promise<{
    data: { display_order?: number | null } | null;
    error: unknown;
  }> {
    const result = await this.supabase.client
      .from('personal_prayers')
      .select('display_order')
      .eq('user_email', userEmail)
      .eq('category', category ?? null)
      .gte('display_order', range.min)
      .lte('display_order', range.max)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    return { data: result.data, error: result.error };
  }

  private async getCategoryRange(
    category: string | null | undefined
  ): Promise<CategoryDisplayOrderRange> {
    const userEmail = await this.getUserEmail();
    return resolvePersonalCategoryRangeWithDb(
      category,
      userEmail,
      async (email, categoryEq) => {
        const result = await this.supabase.client
          .from('personal_prayers')
          .select('display_order')
          .eq('user_email', email)
          .eq('category', categoryEq);
        return { data: result.data, error: result.error };
      },
      async (email, minDisplayOrder) => {
        const result = await this.supabase.client
          .from('personal_prayers')
          .select('category, display_order')
          .eq('user_email', email)
          .not('category', 'is', null)
          .gte('display_order', minDisplayOrder);
        return { data: result.data, error: result.error };
      },
      PRAYER_PERSONAL_UNCATEGORIZED_MAX + 1
    );
  }

  /**
   * Count how many personal prayers exist in a category's display_order range
   */
  private async getCategoryPrayerCount(category: string | null | undefined): Promise<number> {
    const userEmail = await this.getUserEmail();
    return fetchPersonalCategoryPrayerCountWithDb(
      userEmail,
      category,
      async (email, categoryEq) => {
        const result = await this.supabase.client
          .from('personal_prayers')
          .select('id')
          .eq('user_email', email)
          .eq('category', categoryEq);
        return { data: result.data, error: result.error };
      }
    );
  }

  private async applyPersonalPrayerDisplayOrderUpdates(
    updates: PersonalPrayerDisplayOrderUpdate[],
    options?: { matchUserEmail?: boolean }
  ): Promise<void> {
    const userEmail = options?.matchUserEmail ? await this.getUserEmail() : null;
    if (options?.matchUserEmail && !userEmail) {
      throw new Error('User email not available');
    }

    await runPersonalPrayerDisplayOrderBatchUpdates(updates, async (update) => {
      let query = this.supabase.client
        .from('personal_prayers')
        .update(buildPersonalPrayerDisplayOrderDbPayload(update.displayOrder))
        .eq('id', update.prayerId);
      if (userEmail) {
        query = query.eq('user_email', userEmail);
      }
      const result = await query;
      return { error: result.error };
    });
  }

  /**
   * PERSONAL PRAYERS - User-specific prayers with no admin approval workflow
   */

  /**
   * Get all personal prayers for the current user
   */
  async getPersonalPrayers(forceRefresh: boolean = false): Promise<PrayerRequest[]> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.error('User email not available');
        return [];
      }

      // Check cache first to reduce database egress (unless force refresh)
      if (!forceRefresh) {
        const cached = this.cache.get<PrayerRequest[]>(PERSONAL_PRAYERS_CACHE_KEY);
        if (cached) {
          return this.normalizePersonalPrayerCache(cached);
        }
      }

      const prayers = await this.fetchPersonalPrayersFromDb(userEmail);
      this.cache.set(PERSONAL_PRAYERS_CACHE_KEY, prayers);
      
      return prayers;
    } catch (error) {
      console.error('[PrayerService] Failed to load personal prayers:', error);
      return [];
    }
  }

  /**
   * Add a new personal prayer
   */
  async addPersonalPrayer(prayer: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates' | 'approval_status'>): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      console.log('Adding personal prayer for email:', userEmail);

      const addPlan = await planPersonalPrayerAdd(
        prayer.category,
        userEmail,
        (category) => this.sanitizeCategory(category),
        this.personalCategoryDeps()
      );
      if (!addPlan.ok) {
        this.toast.error(addPlan.userMessage);
        return false;
      }
      const { category, displayOrder: newDisplayOrder } = addPlan;

      const prayerData = buildPersonalPrayerInsertRow(
        prayer,
        category,
        userEmail,
        newDisplayOrder
      );

      const { data, error } = await this.supabase.client
        .from('personal_prayers')
        .insert(prayerData)
        .select()
        .single();

      if (error) throw error;

      const updatedPrayers = personalPrayerListAfterInsert(
        this.allPersonalPrayersSubject.value,
        data,
        userEmail,
        newDisplayOrder,
        (row, email, order) =>
          personalPrayerRequestFromInsertedRow(
            row as Parameters<typeof personalPrayerRequestFromInsertedRow>[0],
            email,
            order
          ),
        (p) => this.withPersonalPrayerUserEmail(p)
      );
      this.setPersonalPrayersState(updatedPrayers);

      // No email notifications or badge notifications for personal prayers
      // Just show success message
      this.toast.success('Personal prayer added successfully');
      return true;
    } catch (error) {
      console.error('Error adding personal prayer:', error);
      this.toast.error(
        `Failed to add personal prayer: ${extractSupabaseErrorMessage(error)}`
      );
      return false;
    }
  }

  /**
   * Delete a personal prayer
   */
  async deletePersonalPrayer(id: string): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      const { error } = await this.supabase.client
        .from('personal_prayers')
        .delete()
        .eq('id', id)
        .eq('user_email', userEmail);

      if (error) throw error;

      const updatedPersonalPrayers = removePersonalPrayerById(
        this.allPersonalPrayersSubject.value,
        id
      );
      this.setPersonalPrayersState(updatedPersonalPrayers);
      this.prayerItemReminderService?.dropRemindersForPrayer(id, 'personal');

      this.toast.success('Personal prayer deleted');
      return true;
    } catch (error) {
      console.error('Error deleting personal prayer:', error);
      this.toast.error('Failed to delete personal prayer');
      return false;
    }
  }

  /**
   * Update personal prayer (title, prayer_for, description, and/or category)
   */
  async updatePersonalPrayer(
    id: string,
    updates: Partial<Pick<PrayerRequest, 'title' | 'prayer_for' | 'description' | 'category'>>,
    options?: { silentSuccess?: boolean }
  ): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      const startPlan = startPersonalPrayerUpdatePlan(
        this.allPersonalPrayersSubject.value,
        id,
        updates,
        (category) => this.sanitizeCategory(category)
      );
      if (!startPlan.ok) {
        this.toast.error('Prayer not found');
        return false;
      }

      const { currentPrayer, newCategory, categoryChanged } = startPlan;

      const categoryChangePlan = await resolvePersonalPrayerCategoryChangeDisplayOrder(
        categoryChanged,
        updates.category !== undefined,
        newCategory,
        currentPrayer.display_order,
        userEmail,
        this.personalCategoryDeps()
      );
      if (!categoryChangePlan.ok) {
        this.toast.error(categoryChangePlan.userMessage);
        return false;
      }
      const newDisplayOrder = categoryChangePlan.displayOrder;

      const clearingAnswered = personalPrayerUpdateClearsAnsweredFlags(
        currentPrayer.category,
        newCategory
      );
      if (clearingAnswered) {
        const { error: clearFlagsError } = await this.supabase.client
          .from('personal_prayer_updates')
          .update(buildClearPersonalPrayerAnsweredFlagsPayload())
          .eq('personal_prayer_id', id);

        if (clearFlagsError) {
          console.error(
            'Error clearing mark_as_answered on personal prayer updates:',
            clearFlagsError
          );
          this.toast.error(
            'Could not clear answered flags on updates. Prayer was left marked as answered.'
          );
          return false;
        }
      }

      const updateData = buildPersonalPrayerDbUpdatePayload(
        updates,
        newCategory,
        categoryChanged,
        newDisplayOrder
      );
      const updatedAt = updateData['updated_at'] as string;

      const { error } = await this.supabase.client
        .from('personal_prayers')
        .update(updateData)
        .eq('id', id)
        .eq('user_email', userEmail);

      if (error) throw error;

      // Update local state and cache (include prayer_for and title so card title updates immediately)
      const updatedPrayers = applyPersonalPrayerFieldUpdate(
        this.allPersonalPrayersSubject.value,
        id,
        {
          updates,
          newCategory,
          newDisplayOrder,
          clearingAnswered,
          updatedAt,
        }
      );
      this.setPersonalPrayersState(updatedPrayers);

      if (shouldDropPersonalPrayerRemindersAfterUpdate(newCategory)) {
        this.prayerItemReminderService?.dropRemindersForPrayer(id, 'personal');
      }

      console.log('[PrayerService] Personal prayer updated successfully');
      if (!options?.silentSuccess) {
        this.toast.success('Personal prayer updated');
      }
      return true;
    } catch (error) {
      console.error('Error updating personal prayer:', error);
      this.toast.error('Failed to update personal prayer');
      return false;
    }
  }

  /**
   * Update display order for personal prayers (used for drag-drop reordering)
   * Enforces category range boundaries - reordering stays within that category's range
   */
  async updatePersonalPrayerOrder(prayers: PrayerRequest[], categoryFilter?: string): Promise<boolean> {
    return orchestratePersonalPrayerOrderUpdate(
      prayers,
      this.personalCategoryOrchestrationDeps()
    );
  }

  /**
   * Update personal prayer update (content and/or mark_as_answered)
   */
  async updatePersonalPrayerUpdate(
    updateId: string,
    prayerId: string,
    updates: Partial<Pick<PrayerUpdate, 'content' | 'mark_as_answered'>>
  ): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      const updateData = personalPrayerUpdatePatchWithTimestamp(updates);

      const { error } = await this.supabase.client
        .from('personal_prayer_updates')
        .update(updateData)
        .eq('id', updateId);

      if (error) throw error;

      // Update local state and cache
      const updatedPrayers = patchPersonalPrayerUpdateLocally(
        this.allPersonalPrayersSubject.value,
        prayerId,
        updateId,
        updates
      );
      this.setPersonalPrayersState(updatedPrayers);

      console.log('[PrayerService] Personal prayer update updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating personal prayer update:', error);
      this.toast.error('Failed to update prayer update');
      return false;
    }
  }


  /**
   * Get unique categories for personal prayers of current user, sorted by range (descending)
   * Categories with higher ranges appear first (newer categories appear at top)
   */
  async getUniqueCategoriesForUser(prayers?: PrayerRequest[]): Promise<string[]> {
    const personalPrayers = prayers ?? this.allPersonalPrayersSubject.value;
    return personalCategoryNamesFromPrayers(personalPrayers);
  }

  /**
   * Rename a personal prayer category for the current user (updates all prayers in that category).
   */
  async renamePersonalCategory(
    oldCategory: string,
    newCategory: string,
    options?: { reservedCategoryNames?: string[] }
  ): Promise<boolean> {
    const validation = validatePersonalCategoryRename(
      oldCategory,
      newCategory,
      (category) => this.sanitizeCategory(category),
      await this.getUniqueCategoriesForUser(),
      options?.reservedCategoryNames ?? []
    );

    if (!validation.ok) {
      this.toast.error(validation.errorMessage);
      return false;
    }

    if (validation.unchanged) {
      return true;
    }

    const { oldName, newName } = validation;

    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      const { data: categoryRows, error: selectError } = await this.supabase.client
        .from('personal_prayers')
        .select('id, category')
        .eq('user_email', userEmail);

      if (selectError) {
        throw selectError;
      }

      const matchingIds = matchingPersonalPrayerIdsForCategoryRename(
        (categoryRows ?? []) as Array<{ id: string; category: string | null }>,
        oldName
      );

      if (hasPersonalCategoryRenameTargets(matchingIds)) {
        const { error } = await this.supabase.client
          .from('personal_prayers')
          .update(personalCategoryRenameDbPayload(newName))
          .eq('user_email', userEmail)
          .in('id', matchingIds);

        if (error) {
          throw error;
        }
      }

      this.applyPersonalCategoryRenameLocally(oldName, newName);
      return true;
    } catch (error) {
      console.error('[PrayerService] Error renaming personal category:', error);
      this.toast.error('Failed to rename category');
      return false;
    }
  }

  private applyPersonalCategoryRenameLocally(oldName: string, newName: string): void {
    applyPersonalCategoryRenameSnapshot(
      {
        getPrayers: () => this.allPersonalPrayersSubject.value,
        setPrayers: (prayers) => this.setPersonalPrayersState(prayers),
      },
      oldName,
      newName
    );
  }

  /**
   * Add update to personal prayer
   */
  async addPersonalPrayerUpdate(
    personalPrayerId: string,
    content: string,
    author: string,
    authorEmail: string,
    markAsAnswered: boolean = false
  ): Promise<boolean> {
    try {
      const resolvedContent = resolvePrayerUpdateContent(content, markAsAnswered);
      if (!resolvedContent) {
        this.toast.error("Please enter update content");
        return false;
      }

      const updateData = buildPersonalPrayerUpdateInsertRow(
        personalPrayerId,
        resolvedContent,
        author,
        authorEmail,
        markAsAnswered
      );

      console.log('Adding personal prayer update with data:', updateData);

      const { data, error } = await this.supabase.client
        .from('personal_prayer_updates')
        .insert(updateData)
        .select();

      if (error) throw error;

      console.log('Personal prayer update added successfully:', data);

      // Add to observable and cache immediately (no approval needed)
      const newUpdate = mapDbPersonalPrayerUpdateRow(personalPrayerId, data[0]);
      const updatedPrayers = appendPersonalPrayerUpdate(
        this.allPersonalPrayersSubject.value,
        personalPrayerId,
        newUpdate
      );
      this.setPersonalPrayersState(updatedPrayers);

      this.toast.success('Update added to personal prayer');
      return true;
    } catch (error) {
      console.error('Error adding personal prayer update:', error);
      this.toast.error(
        `Failed to add update: ${extractSupabaseErrorMessage(error)}`
      );
      return false;
    }
  }

  /**
   * Delete personal prayer update
   */
  async deletePersonalPrayerUpdate(updateId: string): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      // Verify user owns the prayer before deleting the update
      const { error: deleteError } = await this.supabase.client
        .from('personal_prayer_updates')
        .delete()
        .eq('id', updateId)
        .eq('author_email', userEmail);

      if (deleteError) throw deleteError;

      // Update local state - remove the update from all personal prayers
      const updatedPrayers = removePersonalPrayerUpdateById(
        this.allPersonalPrayersSubject.value,
        updateId
      );
      this.setPersonalPrayersState(updatedPrayers);
      
      this.toast.success('Update deleted');
      return true;
    } catch (error) {
      console.error('Error deleting personal prayer update:', error);
      this.toast.error('Failed to delete update');
      return false;
    }
  }

  /**
   * Mark personal prayer update as answered
   */
  async markPersonalPrayerUpdateAsAnswered(updateId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('personal_prayer_updates')
        .update(markPersonalPrayerUpdateAnsweredPatch())
        .eq('id', updateId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error marking personal prayer update as answered:', error);
      this.toast.error('Failed to mark update as answered');
      return false;
    }
  }

  /**
   * Get user email from session
   */
  private withPersonalPrayerUserEmail(prayer: PrayerRequest): PrayerRequest {
    return withPersonalPrayerUserEmailRow(prayer);
  }

  private normalizePersonalPrayerCache(prayers: PrayerRequest[]): PrayerRequest[] {
    return normalizePersonalPrayerCacheRows(prayers);
  }

  private async getUserEmail(): Promise<string | null> {
    return resolvePrayerServiceUserEmail(() => this.supabase.client.auth.getSession());
  }

  /**
   * Reorder all categories based on the provided order array
   * Assigns new prefix values to match the desired order
   */
  async reorderCategories(orderedCategories: (string | null)[]): Promise<boolean> {
    return orchestratePersonalCategoryReorder(
      orderedCategories,
      this.personalCategoryOrchestrationDeps()
    );
  }

  /**
   * Swap display_order ranges between two categories
   * Used when user drags a category button to reorder categories
   * Example: If A has 2000-2999 and B has 1000-1999, swapping gives A 1000-1999 and B 2000-2999
   */
  async swapCategoryRanges(categoryA: string | null | undefined, categoryB: string | null | undefined): Promise<boolean> {
    return orchestratePersonalCategorySwap(
      categoryA,
      categoryB,
      this.personalCategoryOrchestrationDeps()
    );
  }

  /**
   * Clean up subscriptions
   */
  ngOnDestroy(): void {
    unsubscribePrayerResumeListeners(this.resumeListenerSubscriptions);
    this.resumeListenerSubscriptions = [];
    if (this.resumeRefreshTimeoutId != null) {
      clearTimeout(this.resumeRefreshTimeoutId);
      this.resumeRefreshTimeoutId = null;
    }
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
    }
  }
}
