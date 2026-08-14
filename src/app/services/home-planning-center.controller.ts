import { Injectable } from "@angular/core";
import { Subject, combineLatest, takeUntil } from "rxjs";
import type { PrayerRequest, PrayerService } from "./prayer.service";
import type { PlanningCenterListService } from "./planning-center-list.service";

export interface HomePlanningCenterHost {
  markForCheck(): void;
  detectChanges(): void;
  onListStateChanged(): void;
  onMemberPrayersLoaded(): void;
  retryPendingPrayerDeepLink(): void;
}

@Injectable()
export class HomePlanningCenterController {
  planningCenterListId: string | null = null;
  planningCenterListMembers: Array<{
    id: string;
    name: string;
    avatar?: string | null;
  }> = [];
  planningCenterListName: string | null = null;
  loadingPlanningCenterList = false;
  planningCenterListResolved = false;
  filteredPlanningCenterPrayers: PrayerRequest[] = [];
  loadingMemberPrayers = false;
  memberPrayersLoadAttempted = false;
  memberPrayersLoadFailed = false;

  private host: HomePlanningCenterHost | null = null;
  private planningCenterListService: PlanningCenterListService | null = null;
  private prayerService: PrayerService | null = null;
  private memberPrayersLoadGeneration = 0;

  get showPlanningCenterMembersFilter(): boolean {
    return !!this.planningCenterListId;
  }

  get planningCenterMembersDisplayCount(): string {
    if (
      this.loadingPlanningCenterList &&
      this.planningCenterListMembers.length === 0
    ) {
      return "…";
    }
    return String(this.planningCenterListMembers.length);
  }

  bindHost(
    host: HomePlanningCenterHost,
    deps: {
      planningCenterListService: PlanningCenterListService;
      prayerService: PrayerService;
    }
  ): void {
    this.host = host;
    this.planningCenterListService = deps.planningCenterListService;
    this.prayerService = deps.prayerService;
  }

  subscribe(destroy$: Subject<void>): void {
    const planningCenterListService = this.requirePlanningCenterListService();

    combineLatest([
      planningCenterListService.listId$,
      planningCenterListService.members$,
      planningCenterListService.listName$,
    ])
      .pipe(takeUntil(destroy$))
      .subscribe(([listId, members, listName]) => {
        this.planningCenterListId = listId;
        this.planningCenterListMembers = members;
        this.planningCenterListName = listName;
        if (listId && members.length > 0) {
          void this.loadMemberPrayers();
        } else {
          this.filteredPlanningCenterPrayers = [];
        }
        this.requireHost().onListStateChanged();
      });

    planningCenterListService.loading$
      .pipe(takeUntil(destroy$))
      .subscribe((loading) => {
        const wasLoading = this.loadingPlanningCenterList;
        this.loadingPlanningCenterList = loading;
        if (wasLoading && !loading) {
          this.planningCenterListResolved = true;
        }
        this.requireHost().markForCheck();
      });
  }

  loadForCurrentUser(force = false): void {
    void this.requirePlanningCenterListService().loadForCurrentUser(force);
  }

  loadForUser(email: string): void {
    void this.requirePlanningCenterListService().loadForUser(email);
  }

  async loadMemberPrayers(): Promise<void> {
    const prayerService = this.requirePrayerService();
    const host = this.requireHost();
    const loadGeneration = ++this.memberPrayersLoadGeneration;
    const expectedListId = this.planningCenterListId;
    const expectedMemberIds = this.memberIdsKey(this.planningCenterListMembers);

    this.memberPrayersLoadAttempted = true;
    this.memberPrayersLoadFailed = false;
    this.loadingMemberPrayers = true;
    host.markForCheck();

    const members = this.planningCenterListMembers;
    const personIds = members.map((m) => m.id);

    try {
      const [memberUpdatesMap, memberCountsMap] = await Promise.all([
        prayerService.getMemberPrayerUpdatesBatch(personIds),
        prayerService.getMemberPrayedForCountsBatch(personIds),
      ]);

      if (
        !this.isMemberPrayersLoadCurrent(
          loadGeneration,
          expectedListId,
          expectedMemberIds
        )
      ) {
        return;
      }

      this.filteredPlanningCenterPrayers = members.map((member) => {
        const updates = memberUpdatesMap[member.id] || [];

        return {
          id: `pc-member-${member.id}`,
          title: `Prayer for ${member.name}`,
          description: "",
          status: "current" as const,
          requester: "Planning Center",
          prayer_for: member.name,
          email: "",
          date_requested: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updates,
          approval_status: "approved" as const,
          is_anonymous: false,
          type: "prayer" as const,
          prayer_image: member.avatar || null,
          prayed_for_count: memberCountsMap[member.id] ?? 0,
        };
      });

      host.onMemberPrayersLoaded();
    } catch (error) {
      console.error("Error loading planning center member prayers:", error);
      if (
        !this.isMemberPrayersLoadCurrent(
          loadGeneration,
          expectedListId,
          expectedMemberIds
        )
      ) {
        return;
      }
      this.memberPrayersLoadFailed = true;
      this.filteredPlanningCenterPrayers = [];
      host.onMemberPrayersLoaded();
    } finally {
      if (loadGeneration === this.memberPrayersLoadGeneration) {
        this.loadingMemberPrayers = false;
        host.markForCheck();
      }
    }
  }

  async reloadMemberPrayerUpdates(personId: string): Promise<void> {
    const prayerService = this.requirePrayerService();
    const host = this.requireHost();

    try {
      const member = this.planningCenterListMembers.find(
        (m) => m.id === personId
      );
      if (!member) return;

      const updates = await prayerService.getMemberPrayerUpdates(member.id);

      const index = this.filteredPlanningCenterPrayers.findIndex(
        (p) => p.id === `pc-member-${member.id}`
      );
      if (index !== -1) {
        this.filteredPlanningCenterPrayers[index] = {
          ...this.filteredPlanningCenterPrayers[index],
          updates,
        };
        host.onMemberPrayersLoaded();
      }
    } catch (error) {
      console.error("Error reloading member prayer updates:", error);
    }
  }

  private memberIdsKey(
    members: Array<{ id: string; name: string; avatar?: string | null }>
  ): string {
    return members.map((member) => member.id).join(",");
  }

  private isMemberPrayersLoadCurrent(
    generation: number,
    listId: string | null,
    memberIds: string
  ): boolean {
    if (generation !== this.memberPrayersLoadGeneration) {
      return false;
    }
    if (listId !== this.planningCenterListId) {
      return false;
    }
    return memberIds === this.memberIdsKey(this.planningCenterListMembers);
  }

  private requireHost(): HomePlanningCenterHost {
    if (!this.host) {
      throw new Error("HomePlanningCenterController host is not bound");
    }
    return this.host;
  }

  private requirePlanningCenterListService(): PlanningCenterListService {
    if (!this.planningCenterListService) {
      throw new Error("HomePlanningCenterController dependencies are not bound");
    }
    return this.planningCenterListService;
  }

  private requirePrayerService(): PrayerService {
    if (!this.prayerService) {
      throw new Error("HomePlanningCenterController dependencies are not bound");
    }
    return this.prayerService;
  }
}
