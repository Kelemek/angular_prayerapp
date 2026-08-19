import { Injectable, Optional } from "@angular/core";
import { distinctUntilChanged, type Subscription } from "rxjs";
import { SupabaseService } from "./supabase.service";
import { ToastService } from "./toast.service";
import { EmailNotificationService } from "./email-notification.service";
import { VerificationService } from "./verification.service";
import { CacheService } from "./cache.service";
import { BadgeService } from "./badge.service";
import { UserSessionService } from "./user-session.service";
import { PrayerItemReminderService } from "./prayer-item-reminder.service";
import { PrayerCommunityService } from "./prayer-community.service";
import { PrayerPersonalService } from "./prayer-personal.service";
import { COMMUNITY_PRAYERS_CACHE_KEY } from "../lib/prayer-catalog-load";
import { arePrayerCatalogsReadyFromFlags } from "../lib/prayer-personal-load";
import {
  clearTimeoutIdMap,
  mergePrayerResumeListenerSubscriptions,
  runResumeCommunityPrayerRefresh,
  scheduleDebouncedResumeRefresh,
  unsubscribePrayerResumeListeners,
  wirePrayerResumeListeners,
} from "../lib/prayer-service-resume";
import { subscribePrayerCatalogRealtime } from "../lib/prayer-service-realtime";
import { buildPrayerCatalogRealtimeHandlers } from "../lib/prayer-service-realtime-handlers";
import {
  PRAYER_SERVICE_INACTIVITY_THRESHOLD_MS,
  PRAYER_SERVICE_RESUME_REFRESH_DEBOUNCE_MS,
} from "../lib/prayer-service-constants";
import {
  personalPrayerSessionAction,
  userSessionEmailDistinctEqual,
} from "../lib/prayer-service-session-wire";
import { resolvePrayerServiceUserEmail } from "../lib/prayer-service-user-email";
import type {
  PrayerFilters,
  PrayerRequest,
  PrayerStatus,
  PrayerUpdate,
} from "../lib/prayer-types";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type { PrayerFilters, PrayerRequest, PrayerStatus, PrayerUpdate };

@Injectable({
  providedIn: "root",
})
export class PrayerService {
  private readonly community: PrayerCommunityService;
  private readonly personal: PrayerPersonalService;

  private realtimeChannel: RealtimeChannel | null = null;
  private inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
  private inactivityThresholdMs = PRAYER_SERVICE_INACTIVITY_THRESHOLD_MS;
  private backgroundRecoveryTimeouts: Map<string, number> = new Map();
  private isInBackground = document.hidden;
  private resumeRefreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private resumeListenerSubscriptions: Subscription[] = [];
  private static readonly RESUME_REFRESH_DEBOUNCE_MS =
    PRAYER_SERVICE_RESUME_REFRESH_DEBOUNCE_MS;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private emailNotification: EmailNotificationService,
    private verificationService: VerificationService,
    private cache: CacheService,
    badgeService: BadgeService,
    private userSessionService: UserSessionService,
    @Optional() private prayerItemReminderService?: PrayerItemReminderService
  ) {
    this.community = new PrayerCommunityService(
      supabase,
      toast,
      emailNotification,
      cache,
      badgeService,
      prayerItemReminderService,
      {
        loadPrayers: (silentRefresh) => this.loadPrayers(silentRefresh),
        applyFilters: (filters) => this.applyFilters(filters),
      }
    );
    this.personal = new PrayerPersonalService(
      supabase,
      toast,
      cache,
      prayerItemReminderService,
      {
        getUserEmail: () => this.getUserEmail(),
      }
    );
    this.initializePrayers();
  }

  get allPrayers$() {
    return this.community.allPrayers$;
  }
  get prayers$() {
    return this.community.prayers$;
  }
  get loading$() {
    return this.community.loading$;
  }
  get error$() {
    return this.community.error$;
  }
  get allPersonalPrayers$() {
    return this.personal.allPersonalPrayers$;
  }
  get loadingPersonalPrayers$() {
    return this.personal.loadingPersonalPrayers$;
  }

  /** Spec-compatible aliases for private catalog state. */

  getAllCommunityPrayersSnapshot(): PrayerRequest[] {
    return this.community.getAllCommunityPrayersSnapshot();
  }

  getPersonalPrayersSnapshot(): PrayerRequest[] {
    return this.personal.getPersonalPrayersSnapshot();
  }

  arePrayerCatalogsReady(): boolean {
    return arePrayerCatalogsReadyFromFlags({
      loadingCommunity: this.community.loadingSubject.value,
      loadingPersonal: this.personal.loadingPersonalPrayersSubject.value,
      communityFetchInFlight: this.community.communityPrayersFetchInFlight,
      communityDbComplete: this.community.communityPrayersDbFetchComplete,
      personalDbComplete: this.personal.personalPrayersDbFetchComplete,
    });
  }

  private async initializePrayers(): Promise<void> {
    await this.loadPrayers();

    this.userSessionService.userSession$
      .pipe(distinctUntilChanged(userSessionEmailDistinctEqual))
      .subscribe((session) => {
        const action = personalPrayerSessionAction(session);
        if (action === "load") {
          this.personal.personalPrayersDbFetchComplete = false;
          this.loadPersonalPrayers().catch((err) =>
            console.error(
              "[PrayerService] Error loading personal prayers on session change:",
              err
            )
          );
        } else {
          this.personal.clearCatalogOnLogout();
        }
      });

    this.setupRealtimeSubscription();
    this.setupResumeListeners();
  }

  async loadPrayers(silentRefresh = false): Promise<void> {
    return this.community.loadPrayers(silentRefresh);
  }

  async loadPersonalPrayers(silentRefresh = false): Promise<void> {
    return this.personal.loadPersonalPrayers(silentRefresh);
  }

  async getPrayersByMonth(
    year: number,
    month: number
  ): Promise<PrayerRequest[]> {
    return this.community.getPrayersByMonth(year, month);
  }

  private setupResumeListeners(): void {
    const added = wirePrayerResumeListeners({
      scheduleResumeRefresh: () => this.scheduleResumeRefresh(),
      onEnterBackground: () => {
        this.isInBackground = true;
        console.log(
          "[PrayerService] App going to background - pausing aggressive operations"
        );
        clearTimeoutIdMap(this.backgroundRecoveryTimeouts);
      },
      onLeaveBackground: () => {
        this.isInBackground = false;
        console.log(
          "[PrayerService] App returning from background - triggering recovery"
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

  private setupInactivityListener(): void {
    this.setupResumeListeners();
  }

  private setupBackgroundRecoveryListener(): void {
    this.setupResumeListeners();
  }

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

  private async runResumeRefresh(): Promise<void> {
    await runResumeCommunityPrayerRefresh({
      readCachedPrayers: () =>
        this.cache.get<PrayerRequest[]>(COMMUNITY_PRAYERS_CACHE_KEY),
      onShowCachedPrayers: (cached) => {
        this.community.allPrayersSubject.next(cached);
        this.community.applyFilters(this.community.currentFilters);
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

  private triggerBackgroundRecovery(): void {
    this.scheduleResumeRefresh();
  }

  applyFilters(filters: PrayerFilters): void {
    this.community.applyFilters(filters);
  }

  async addPrayer(
    prayer: Omit<
      PrayerRequest,
      "id" | "date_requested" | "created_at" | "updated_at" | "updates"
    >
  ): Promise<boolean> {
    return this.community.addPrayer(prayer);
  }

  async updatePrayerStatus(id: string, status: PrayerStatus): Promise<boolean> {
    return this.community.updatePrayerStatus(id, status);
  }

  async incrementPrayedFor(prayerId: string): Promise<number | null> {
    return this.community.incrementPrayedFor(prayerId);
  }

  async incrementPersonalPrayedFor(prayerId: string): Promise<number | null> {
    return this.personal.incrementPersonalPrayedFor(prayerId);
  }

  async incrementMemberPrayedFor(personId: string): Promise<number | null> {
    return this.community.incrementMemberPrayedFor(personId);
  }

  async getMemberPrayedForCountsBatch(
    personIds: string[]
  ): Promise<Record<string, number>> {
    return this.community.getMemberPrayedForCountsBatch(personIds);
  }

  async addPrayerUpdate(
    prayerId: string,
    content: string,
    author: string
  ): Promise<boolean> {
    return this.community.addPrayerUpdate(prayerId, content, author);
  }

  async addMemberPrayerUpdate(
    personId: string,
    memberName: string,
    content: string,
    author: string,
    authorEmail: string = "",
    isAnswered: boolean = false,
    listId?: string
  ): Promise<boolean> {
    return this.community.addMemberPrayerUpdate(
      personId,
      memberName,
      content,
      author,
      authorEmail,
      isAnswered,
      listId
    );
  }

  async getMemberPrayerUpdatesBatch(
    personIds: string[]
  ): Promise<Record<string, any[]>> {
    return this.community.getMemberPrayerUpdatesBatch(personIds);
  }

  async getMemberPrayerUpdates(personId: string): Promise<any[]> {
    return this.community.getMemberPrayerUpdates(personId);
  }

  clearPlanningCenterListDataCache(listId: string): void {
    this.community.clearPlanningCenterListDataCache(listId);
  }

  async deleteMemberPrayerUpdate(
    updateId: string,
    personId: string,
    listId?: string
  ): Promise<boolean> {
    return this.community.deleteMemberPrayerUpdate(updateId, personId, listId);
  }

  async updateMemberPrayerUpdate(
    updateId: string,
    personId: string,
    updates: Partial<PrayerUpdate>,
    listId?: string
  ): Promise<boolean> {
    return this.community.updateMemberPrayerUpdate(
      updateId,
      personId,
      updates,
      listId
    );
  }

  async deletePrayer(id: string): Promise<boolean> {
    return this.community.deletePrayer(id);
  }

  async deletePrayerUpdate(updateId: string): Promise<boolean> {
    return this.community.deletePrayerUpdate(updateId);
  }

  getFilteredPrayers(filters: PrayerFilters): PrayerRequest[] {
    return this.community.getFilteredPrayers(filters);
  }

  private setupRealtimeSubscription(): void {
    try {
      console.log("[PrayerService] Setting up realtime subscription...");
      this.realtimeChannel = subscribePrayerCatalogRealtime(
        this.supabase.client,
        buildPrayerCatalogRealtimeHandlers({
          dropRemindersForPrayer: (prayerId, kind) =>
            this.prayerItemReminderService?.dropRemindersForPrayer(
              prayerId,
              kind
            ),
          reloadCommunityPrayers: () => this.loadPrayers(true),
          reloadPersonalPrayers: () => this.loadPersonalPrayers(false),
        })
      );
    } catch (error) {
      console.error(
        "[PrayerService] Error setting up realtime subscription:",
        error
      );
    }
  }

  async cleanup(): Promise<void> {
    console.log("[PrayerService] Cleaning up...");
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
      console.error("[PrayerService] Error during cleanup:", error);
    }
  }

  private setupVisibilityListener(): void {
    this.setupResumeListeners();
  }

  async addUpdate(updateData: any): Promise<boolean> {
    return this.community.addUpdate(updateData);
  }

  async deleteUpdate(updateId: string): Promise<boolean> {
    return this.community.deleteUpdate(updateId);
  }

  async requestDeletion(requestData: any): Promise<boolean> {
    return this.community.requestDeletion(requestData);
  }

  async requestUpdateDeletion(requestData: any): Promise<boolean> {
    return this.community.requestUpdateDeletion(requestData);
  }

  private async getUserEmail(): Promise<string | null> {
    return resolvePrayerServiceUserEmail(() =>
      this.supabase.client.auth.getSession()
    );
  }

  private isPersonalPrayerDisplayOrderOnlyChange(
    oldRow: Record<string, unknown> | undefined,
    newRow: Record<string, unknown> | undefined
  ): boolean {
    return this.personal.isPersonalPrayerDisplayOrderOnlyChange(oldRow, newRow);
  }

  async getPersonalPrayers(
    forceRefresh: boolean = false
  ): Promise<PrayerRequest[]> {
    return this.personal.getPersonalPrayers(forceRefresh);
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
    return this.personal.addPersonalPrayer(prayer);
  }

  async deletePersonalPrayer(id: string): Promise<boolean> {
    return this.personal.deletePersonalPrayer(id);
  }

  async updatePersonalPrayer(
    id: string,
    updates: Partial<
      Pick<PrayerRequest, "title" | "prayer_for" | "description" | "category">
    >,
    options?: { silentSuccess?: boolean }
  ): Promise<boolean> {
    return this.personal.updatePersonalPrayer(id, updates, options);
  }

  async updatePersonalPrayerOrder(
    prayers: PrayerRequest[],
    categoryFilter?: string
  ): Promise<boolean> {
    return this.personal.updatePersonalPrayerOrder(prayers, categoryFilter);
  }

  async updatePersonalPrayerUpdate(
    updateId: string,
    prayerId: string,
    updates: Partial<Pick<PrayerUpdate, "content" | "mark_as_answered">>
  ): Promise<boolean> {
    return this.personal.updatePersonalPrayerUpdate(
      updateId,
      prayerId,
      updates
    );
  }

  async getUniqueCategoriesForUser(
    prayers?: PrayerRequest[]
  ): Promise<string[]> {
    return this.personal.getUniqueCategoriesForUser(prayers);
  }

  async renamePersonalCategory(
    oldCategory: string,
    newCategory: string,
    options?: { reservedCategoryNames?: string[] }
  ): Promise<boolean> {
    return this.personal.renamePersonalCategory(
      oldCategory,
      newCategory,
      options
    );
  }

  async addPersonalPrayerUpdate(
    personalPrayerId: string,
    content: string,
    author: string,
    authorEmail: string,
    markAsAnswered: boolean = false
  ): Promise<boolean> {
    return this.personal.addPersonalPrayerUpdate(
      personalPrayerId,
      content,
      author,
      authorEmail,
      markAsAnswered
    );
  }

  async deletePersonalPrayerUpdate(updateId: string): Promise<boolean> {
    return this.personal.deletePersonalPrayerUpdate(updateId);
  }

  async markPersonalPrayerUpdateAsAnswered(updateId: string): Promise<boolean> {
    return this.personal.markPersonalPrayerUpdateAsAnswered(updateId);
  }

  async reorderCategories(
    orderedCategories: (string | null)[]
  ): Promise<boolean> {
    return this.personal.reorderCategories(orderedCategories);
  }

  async swapCategoryRanges(
    categoryA: string | null | undefined,
    categoryB: string | null | undefined
  ): Promise<boolean> {
    return this.personal.swapCategoryRanges(categoryA, categoryB);
  }

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
