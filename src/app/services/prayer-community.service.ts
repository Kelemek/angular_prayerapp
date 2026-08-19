import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { EmailNotificationService } from './email-notification.service';
import { CacheService } from './cache.service';
import { BadgeService } from './badge.service';
import { PrayerItemReminderService } from './prayer-item-reminder.service';
import {
  formatPrayersByMonthFromDb,
  prayersByMonthIsoRange,
} from '../lib/prayer-community-load';
import { COMMUNITY_PRAYERS_CACHE_KEY } from '../lib/prayer-catalog-load';
import {
  buildCommunityPrayerInsertRow,
  buildCommunityPrayerAdminNotificationPayload,
  buildCommunityPrayerStatusUpdatePayload,
  afterCommunityPendingUpdateInserted,
  ensureEmailSubscriberForPrayerSubmit,
  patchCommunityPrayerStatus,
  applyCommunityPrayerDeleteSnapshot,
  shouldDropCommunityReminderForStatus,
  type CommunityUpdateSubmitData,
} from '../lib/prayer-community-mutations';
import {
  notifyPrayerDeletionRequestSubmitted,
  notifyUpdateDeletionRequestSubmitted,
  type PrayerDeletionRequestInput,
  type UpdateDeletionRequestInput,
} from '../lib/prayer-community-deletion-requests';
import {
  deleteCommunityPrayerRow,
  deleteCommunityPrayerUpdateRow,
  deleteMemberPrayerUpdateRow,
  fetchApprovedCommunityPrayers,
  fetchCommunityPrayerTitle,
  fetchCommunityPrayersByMonth,
  fetchMemberPrayedForCountsBatch,
  fetchMemberPrayerUpdatesBatch,
  fetchMemberPrayerUpdatesForPerson,
  fetchPrayerRowForDeletionNotify,
  fetchPrayerUpdateRowForDeletionNotify,
  findEmailSubscriberByEmail,
  insertCommunityPrayerRow,
  insertEmailSubscriberRow,
  insertMemberPrayerUpdateRow,
  insertPendingCommunityPrayerUpdate,
  insertPendingCommunityUpdate,
  insertPrayerDeletionRequestRow,
  insertUpdateDeletionRequestRow,
  rpcIncrementCommunityPrayedFor,
  rpcIncrementMemberPrayedFor,
  updateCommunityPrayerStatusRow,
  updateMemberPrayerUpdateRow,
} from '../lib/prayer-community-db';
import { runCommunityPrayerCatalogLoad } from '../lib/prayer-community-load-wire';
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
    return runCommunityPrayerCatalogLoad(
      {
        readCache: () => this.cache.get<PrayerRequest[]>(COMMUNITY_PRAYERS_CACHE_KEY),
        setFetchInFlight: (inFlight) => {
          this.communityPrayersFetchInFlight = inFlight;
        },
        markDbFetchComplete: () => {
          this.communityPrayersDbFetchComplete = true;
        },
        setAllPrayersInMemory: (prayers) => this.allPrayersSubject.next(prayers),
        setCache: (prayers) => this.cache.set(COMMUNITY_PRAYERS_CACHE_KEY, prayers),
        reapplyFilters: () => this.facadeHooks.applyFilters(this.currentFilters),
        setLoading: (loading) => this.loadingSubject.next(loading),
        setError: (message) => this.errorSubject.next(message),
        refreshBadges: () => this.badgeService.refreshBadgeCounts(),
        emitErrorToast: () => {
          this.lastLoadErrorToastTime = Date.now();
          this.toast.error('Failed to load prayers');
        },
        getLastErrorToastTime: () => this.lastLoadErrorToastTime,
        loadErrorToastCooldownMs: PrayerCommunityService.LOAD_ERROR_TOAST_COOLDOWN_MS,
        isFetchInFlight: () => this.communityPrayersFetchInFlight,
        fetchApprovedFromDb: async () => {
          const { data, error } = await fetchApprovedCommunityPrayers(
            this.supabase.client
          );
          if (error) throw error;
          return data || [];
        },
      },
      silentRefresh
    );
  }

  async getPrayersByMonth(year: number, month: number): Promise<PrayerRequest[]> {
    try {
      const { startDate, endDate } = prayersByMonthIsoRange(year, month);
      const { data: prayersData, error } = await fetchCommunityPrayersByMonth(
        this.supabase.client,
        startDate,
        endDate
      );
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

  async addPrayer(
    prayer: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates'>
  ): Promise<boolean> {
    try {
      const prayerData = buildCommunityPrayerInsertRow(prayer);
      const { data, error } = await insertCommunityPrayerRow(
        this.supabase.client,
        prayerData
      );
      if (error) throw error;
      if (!data) throw new Error('Prayer insert returned no row');

      if (prayer.email) {
        try {
          await ensureEmailSubscriberForPrayerSubmit(
            prayer.requester,
            prayer.email,
            async (normalizedEmail) => {
              const { data: existing } = await findEmailSubscriberByEmail(
                this.supabase.client,
                normalizedEmail
              );
              return existing;
            },
            async (row) => {
              const { error: insertError } = await insertEmailSubscriberRow(
                this.supabase.client,
                row
              );
              if (insertError) throw insertError;
            }
          );
        } catch (subscribeError) {
          console.error('Failed to auto-subscribe user:', subscribeError);
        }
      }

      this.emailNotification
        .sendAdminNotification(
          buildCommunityPrayerAdminNotificationPayload(prayer, data.id)
        )
        .catch((err) => console.error('Failed to send admin notification:', err));

      this.toast.success('Prayer request submitted for approval');
      return true;
    } catch (error) {
      console.error('Error adding prayer:', error);
      this.toast.error('Failed to submit prayer request');
      return false;
    }
  }

  async updatePrayerStatus(id: string, status: PrayerStatus): Promise<boolean> {
    try {
      const { error } = await updateCommunityPrayerStatusRow(
        this.supabase.client,
        id,
        buildCommunityPrayerStatusUpdatePayload(status)
      );
      if (error) throw error;

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

  async incrementPrayedFor(prayerId: string): Promise<number | null> {
    try {
      const { data: newCount, error } = await rpcIncrementCommunityPrayedFor(
        this.supabase.client,
        prayerId
      );
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

  async incrementMemberPrayedFor(personId: string): Promise<number | null> {
    try {
      const trimmedId = trimMemberPersonId(personId);
      if (!trimmedId) {
        return null;
      }

      const { data: newCount, error } = await rpcIncrementMemberPrayedFor(
        this.supabase.client,
        trimmedId
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

  async getMemberPrayedForCountsBatch(personIds: string[]): Promise<Record<string, number>> {
    try {
      if (personIds.length === 0) {
        return {};
      }

      const { data, error } = await fetchMemberPrayedForCountsBatch(
        this.supabase.client,
        personIds
      );
      if (error) throw error;

      const countsMap = memberPrayedForCountsFromRows(data || []);
      this.cache.set(MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY, countsMap);
      return countsMap;
    } catch (error) {
      console.error('Error fetching batch member prayed-for counts:', error);
      return {};
    }
  }

  async addPrayerUpdate(prayerId: string, content: string, author: string): Promise<boolean> {
    try {
      const { data, error } = await insertPendingCommunityPrayerUpdate(
        this.supabase.client,
        prayerId,
        content,
        author
      );
      if (error) throw error;
      if (!data) throw new Error('Prayer update insert returned no row');

      await afterCommunityPendingUpdateInserted(
        prayerId,
        author,
        content,
        data.id,
        async (id) => {
          const { data: prayer } = await fetchCommunityPrayerTitle(
            this.supabase.client,
            id
          );
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

  async addMemberPrayerUpdate(
    personId: string,
    memberName: string,
    content: string,
    author: string,
    authorEmail: string = '',
    isAnswered: boolean = false,
    listId?: string
  ): Promise<boolean> {
    return runMemberPrayerCacheMutation(
      async () => {
        const { error } = await insertMemberPrayerUpdateRow(
          this.supabase.client,
          personId,
          content,
          isAnswered
        );
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

  async getMemberPrayerUpdatesBatch(personIds: string[]): Promise<Record<string, any[]>> {
    try {
      if (personIds.length === 0) {
        return {};
      }

      const { data, error } = await fetchMemberPrayerUpdatesBatch(
        this.supabase.client,
        personIds
      );
      if (error) throw error;

      const updatesMap = groupMemberPrayerUpdatesByPersonId(data || []);
      this.cache.set(MEMBER_PRAYER_UPDATES_CACHE_KEY, updatesMap);

      console.log(`[PrayerService] Batch loaded updates for ${personIds.length} members`);
      return updatesMap;
    } catch (error) {
      console.error('Error fetching batch member prayer updates:', error);
      return {};
    }
  }

  async getMemberPrayerUpdates(personId: string): Promise<any[]> {
    try {
      const cachedUpdates = this.cache.get(MEMBER_PRAYER_UPDATES_CACHE_KEY) as
        | Record<string, any[]>
        | undefined;
      const cachedForPerson = memberUpdatesCacheForPerson(cachedUpdates, personId);
      if (cachedForPerson) {
        return cachedForPerson;
      }

      const { data, error } = await fetchMemberPrayerUpdatesForPerson(
        this.supabase.client,
        personId
      );
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

  clearPlanningCenterListDataCache(listId: string): void {
    this.cache.invalidate(planningCenterListDataCacheKey(listId));
  }

  async deleteMemberPrayerUpdate(
    updateId: string,
    personId: string,
    listId?: string
  ): Promise<boolean> {
    return runMemberPrayerCacheMutation(
      async () => {
        const { error } = await deleteMemberPrayerUpdateRow(
          this.supabase.client,
          updateId
        );
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

  async updateMemberPrayerUpdate(
    updateId: string,
    personId: string,
    updates: Partial<PrayerUpdate>,
    listId?: string
  ): Promise<boolean> {
    return runMemberPrayerCacheMutation(
      async () => {
        const { error } = await updateMemberPrayerUpdateRow(
          this.supabase.client,
          updateId,
          updates
        );
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

  async deletePrayer(id: string): Promise<boolean> {
    try {
      const { error } = await deleteCommunityPrayerRow(this.supabase.client, id);
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

  async deletePrayerUpdate(updateId: string): Promise<boolean> {
    try {
      const { error } = await deleteCommunityPrayerUpdateRow(
        this.supabase.client,
        updateId
      );
      if (error) throw error;

      await this.facadeHooks.loadPrayers();
      this.toast.success('Update deleted');
      return true;
    } catch (error) {
      console.error('Error deleting prayer update:', error);
      this.toast.error('Failed to delete update');
      return false;
    }
  }

  getFilteredPrayers(filters: PrayerFilters): PrayerRequest[] {
    return filterPrayerRequestsByStatusAndSearch(this.prayersSubject.value, filters);
  }

  private invalidateMemberPrayerCaches(listId?: string): void {
    for (const key of memberPrayerCacheKeysToInvalidate(listId)) {
      this.cache.invalidate(key);
    }
  }

  async addUpdate(updateData: CommunityUpdateSubmitData): Promise<boolean> {
    try {
      const { data, error } = await insertPendingCommunityUpdate(
        this.supabase.client,
        updateData
      );
      if (error) throw error;
      if (!data) throw new Error('Prayer update insert returned no row');

      await afterCommunityPendingUpdateInserted(
        updateData.prayer_id,
        updateData.author,
        updateData.content,
        data.id,
        async (id) => {
          const { data: prayer } = await fetchCommunityPrayerTitle(
            this.supabase.client,
            id
          );
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

  async deleteUpdate(updateId: string): Promise<boolean> {
    try {
      const { error } = await deleteCommunityPrayerUpdateRow(
        this.supabase.client,
        updateId
      );
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

  async requestDeletion(requestData: PrayerDeletionRequestInput): Promise<boolean> {
    try {
      const { data, error } = await insertPrayerDeletionRequestRow(
        this.supabase.client,
        requestData
      );
      if (error) throw error;

      await notifyPrayerDeletionRequestSubmitted(
        requestData,
        data?.id,
        async () => {
          const { data: prayerRow } = await fetchPrayerRowForDeletionNotify(
            this.supabase.client,
            requestData.prayer_id
          );
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

  async requestUpdateDeletion(requestData: UpdateDeletionRequestInput): Promise<boolean> {
    try {
      const { data, error } = await insertUpdateDeletionRequestRow(
        this.supabase.client,
        requestData
      );
      if (error) throw error;

      await notifyUpdateDeletionRequestSubmitted(
        requestData,
        data?.id,
        async () => {
          const { data: updateRow } = await fetchPrayerUpdateRowForDeletionNotify(
            this.supabase.client,
            requestData.update_id
          );
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
