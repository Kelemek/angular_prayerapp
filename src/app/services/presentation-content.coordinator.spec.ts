import { describe, it, expect, beforeEach, vi } from "vitest";
import { PresentationContentCoordinator } from "./presentation-content.coordinator";
import { PresentationContentLoader } from "./presentation-content-loader";
import { PresentationCatalogStore } from "./presentation-catalog.store";
import type { PresentationContentHost } from "./presentation-content.coordinator";

function createHost(
  overrides: Partial<PresentationContentHost> = {}
): PresentationContentHost & { markForCheckCalls: number } {
  const catalog = overrides.catalog ?? new PresentationCatalogStore();
  const state = {
    loading: overrides.loading ?? false,
    randomize: overrides.randomize ?? false,
    contentTypes: overrides.contentTypes ?? (["prayers"] as const),
    statusFilters: overrides.statusFilters ?? { current: true, answered: true },
    timeFilter: overrides.timeFilter ?? ("all" as const),
    hasMembers: overrides.hasMembers ?? false,
    planningCenterListMembers: overrides.planningCenterListMembers ?? [],
    uniquePersonalCategories: overrides.uniquePersonalCategories ?? [],
    uniquePromptCategories: overrides.uniquePromptCategories ?? [],
    selectedPersonalCategories: overrides.selectedPersonalCategories ?? [],
    selectedPromptCategories: overrides.selectedPromptCategories ?? [],
    catalog,
    markForCheckCalls: 0,
  };

  const host: PresentationContentHost & { markForCheckCalls: number } = {
    get loading() {
      return state.loading;
    },
    set loading(value: boolean) {
      state.loading = value;
    },
    get randomize() {
      return state.randomize;
    },
    set randomize(value: boolean) {
      state.randomize = value;
    },
    get contentTypes() {
      return state.contentTypes;
    },
    set contentTypes(value) {
      state.contentTypes = value;
    },
    get statusFilters() {
      return state.statusFilters;
    },
    set statusFilters(value) {
      state.statusFilters = value;
    },
    get timeFilter() {
      return state.timeFilter;
    },
    set timeFilter(value) {
      state.timeFilter = value;
    },
    get hasMembers() {
      return state.hasMembers;
    },
    set hasMembers(value: boolean) {
      state.hasMembers = value;
    },
    get planningCenterListMembers() {
      return state.planningCenterListMembers;
    },
    set planningCenterListMembers(value) {
      state.planningCenterListMembers = value;
    },
    get uniquePersonalCategories() {
      return state.uniquePersonalCategories;
    },
    set uniquePersonalCategories(value: string[]) {
      state.uniquePersonalCategories = value;
    },
    get uniquePromptCategories() {
      return state.uniquePromptCategories;
    },
    set uniquePromptCategories(value: string[]) {
      state.uniquePromptCategories = value;
    },
    get catalog() {
      return state.catalog;
    },
    get selectedPersonalCategories() {
      return state.selectedPersonalCategories;
    },
    set selectedPersonalCategories(value: string[]) {
      state.selectedPersonalCategories = value;
    },
    get selectedPromptCategories() {
      return state.selectedPromptCategories;
    },
    set selectedPromptCategories(value: string[]) {
      state.selectedPromptCategories = value;
    },
    markForCheck() {
      state.markForCheckCalls++;
    },
    get markForCheckCalls() {
      return state.markForCheckCalls;
    },
  };

  return host;
}

describe("PresentationContentCoordinator", () => {
  let coordinator: PresentationContentCoordinator;
  let mockLoader: {
    loadCommunityPrayers: ReturnType<typeof vi.fn>;
    loadPersonalPrayers: ReturnType<typeof vi.fn>;
    loadMemberPrayers: ReturnType<typeof vi.fn>;
    loadPrompts: ReturnType<typeof vi.fn>;
  };
  let mockPrayerService: {
    getMemberPrayerUpdates: ReturnType<typeof vi.fn>;
    getPersonalPrayersSnapshot: ReturnType<typeof vi.fn>;
    getAllCommunityPrayersSnapshot: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLoader = {
      loadCommunityPrayers: vi.fn().mockResolvedValue([{ id: "p1" }]),
      loadPersonalPrayers: vi.fn().mockResolvedValue([{ id: "personal-1" }]),
      loadMemberPrayers: vi.fn().mockResolvedValue([
        {
          id: "pc-member-m1",
          prayer_for: "Member 1",
          description: "",
          prayer_image: "url",
          updates: [{ id: "u1", content: "update" }],
          prayed_for_count: 2,
        },
      ]),
      loadPrompts: vi.fn().mockResolvedValue({
        prompts: [{ id: "prompt-1" }],
        categories: ["encouragement"],
      }),
    };
    mockPrayerService = {
      getMemberPrayerUpdates: vi.fn().mockResolvedValue([]),
      getPersonalPrayersSnapshot: vi.fn(() => []),
      getAllCommunityPrayersSnapshot: vi.fn(() => []),
    };
    coordinator = new PresentationContentCoordinator(
      mockLoader as any,
      mockPrayerService as any
    );
  });

  it("loadAll fetches enabled content types and clears loading", async () => {
    const host = createHost({
      contentTypes: ["prayers", "prompts"],
    });

    await coordinator.loadAll(host);

    expect(mockLoader.loadCommunityPrayers).toHaveBeenCalled();
    expect(mockLoader.loadPrompts).toHaveBeenCalled();
    expect(host.loading).toBe(false);
    expect(host.catalog.prayers).toHaveLength(1);
    expect(host.catalog.prompts).toHaveLength(1);
    expect(host.uniquePromptCategories).toEqual(["encouragement"]);
  });

  it("loadAll fetches all content types when contentTypes is empty", async () => {
    const host = createHost({ contentTypes: [], randomize: true });
    const shuffleSpy = vi.spyOn(host.catalog, "shuffleVisibleItems");

    await coordinator.loadAll(host);

    expect(mockLoader.loadCommunityPrayers).toHaveBeenCalled();
    expect(mockLoader.loadPrompts).toHaveBeenCalled();
    expect(mockLoader.loadPersonalPrayers).toHaveBeenCalled();
    expect(shuffleSpy).toHaveBeenCalled();
  });

  it("loadAll shuffles when randomize is enabled", async () => {
    const host = createHost({ randomize: true });
    const shuffleSpy = vi.spyOn(host.catalog, "shuffleVisibleItems");
    await coordinator.loadAll(host);
    expect(shuffleSpy).toHaveBeenCalled();
  });

  it("loadAll catches loader failures", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const host = createHost({ contentTypes: ["prayers"] });
    mockLoader.loadCommunityPrayers.mockRejectedValue(new Error("Fetch error"));

    await coordinator.loadAll(host);

    expect(consoleSpy).toHaveBeenCalled();
    expect(host.loading).toBe(false);
    expect(host.catalog.prayers).toEqual([]);
    consoleSpy.mockRestore();
  });

  it("fetchCommunityPrayers clears prayers on loader error", async () => {
    const host = createHost();
    host.catalog.prayers = [{ id: "stale" } as any];
    mockLoader.loadCommunityPrayers.mockRejectedValue(new Error("boom"));

    await coordinator.fetchCommunityPrayers(host);

    expect(host.catalog.prayers).toEqual([]);
  });

  it("loadPrompts clears prompts and categories on loader error", async () => {
    const host = createHost();
    host.catalog.prompts = [{ id: "p1" } as any];
    host.uniquePromptCategories = ["encouragement"];
    mockLoader.loadPrompts.mockRejectedValue(new Error("fail"));

    await coordinator.loadPrompts(host);

    expect(host.catalog.prompts).toEqual([]);
    expect(host.uniquePromptCategories).toEqual([]);
  });

  it("fetchPersonalPrayers extracts unique trimmed personal categories", async () => {
    const host = createHost();
    mockLoader.loadPersonalPrayers.mockResolvedValue([
      { category: "Answered " },
      { category: "Answered" },
      { category: "Current" },
    ] as any);

    await coordinator.fetchPersonalPrayers(host);

    expect(host.uniquePersonalCategories).toEqual(["Answered", "Current"]);
  });

  it("fetchPersonalPrayers clears personal prayers on loader error", async () => {
    const host = createHost();
    host.catalog.personalPrayers = [{ id: "stale" } as any];
    mockLoader.loadPersonalPrayers.mockRejectedValue(new Error("failed"));

    await coordinator.fetchPersonalPrayers(host);

    expect(host.catalog.personalPrayers).toEqual([]);
  });

  it("fetchPersonalPrayers preserves prayed-for floor after refetch", async () => {
    const host = createHost({ contentTypes: ["personal"] });
    const prayer = {
      id: "personal-1",
      prayer_for: "Me",
      category: "Health",
      created_at: new Date().toISOString(),
      prayed_for_count: 4,
    };
    host.catalog.personalPrayers = [prayer];
    mockLoader.loadPersonalPrayers.mockResolvedValue([
      { ...prayer, prayed_for_count: 3 },
    ] as any);

    await coordinator.fetchPersonalPrayers(host);

    expect(host.catalog.personalPrayers[0].prayed_for_count).toBe(4);
  });

  it("fetchMemberPrayers populates member prayers from loader", async () => {
    const host = createHost({
      planningCenterListMembers: [
        { id: "m1", name: "Member 1", avatar: "url" },
      ],
    });

    await coordinator.fetchMemberPrayers(host);

    expect(host.catalog.memberPrayers).toHaveLength(1);
    expect(host.catalog.memberPrayers[0].prayer_for).toBe("Member 1");
    expect(host.catalog.memberPrayers[0].description).toBe("");
    expect(host.catalog.memberPrayers[0].updates).toHaveLength(1);
    expect(host.catalog.memberPrayers[0].prayed_for_count).toBe(2);
  });

  it("fetchMemberPrayers does not shuffle mid-fetch when randomize is enabled", async () => {
    const host = createHost({ randomize: true });
    const shuffleSpy = vi.spyOn(host.catalog, "shuffleVisibleItems");

    await coordinator.fetchMemberPrayers(host);

    expect(shuffleSpy).not.toHaveBeenCalled();
  });

  it("refetchPrayerScopedContent only reloads prayer-scoped lists", async () => {
    const host = createHost({
      contentTypes: ["prayers", "personal", "prompts"],
    });
    const communitySpy = vi.spyOn(coordinator, "fetchCommunityPrayers");
    const personalSpy = vi.spyOn(coordinator, "fetchPersonalPrayers");
    const promptsSpy = vi.spyOn(coordinator, "loadPrompts");

    await coordinator.refetchPrayerScopedContent(host);

    expect(communitySpy).toHaveBeenCalled();
    expect(personalSpy).toHaveBeenCalled();
    expect(promptsSpy).not.toHaveBeenCalled();
  });

  it("refetchPrayerScopedContent defers markForCheck until all prayer fetches finish", async () => {
    const host = createHost({ contentTypes: ["prayers", "personal"] });
    let releaseCommunity!: () => void;
    let releasePersonal!: () => void;
    const communityGate = new Promise<void>((resolve) => {
      releaseCommunity = resolve;
    });
    const personalGate = new Promise<void>((resolve) => {
      releasePersonal = resolve;
    });

    mockLoader.loadCommunityPrayers.mockImplementation(async () => {
      await communityGate;
      return [{ id: "c1" }];
    });
    mockLoader.loadPersonalPrayers.mockImplementation(async () => {
      await personalGate;
      return [{ id: "personal-1" }];
    });

    const refetch = coordinator.refetchPrayerScopedContent(host);

    await Promise.resolve();
    expect(host.markForCheckCalls).toBe(0);

    releaseCommunity();
    await Promise.resolve();
    expect(host.markForCheckCalls).toBe(0);

    releasePersonal();
    await refetch;
    expect(host.markForCheckCalls).toBe(1);
    expect(host.catalog.prayers.map((prayer) => prayer.id)).toEqual(["c1"]);
    expect(host.catalog.personalPrayers.map((prayer) => prayer.id)).toEqual([
      "personal-1",
    ]);
  });

  it("refreshCombinedShuffleIfNeeded shuffles when randomize is enabled", () => {
    const host = createHost({ randomize: true });
    const shuffleSpy = vi.spyOn(host.catalog, "shuffleVisibleItems");

    coordinator.refreshCombinedShuffleIfNeeded(host);

    expect(shuffleSpy).toHaveBeenCalled();
  });

  it("refreshCombinedShuffleIfNeeded clears combined shuffle when randomize is off", () => {
    const host = createHost({ randomize: false });
    host.catalog.combinedShuffledItems = [{ id: "stale" } as any];

    coordinator.refreshCombinedShuffleIfNeeded(host);

    expect(host.catalog.combinedShuffledItems).toEqual([]);
  });

  it("scheduleFilterReload serializes concurrent reload tasks", async () => {
    const order: string[] = [];
    const first = coordinator.scheduleFilterReload(async () => {
      order.push("first-start");
      await Promise.resolve();
      order.push("first-end");
    });
    const second = coordinator.scheduleFilterReload(async () => {
      order.push("second");
    });

    await Promise.all([first, second]);

    expect(order).toEqual(["first-start", "first-end", "second"]);
  });

  it("patchSlideItemAfterMutation patches personal prayer from snapshot", async () => {
    const catalog = new PresentationCatalogStore();
    catalog.personalPrayers = [
      { id: "p1", prayer_for: "Old", category: "Family" } as any,
    ];
    mockPrayerService.getPersonalPrayersSnapshot.mockReturnValue([
      { id: "p1", prayer_for: "Old", category: "Answered", status: "answered" },
    ]);

    await coordinator.patchSlideItemAfterMutation(catalog, "p1");

    expect(catalog.personalPrayers[0].category).toBe("Answered");
  });

  it("patchSlideItemAfterMutation patches member prayer updates", async () => {
    const catalog = new PresentationCatalogStore();
    catalog.memberPrayers = [
      { id: "pc-member-m1", prayer_for: "Member", updates: [] } as any,
    ];
    mockPrayerService.getMemberPrayerUpdates.mockResolvedValue([
      { id: "u1", content: "fresh update" },
    ]);

    await coordinator.patchSlideItemAfterMutation(catalog, "pc-member-m1");

    expect(catalog.memberPrayers[0].updates).toEqual([
      { id: "u1", content: "fresh update" },
    ]);
  });

  it("patchSlideItemAfterMutation patches community prayer from snapshot", async () => {
    const catalog = new PresentationCatalogStore();
    catalog.prayers = [{ id: "c1", prayer_for: "Old" } as any];
    mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([
      { id: "c1", prayer_for: "Updated" },
    ]);

    await coordinator.patchSlideItemAfterMutation(catalog, "c1");

    expect(catalog.prayers[0].prayer_for).toBe("Updated");
  });
});
