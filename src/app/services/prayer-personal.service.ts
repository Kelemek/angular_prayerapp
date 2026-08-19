import { BehaviorSubject } from "rxjs";
import { SupabaseService } from "./supabase.service";
import { ToastService } from "./toast.service";
import { CacheService } from "./cache.service";
import { PrayerItemReminderService } from "./prayer-item-reminder.service";
import { resolvePrayerUpdateContent } from "../lib/prayer-update-content";
import { personalCategoryNamesFromPrayers } from "../lib/personal-category-order";
import {
  PERSONAL_PRAYERS_CACHE_KEY,
  type PersonalPrayersCacheSnapshotActions,
} from "../lib/prayer-catalog-load";
import { validatePersonalCategoryRename } from "../lib/prayer-personal-category";
import {
  applyPersonalCategoryRenameSnapshot,
  orchestratePersonalCategoryReorder,
  orchestratePersonalCategorySwap,
  orchestratePersonalPrayerOrderUpdate,
} from "../lib/prayer-personal-category-orchestrate";
import {
  buildPersonalCategoryOrchestrationDeps,
  createPersonalCategoryDeps,
  fetchPersonalCategoryPrayerCountForUser,
  fetchPersonalCategoryRangeForUser,
  type PersonalCategoryQueryWireDeps,
} from "../lib/prayer-personal-category-wire";
import { planPersonalPrayerAdd } from "../lib/prayer-personal-add-plan";
import { resolvePersonalPrayerCategoryChangeDisplayOrder } from "../lib/prayer-personal-update-category-plan";
import {
  isPersonalPrayerDisplayOrderOnlyChange as isPersonalPrayerDisplayOrderOnlyDbChange,
  normalizePersonalPrayerCache as normalizePersonalPrayerCacheRows,
  personalPrayerRowToPrayerRequest,
  sanitizePersonalPrayerCategory,
  withPersonalPrayerUserEmail as withPersonalPrayerUserEmailRow,
} from "../lib/prayer-personal-display";
import {
  appendPersonalPrayerUpdate,
  applyPersonalPrayerFieldUpdate,
  buildPersonalPrayerDbUpdatePayload,
  buildPersonalPrayerInsertRow,
  buildPersonalPrayerUpdateInsertRow,
  mapDbPersonalPrayerUpdateRow,
  personalPrayerRequestFromInsertedRow,
  patchPersonalPrayerUpdateLocally,
  personalPrayerUpdatePatchWithTimestamp,
  personalPrayerListAfterInsert,
  removePersonalPrayerById,
  removePersonalPrayerUpdateById,
} from "../lib/prayer-personal-mutations";
import {
  personalPrayerUpdateClearsAnsweredFlags,
  shouldDropPersonalPrayerRemindersAfterUpdate,
  startPersonalPrayerUpdatePlan,
} from "../lib/prayer-personal-update-plan";
import {
  hasPersonalCategoryRenameTargets,
  matchingPersonalPrayerIdsForCategoryRename,
} from "../lib/prayer-personal-rename";
import {
  answeredPersonalPrayerIds,
  personalPrayersFromDbRows,
} from "../lib/prayer-personal-load";
import {
  clearPersonalPrayerUpdateAnsweredFlags,
  deletePersonalPrayerRow,
  deletePersonalPrayerUpdateRow,
  fetchPersonalPrayerCategoryIdRows,
  fetchPersonalPrayersList,
  insertPersonalPrayerRow,
  insertPersonalPrayerUpdateRow,
  markPersonalPrayerUpdateAnsweredRow,
  renamePersonalPrayerCategoriesByIds,
  rpcIncrementPersonalPrayedFor,
  updatePersonalPrayerRow,
  updatePersonalPrayerUpdateRow,
} from "../lib/prayer-personal-db";
import { runPersonalPrayerCatalogLoad } from "../lib/prayer-personal-load-wire";
import { extractSupabaseErrorMessage } from "../lib/prayer-error-message";
import {
  parsePrayedForRpcCount,
  patchPersonalPrayersPrayedForCount,
} from "../lib/prayer-prayed-for-increment";
import type { PrayerRequest, PrayerUpdate } from "../lib/prayer-types";

/** Spy-compatible callback owned by PrayerService so unit tests can mock session email. */
export type PrayerPersonalFacadeHooks = {
  getUserEmail: () => Promise<string | null>;
};

/** Personal catalog, categories, and personal mutation orchestration. Owned by PrayerService. */
export class PrayerPersonalService {
  readonly allPersonalPrayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  readonly loadingPersonalPrayersSubject = new BehaviorSubject<boolean>(true);
  personalPrayersDbFetchComplete = false;

  readonly allPersonalPrayers$ = this.allPersonalPrayersSubject.asObservable();
  readonly loadingPersonalPrayers$ =
    this.loadingPersonalPrayersSubject.asObservable();

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

  private dropRemindersForAnsweredPersonalPrayers(
    prayers: PrayerRequest[]
  ): void {
    for (const prayerId of answeredPersonalPrayerIds(prayers)) {
      this.prayerItemReminderService?.dropRemindersForPrayer(
        prayerId,
        "personal"
      );
    }
  }

  private setPersonalPrayersState(prayers: PrayerRequest[]): void {
    this.allPersonalPrayersSubject.next(prayers);
    this.cache.set(PERSONAL_PRAYERS_CACHE_KEY, prayers);
  }

  private personalCacheSnapshotActions(): PersonalPrayersCacheSnapshotActions {
    return {
      normalize: (prayers) => this.normalizePersonalPrayerCache(prayers),
      setPersonalPrayers: (prayers) =>
        this.allPersonalPrayersSubject.next(prayers),
      dropAnsweredReminders: (prayers) =>
        this.dropRemindersForAnsweredPersonalPrayers(prayers),
    };
  }

  private categoryQueryDeps(): PersonalCategoryQueryWireDeps {
    return {
      client: this.supabase.client,
      getUserEmail: () => this.getUserEmail(),
    };
  }

  private personalCategoryOrchestrationDeps() {
    return buildPersonalCategoryOrchestrationDeps({
      queryDeps: this.categoryQueryDeps(),
      getUserEmail: () => this.getUserEmail(),
      getPrayers: () => this.allPersonalPrayersSubject.value,
      setPrayers: (prayers) => this.setPersonalPrayersState(prayers),
      getCategoryRange: (category) => this.getCategoryRange(category),
    });
  }

  private personalCategoryDeps() {
    return createPersonalCategoryDeps(
      this.categoryQueryDeps(),
      (category) => this.getCategoryPrayerCount(category),
      (category) => this.getCategoryRange(category)
    );
  }

  private async fetchPersonalPrayersFromDb(
    userEmail: string
  ): Promise<PrayerRequest[]> {
    const { data, error } = await fetchPersonalPrayersList(
      this.supabase.client,
      userEmail
    );
    if (error) throw error;
    return personalPrayersFromDbRows(
      data || [],
      (row) => personalPrayerRowToPrayerRequest(row as never),
      (prayers) => this.normalizePersonalPrayerCache(prayers)
    );
  }

  /** True when a personal_prayers UPDATE only reordered a row (drag-and-drop). */
  isPersonalPrayerDisplayOrderOnlyChange(
    oldRow: Record<string, unknown> | undefined,
    newRow: Record<string, unknown> | undefined
  ): boolean {
    return isPersonalPrayerDisplayOrderOnlyDbChange(oldRow, newRow);
  }

  async loadPersonalPrayers(silentRefresh = false): Promise<void> {
    return runPersonalPrayerCatalogLoad(
      {
        getUserEmail: () => this.getUserEmail(),
        readCache: () =>
          this.cache.get<PrayerRequest[]>(PERSONAL_PRAYERS_CACHE_KEY),
        invalidateCache: () => this.cache.invalidate(PERSONAL_PRAYERS_CACHE_KEY),
        setLoading: (loading) =>
          this.loadingPersonalPrayersSubject.next(loading),
        markFetchComplete: () => {
          this.personalPrayersDbFetchComplete = true;
        },
        setPersonalPrayers: (prayers) => this.setPersonalPrayersState(prayers),
        clearPersonalPrayersInMemory: () =>
          this.allPersonalPrayersSubject.next([]),
        cacheSnapshotActions: () => this.personalCacheSnapshotActions(),
        fetchFromDb: (email) => this.fetchPersonalPrayersFromDb(email),
        dropAnsweredReminders: (prayers) =>
          this.dropRemindersForAnsweredPersonalPrayers(prayers),
      },
      silentRefresh
    );
  }

  async incrementPersonalPrayedFor(prayerId: string): Promise<number | null> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        return null;
      }

      const { data: newCount, error } = await rpcIncrementPersonalPrayedFor(
        this.supabase.client,
        prayerId,
        userEmail
      );
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
      console.error("[PrayerService] incrementPersonalPrayedFor failed", err);
      return null;
    }
  }

  private sanitizeCategory(category: string | null | undefined): string | null {
    return sanitizePersonalPrayerCategory(category);
  }

  async getCategoryRange(category: string | null | undefined) {
    return fetchPersonalCategoryRangeForUser(
      this.categoryQueryDeps(),
      category
    );
  }

  async getCategoryPrayerCount(category: string | null | undefined) {
    return fetchPersonalCategoryPrayerCountForUser(
      this.categoryQueryDeps(),
      category
    );
  }

  async getPersonalPrayers(
    forceRefresh: boolean = false
  ): Promise<PrayerRequest[]> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.error("User email not available");
        return [];
      }

      if (!forceRefresh) {
        const cached = this.cache.get<PrayerRequest[]>(
          PERSONAL_PRAYERS_CACHE_KEY
        );
        if (cached) {
          return this.normalizePersonalPrayerCache(cached);
        }
      }

      const prayers = await this.fetchPersonalPrayersFromDb(userEmail);
      this.cache.set(PERSONAL_PRAYERS_CACHE_KEY, prayers);

      return prayers;
    } catch (error) {
      console.error("[PrayerService] Failed to load personal prayers:", error);
      return [];
    }
  }

  async addPersonalPrayer(
    prayer: Omit<
      PrayerRequest,
      | "id"
      | "date_requested"
      | "created_at"
      | "updated_at"
      | "updates"
      | "approval_status"
    >
  ): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error("User email not available");
        return false;
      }

      console.log("Adding personal prayer for email:", userEmail);

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

      const { data, error } = await insertPersonalPrayerRow(
        this.supabase.client,
        prayerData
      );
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

      this.toast.success("Personal prayer added successfully");
      return true;
    } catch (error) {
      console.error("Error adding personal prayer:", error);
      this.toast.error(
        `Failed to add personal prayer: ${extractSupabaseErrorMessage(error)}`
      );
      return false;
    }
  }

  async deletePersonalPrayer(id: string): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error("User email not available");
        return false;
      }

      const { error } = await deletePersonalPrayerRow(
        this.supabase.client,
        id,
        userEmail
      );
      if (error) throw error;

      const updatedPersonalPrayers = removePersonalPrayerById(
        this.allPersonalPrayersSubject.value,
        id
      );
      this.setPersonalPrayersState(updatedPersonalPrayers);
      this.prayerItemReminderService?.dropRemindersForPrayer(id, "personal");

      this.toast.success("Personal prayer deleted");
      return true;
    } catch (error) {
      console.error("Error deleting personal prayer:", error);
      this.toast.error("Failed to delete personal prayer");
      return false;
    }
  }

  async updatePersonalPrayer(
    id: string,
    updates: Partial<
      Pick<PrayerRequest, "title" | "prayer_for" | "description" | "category">
    >,
    options?: { silentSuccess?: boolean }
  ): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error("User email not available");
        return false;
      }

      const startPlan = startPersonalPrayerUpdatePlan(
        this.allPersonalPrayersSubject.value,
        id,
        updates,
        (category) => this.sanitizeCategory(category)
      );
      if (!startPlan.ok) {
        this.toast.error("Prayer not found");
        return false;
      }

      const { currentPrayer, newCategory, categoryChanged } = startPlan;

      const categoryChangePlan =
        await resolvePersonalPrayerCategoryChangeDisplayOrder(
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
        const { error: clearFlagsError } =
          await clearPersonalPrayerUpdateAnsweredFlags(
            this.supabase.client,
            id
          );

        if (clearFlagsError) {
          console.error(
            "Error clearing mark_as_answered on personal prayer updates:",
            clearFlagsError
          );
          this.toast.error(
            "Could not clear answered flags on updates. Prayer was left marked as answered."
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
      const updatedAt = updateData["updated_at"] as string;

      const { error } = await updatePersonalPrayerRow(
        this.supabase.client,
        id,
        userEmail,
        updateData
      );
      if (error) throw error;

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
        this.prayerItemReminderService?.dropRemindersForPrayer(id, "personal");
      }

      console.log("[PrayerService] Personal prayer updated successfully");
      if (!options?.silentSuccess) {
        this.toast.success("Personal prayer updated");
      }
      return true;
    } catch (error) {
      console.error("Error updating personal prayer:", error);
      this.toast.error("Failed to update personal prayer");
      return false;
    }
  }

  async updatePersonalPrayerOrder(
    prayers: PrayerRequest[],
    categoryFilter?: string
  ): Promise<boolean> {
    return orchestratePersonalPrayerOrderUpdate(
      prayers,
      this.personalCategoryOrchestrationDeps()
    );
  }

  async updatePersonalPrayerUpdate(
    updateId: string,
    prayerId: string,
    updates: Partial<Pick<PrayerUpdate, "content" | "mark_as_answered">>
  ): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error("User email not available");
        return false;
      }

      const updateData = personalPrayerUpdatePatchWithTimestamp(updates);

      const { error } = await updatePersonalPrayerUpdateRow(
        this.supabase.client,
        updateId,
        updateData
      );
      if (error) throw error;

      const updatedPrayers = patchPersonalPrayerUpdateLocally(
        this.allPersonalPrayersSubject.value,
        prayerId,
        updateId,
        updates
      );
      this.setPersonalPrayersState(updatedPrayers);

      console.log(
        "[PrayerService] Personal prayer update updated successfully"
      );
      return true;
    } catch (error) {
      console.error("Error updating personal prayer update:", error);
      this.toast.error("Failed to update prayer update");
      return false;
    }
  }

  async getUniqueCategoriesForUser(
    prayers?: PrayerRequest[]
  ): Promise<string[]> {
    const personalPrayers = prayers ?? this.allPersonalPrayersSubject.value;
    return personalCategoryNamesFromPrayers(personalPrayers);
  }

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
        this.toast.error("User email not available");
        return false;
      }

      const { data: categoryRows, error: selectError } =
        await fetchPersonalPrayerCategoryIdRows(
          this.supabase.client,
          userEmail
        );
      if (selectError) {
        throw selectError;
      }

      const matchingIds = matchingPersonalPrayerIdsForCategoryRename(
        categoryRows ?? [],
        oldName
      );

      if (hasPersonalCategoryRenameTargets(matchingIds)) {
        const { error } = await renamePersonalPrayerCategoriesByIds(
          this.supabase.client,
          userEmail,
          matchingIds,
          newName
        );
        if (error) {
          throw error;
        }
      }

      applyPersonalCategoryRenameSnapshot(
        {
          getPrayers: () => this.allPersonalPrayersSubject.value,
          setPrayers: (prayers) => this.setPersonalPrayersState(prayers),
        },
        oldName,
        newName
      );
      return true;
    } catch (error) {
      console.error("[PrayerService] Error renaming personal category:", error);
      this.toast.error("Failed to rename category");
      return false;
    }
  }

  async addPersonalPrayerUpdate(
    personalPrayerId: string,
    content: string,
    author: string,
    authorEmail: string,
    markAsAnswered: boolean = false
  ): Promise<boolean> {
    try {
      const resolvedContent = resolvePrayerUpdateContent(
        content,
        markAsAnswered
      );
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

      console.log("Adding personal prayer update with data:", updateData);

      const { data, error } = await insertPersonalPrayerUpdateRow(
        this.supabase.client,
        updateData
      );
      if (error) throw error;

      console.log("Personal prayer update added successfully:", data);

      const newUpdate = mapDbPersonalPrayerUpdateRow(
        personalPrayerId,
        data![0] as Parameters<typeof mapDbPersonalPrayerUpdateRow>[1]
      );
      const updatedPrayers = appendPersonalPrayerUpdate(
        this.allPersonalPrayersSubject.value,
        personalPrayerId,
        newUpdate
      );
      this.setPersonalPrayersState(updatedPrayers);

      this.toast.success("Update added to personal prayer");
      return true;
    } catch (error) {
      console.error("Error adding personal prayer update:", error);
      this.toast.error(
        `Failed to add update: ${extractSupabaseErrorMessage(error)}`
      );
      return false;
    }
  }

  async deletePersonalPrayerUpdate(updateId: string): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error("User email not available");
        return false;
      }

      const { error: deleteError } = await deletePersonalPrayerUpdateRow(
        this.supabase.client,
        updateId,
        userEmail
      );
      if (deleteError) throw deleteError;

      const updatedPrayers = removePersonalPrayerUpdateById(
        this.allPersonalPrayersSubject.value,
        updateId
      );
      this.setPersonalPrayersState(updatedPrayers);

      this.toast.success("Update deleted");
      return true;
    } catch (error) {
      console.error("Error deleting personal prayer update:", error);
      this.toast.error("Failed to delete update");
      return false;
    }
  }

  async markPersonalPrayerUpdateAsAnswered(updateId: string): Promise<boolean> {
    try {
      const { error } = await markPersonalPrayerUpdateAnsweredRow(
        this.supabase.client,
        updateId
      );
      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error marking personal prayer update as answered:", error);
      this.toast.error("Failed to mark update as answered");
      return false;
    }
  }

  private withPersonalPrayerUserEmail(prayer: PrayerRequest): PrayerRequest {
    return withPersonalPrayerUserEmailRow(prayer);
  }

  private normalizePersonalPrayerCache(
    prayers: PrayerRequest[]
  ): PrayerRequest[] {
    return normalizePersonalPrayerCacheRows(prayers);
  }

  private async getUserEmail(): Promise<string | null> {
    return this.facadeHooks.getUserEmail();
  }

  async reorderCategories(
    orderedCategories: (string | null)[]
  ): Promise<boolean> {
    return orchestratePersonalCategoryReorder(
      orderedCategories,
      this.personalCategoryOrchestrationDeps()
    );
  }

  async swapCategoryRanges(
    categoryA: string | null | undefined,
    categoryB: string | null | undefined
  ): Promise<boolean> {
    return orchestratePersonalCategorySwap(
      categoryA,
      categoryB,
      this.personalCategoryOrchestrationDeps()
    );
  }
}
