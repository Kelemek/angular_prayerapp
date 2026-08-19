import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { CacheService } from './cache.service';
import { PrayerItemReminderService } from './prayer-item-reminder.service';
import { resolvePrayerUpdateContent } from '../lib/prayer-update-content';
import { personalCategoryNamesFromPrayers } from '../lib/personal-category-order';
import {
  PERSONAL_PRAYERS_CACHE_KEY,
  applyCachedPersonalPrayersSnapshot,
  applyPersonalPrayerLoadCacheFallbackPlan,
  publishPersonalPrayersFromDb,
  planPersonalPrayerLoadCacheFallback,
  type PersonalPrayersCacheSnapshotActions,
} from '../lib/prayer-catalog-load';
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
  personalPrayersFromDbRows,
} from '../lib/prayer-personal-load';
import { extractSupabaseErrorMessage } from '../lib/prayer-error-message';
import { parsePrayedForRpcCount, patchPersonalPrayersPrayedForCount } from '../lib/prayer-prayed-for-increment';
import type { PrayerRequest, PrayerUpdate } from '../lib/prayer-types';

/** Spy-compatible callbacks owned by PrayerService so unit tests can mock the facade. */
export type PrayerPersonalFacadeHooks = {
  getUserEmail: () => Promise<string | null>;
  getCategoryRange: (
    category: string | null | undefined
  ) => Promise<CategoryDisplayOrderRange>;
  getCategoryPrayerCount: (category: string | null | undefined) => Promise<number>;
};

/** Personal catalog, categories, and personal mutation orchestration. Owned by PrayerService. */
export class PrayerPersonalService {
  readonly allPersonalPrayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  readonly loadingPersonalPrayersSubject = new BehaviorSubject<boolean>(true);
  personalPrayersDbFetchComplete = false;

  readonly allPersonalPrayers$ = this.allPersonalPrayersSubject.asObservable();
  readonly loadingPersonalPrayers$ = this.loadingPersonalPrayersSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cache: CacheService,
    private prayerItemReminderService: PrayerItemReminderService | undefined,
    private readonly facadeHooks: PrayerPersonalFacadeHooks
  ) {}

  getPersonalPrayersSnapshot(): PrayerRequest[] {
    return this.allPersonalPrayersSubject.value;
  }

  clearCatalogOnLogout(): void {
    this.allPersonalPrayersSubject.next([]);
    this.personalPrayersDbFetchComplete = true;
    this.cache.invalidate(PERSONAL_PRAYERS_CACHE_KEY);
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
      getUserEmail: () => this.facadeHooks.getUserEmail(),
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
      getCategoryRange: (category) => this.facadeHooks.getCategoryRange(category),
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
  isPersonalPrayerDisplayOrderOnlyChange(
    oldRow: Record<string, unknown> | undefined,
    newRow: Record<string, unknown> | undefined
  ): boolean {
    return isPersonalPrayerDisplayOrderOnlyDbChange(oldRow, newRow);
  }

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
      getCategoryCount: (category) => this.facadeHooks.getCategoryPrayerCount(category),
      getCategoryRange: (category) => this.facadeHooks.getCategoryRange(category),
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

  async getCategoryRange(
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
  async getCategoryPrayerCount(category: string | null | undefined): Promise<number> {
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
    return this.facadeHooks.getUserEmail();
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

}
