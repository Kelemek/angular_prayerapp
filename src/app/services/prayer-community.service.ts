import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { EmailNotificationService } from './email-notification.service';
import { CacheService } from './cache.service';
import { BadgeService } from './badge.service';
import { PrayerItemReminderService } from './prayer-item-reminder.service';
import {
  COMMUNITY_PRAYERS_WITH_UPDATES_SELECT,
  formatApprovedCommunityPrayersFromDb,
  formatPrayersByMonthFromDb,
  prayersByMonthIsoRange,
  prayersByMonthOrFilter,
} from '../lib/prayer-community-load';
import {
  COMMUNITY_PRAYERS_CACHE_KEY,
  applyCommunityPrayersCacheSnapshot,
  applyCommunityLoadErrorPlan,
  publishCommunityPrayersFromDb,
  planCommunityLoadErrorFallback,
  shouldShowCommunityLoadingIndicator,
  shouldSkipCommunityPrayersDbOnSilentRefresh,
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
} from '../lib/prayer-prayed-for-increment';
import { PRAYER_SERVICE_LOAD_ERROR_TOAST_COOLDOWN_MS } from '../lib/prayer-service-constants';
import type {
  PrayerFilters,
  PrayerRequest,
  PrayerStatus,
  PrayerUpdate,
} from '../lib/prayer-types';

/** Spy-compatible callbacks owned by PrayerService so unit tests can mock the facade. */
export type PrayerCommunityFacadeHooks = {
  loadPrayers: (silentRefresh?: boolean) => Promise<void>;
  applyFilters: (filters: PrayerFilters) => void;
};

/** Community catalog, member Pray For, and community mutation orchestration. Owned by PrayerService. */
export class PrayerCommunityService {
  readonly allPrayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  readonly prayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  readonly loadingSubject = new BehaviorSubject<boolean>(true);
  readonly errorSubject = new BehaviorSubject<string | null>(null);
  currentFilters: PrayerFilters = {};
  lastLoadErrorToastTime = 0;
  private static readonly LOAD_ERROR_TOAST_COOLDOWN_MS =
    PRAYER_SERVICE_LOAD_ERROR_TOAST_COOLDOWN_MS;
  communityPrayersFetchInFlight = false;
  communityPrayersDbFetchComplete = false;

  readonly allPrayers$ = this.allPrayersSubject.asObservable();
  readonly prayers$ = this.prayersSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private emailNotification: EmailNotificationService,
    private cache: CacheService,
    private badgeService: BadgeService,
    private prayerItemReminderService: PrayerItemReminderService | undefined,
    private readonly facadeHooks: PrayerCommunityFacadeHooks
  ) {}

  getAllCommunityPrayersSnapshot(): PrayerRequest[] {
    return this.allPrayersSubject.value;
  }

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
          reapplyFilters: () => this.facadeHooks.applyFilters(this.currentFilters),
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
          reapplyFilters: () => this.facadeHooks.applyFilters(this.currentFilters),
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
        PrayerCommunityService.LOAD_ERROR_TOAST_COOLDOWN_MS
      );

      if (fallbackPlan.kind === 'use_cache') {
        console.log(
          `[PrayerService] Showing ${fallbackPlan.prayers.length} cached prayers (error fallback)`
        );
      }

      applyCommunityLoadErrorPlan(fallbackPlan, {
        setAllPrayers: (prayers) => this.allPrayersSubject.next(prayers),
        reapplyFilters: () => this.facadeHooks.applyFilters(this.currentFilters),
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
          reapplyFilters: () => this.facadeHooks.applyFilters(this.currentFilters),
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
      await this.facadeHooks.loadPrayers();
      
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
      await this.facadeHooks.loadPrayers();
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
}
