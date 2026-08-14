import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomePlanningCenterController } from "./home-planning-center.controller";
import { Subject, of } from "rxjs";

describe("HomePlanningCenterController", () => {
  let controller: HomePlanningCenterController;
  let host: {
    markForCheck: ReturnType<typeof vi.fn>;
    detectChanges: ReturnType<typeof vi.fn>;
    onListStateChanged: ReturnType<typeof vi.fn>;
    onMemberPrayersLoaded: ReturnType<typeof vi.fn>;
    retryPendingPrayerDeepLink: ReturnType<typeof vi.fn>;
  };
  let planningCenterListService: {
    listId$: ReturnType<typeof vi.fn>;
    members$: ReturnType<typeof vi.fn>;
    listName$: ReturnType<typeof vi.fn>;
    loading$: ReturnType<typeof vi.fn>;
    loadForCurrentUser: ReturnType<typeof vi.fn>;
    loadForUser: ReturnType<typeof vi.fn>;
  };
  let prayerService: {
    getMemberPrayerUpdatesBatch: ReturnType<typeof vi.fn>;
    getMemberPrayedForCountsBatch: ReturnType<typeof vi.fn>;
    getMemberPrayerUpdates: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    controller = new HomePlanningCenterController();
    host = {
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
      onListStateChanged: vi.fn(),
      onMemberPrayersLoaded: vi.fn(),
      retryPendingPrayerDeepLink: vi.fn(),
    };
    planningCenterListService = {
      listId$: of(null),
      members$: of([]),
      listName$: of(null),
      loading$: of(false),
      loadForCurrentUser: vi.fn(),
      loadForUser: vi.fn(),
    };
    prayerService = {
      getMemberPrayerUpdatesBatch: vi.fn().mockResolvedValue({}),
      getMemberPrayedForCountsBatch: vi.fn().mockResolvedValue({}),
      getMemberPrayerUpdates: vi.fn().mockResolvedValue([]),
    };
    controller.bindHost(host, {
      planningCenterListService: planningCenterListService as any,
      prayerService: prayerService as any,
    });
  });

  it("shows members filter when list id is mapped", () => {
    controller.planningCenterListId = "list-1";
    expect(controller.showPlanningCenterMembersFilter).toBe(true);
  });

  it("shows ellipsis count while members are loading", () => {
    controller.planningCenterListId = "list-1";
    controller.loadingPlanningCenterList = true;
    controller.planningCenterListMembers = [];
    expect(controller.planningCenterMembersDisplayCount).toBe("…");
  });

  it("builds virtual member prayer cards after batch load", async () => {
    controller.planningCenterListMembers = [
      { id: "p1", name: "Alice", avatar: null },
    ];
    prayerService.getMemberPrayerUpdatesBatch.mockResolvedValue({
      p1: [{ id: "u1", content: "Update" }],
    });
    prayerService.getMemberPrayedForCountsBatch.mockResolvedValue({ p1: 2 });

    await controller.loadMemberPrayers();

    expect(controller.filteredPlanningCenterPrayers).toHaveLength(1);
    expect(controller.filteredPlanningCenterPrayers[0].id).toBe("pc-member-p1");
    expect(controller.filteredPlanningCenterPrayers[0].updates).toHaveLength(1);
    expect(host.onMemberPrayersLoaded).toHaveBeenCalled();
  });

  it("clears filtered prayers when list id exists but members are empty", () => {
    const destroy$ = new Subject<void>();
    planningCenterListService.listId$ = of("list-1");
    planningCenterListService.members$ = of([]);
    planningCenterListService.listName$ = of("Small Group");
    controller.filteredPlanningCenterPrayers = [
      { id: "pc-member-stale" } as any,
    ];

    controller.subscribe(destroy$);

    expect(controller.filteredPlanningCenterPrayers).toEqual([]);
    expect(host.onListStateChanged).toHaveBeenCalled();
    destroy$.next();
    destroy$.complete();
  });

  it("reloads updates for a single member card and refreshes catalog", async () => {
    controller.planningCenterListMembers = [{ id: "p1", name: "Alice" }];
    controller.filteredPlanningCenterPrayers = [
      {
        id: "pc-member-p1",
        updates: [{ id: "old" }],
      } as any,
    ];
    prayerService.getMemberPrayerUpdates.mockResolvedValue([{ id: "new" }]);

    await controller.reloadMemberPrayerUpdates("p1");

    expect(controller.filteredPlanningCenterPrayers[0].updates).toEqual([
      { id: "new" },
    ]);
    expect(host.onMemberPrayersLoaded).toHaveBeenCalled();
    expect(host.detectChanges).not.toHaveBeenCalled();
  });

  it("ignores stale member batch results when list changes mid-flight", async () => {
    let resolveBatch: (value: Record<string, unknown>) => void;
    const batchPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveBatch = resolve;
    });
    prayerService.getMemberPrayerUpdatesBatch.mockReturnValue(batchPromise);
    prayerService.getMemberPrayedForCountsBatch.mockResolvedValue({});

    controller.planningCenterListId = "list-1";
    controller.planningCenterListMembers = [{ id: "p1", name: "Alice" }];
    const staleLoad = controller.loadMemberPrayers();

    controller.planningCenterListMembers = [{ id: "p2", name: "Bob" }];
    resolveBatch!({ p1: [{ id: "stale" }] });
    await staleLoad;

    expect(controller.filteredPlanningCenterPrayers).toEqual([]);

    prayerService.getMemberPrayerUpdatesBatch.mockResolvedValue({
      p2: [{ id: "fresh" }],
    });
    prayerService.getMemberPrayedForCountsBatch.mockResolvedValue({ p2: 1 });
    await controller.loadMemberPrayers();

    expect(controller.filteredPlanningCenterPrayers).toHaveLength(1);
    expect(controller.filteredPlanningCenterPrayers[0].id).toBe("pc-member-p2");
    expect(controller.filteredPlanningCenterPrayers[0].updates).toEqual([
      { id: "fresh" },
    ]);
  });
});
