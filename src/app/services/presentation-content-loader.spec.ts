import { describe, it, expect, beforeEach, vi } from "vitest";
import { PresentationContentLoader } from "./presentation-content-loader";
import type { PrayerRequest } from "./prayer.service";

function communityPrayerFromRow(row: {
  id: string;
  status?: string;
  created_at: string;
  prayer_updates?: Array<{
    id?: string;
    created_at: string;
    approval_status?: string;
    content?: string;
  }>;
  updates?: PrayerRequest["updates"];
  description?: string;
}): PrayerRequest {
  const updates = (row.prayer_updates ?? row.updates ?? []).map((update, index) => ({
    id: update.id ?? `update-${index}`,
    prayer_id: row.id,
    content: update.content ?? "content",
    author: "author",
    created_at: update.created_at,
    approval_status: update.approval_status ?? "approved",
  }));
  return {
    id: row.id,
    status: (row.status ?? "current") as PrayerRequest["status"],
    created_at: row.created_at,
    updates,
    description: row.description ?? "description",
    prayer_for: "person",
    title: "person",
    requester: "requester",
  } as PrayerRequest;
}

describe("PresentationContentLoader", () => {
  let loader: PresentationContentLoader;
  let mockPrayerService: {
    loadPrayers: ReturnType<typeof vi.fn>;
    getAllCommunityPrayersSnapshot: ReturnType<typeof vi.fn>;
    loadPersonalPrayers: ReturnType<typeof vi.fn>;
    getPersonalPrayersSnapshot: ReturnType<typeof vi.fn>;
    getMemberPrayedForCountsBatch: ReturnType<typeof vi.fn>;
    getMemberPrayerUpdates: ReturnType<typeof vi.fn>;
  };
  let mockPromptService: {
    loadPrompts: ReturnType<typeof vi.fn>;
    getPromptsSnapshot: ReturnType<typeof vi.fn>;
    getActivePromptCategories: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrayerService = {
      loadPrayers: vi.fn().mockResolvedValue(undefined),
      getAllCommunityPrayersSnapshot: vi.fn(() => []),
      loadPersonalPrayers: vi.fn().mockResolvedValue(undefined),
      getPersonalPrayersSnapshot: vi.fn(() => []),
      getMemberPrayedForCountsBatch: vi.fn().mockResolvedValue({}),
      getMemberPrayerUpdates: vi.fn().mockResolvedValue([]),
    };
    mockPromptService = {
      loadPrompts: vi.fn().mockResolvedValue(undefined),
      getPromptsSnapshot: vi.fn(() => []),
      getActivePromptCategories: vi.fn(() => []),
    };
    loader = new PresentationContentLoader(
      mockPrayerService as any,
      mockPromptService as any
    );
  });

  it("loadCommunityPrayers filters status and time via PrayerService snapshot", async () => {
    const now = new Date("2026-03-15T12:00:00.000Z");
    const prayers: PrayerRequest[] = [
      {
        id: "current",
        status: "current",
        created_at: "2026-03-10T00:00:00.000Z",
        updates: [],
      } as PrayerRequest,
      {
        id: "answered",
        status: "answered",
        created_at: "2026-03-10T00:00:00.000Z",
        updates: [],
      } as PrayerRequest,
      {
        id: "old",
        status: "current",
        created_at: "2026-01-01T00:00:00.000Z",
        updates: [],
      } as PrayerRequest,
    ];
    mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue(prayers);

    const result = await loader.loadCommunityPrayers({
      statusFilters: { current: true, answered: false },
      timeFilter: "month",
      now,
    });

    expect(mockPrayerService.loadPrayers).toHaveBeenCalled();
    expect(result.map((prayer) => prayer.id)).toEqual(["current"]);
  });

  it("loadPersonalPrayers filters via PrayerService snapshot", async () => {
    const now = new Date("2026-03-15T12:00:00.000Z");
    mockPrayerService.getPersonalPrayersSnapshot.mockReturnValue([
      {
        id: "current",
        category: "Family",
        created_at: "2026-03-10T00:00:00.000Z",
        updates: [],
      },
      {
        id: "answered",
        category: "Answered",
        created_at: "2026-03-10T00:00:00.000Z",
        updates: [],
      },
    ]);

    const result = await loader.loadPersonalPrayers({
      statusFilters: { current: true, answered: false },
      timeFilter: "month",
      now,
    });

    expect(mockPrayerService.loadPersonalPrayers).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("current");
  });

  it("loadPrompts returns snapshot and categories", async () => {
    mockPromptService.getPromptsSnapshot.mockReturnValue([{ id: "p1" }]);
    mockPromptService.getActivePromptCategories.mockReturnValue(["encouragement"]);

    const result = await loader.loadPrompts();

    expect(result.prompts).toEqual([{ id: "p1" }]);
    expect(result.categories).toEqual(["encouragement"]);
  });

  describe("community prayer filters", () => {
    const now = new Date("2026-03-15T12:00:00.000Z");

    it("applies timeFilter twoweeks correctly", async () => {
      const recent = communityPrayerFromRow({
        id: "r",
        created_at: now.toISOString(),
        prayer_updates: [],
      });
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([recent]);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: true, answered: true },
        timeFilter: "twoweeks",
        now,
      });

      expect(result).toHaveLength(1);
    });

    it("applies timeFilter year correctly", async () => {
      const recent = communityPrayerFromRow({
        id: "r",
        created_at: now.toISOString(),
        prayer_updates: [],
      });
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([recent]);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: true, answered: true },
        timeFilter: "year",
        now,
      });

      expect(result).toHaveLength(1);
    });

    it("skips timeFilter when all is selected", async () => {
      const recent = communityPrayerFromRow({
        id: "r",
        created_at: now.toISOString(),
        prayer_updates: [],
      });
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([recent]);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: true, answered: true },
        timeFilter: "all",
        now,
      });

      expect(result).toHaveLength(1);
    });

    it("with only current filter true", async () => {
      const current = communityPrayerFromRow({
        id: "c",
        status: "current",
        created_at: now.toISOString(),
        prayer_updates: [],
      });
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([current]);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: true, answered: false },
        timeFilter: "all",
        now,
      });

      expect(result).toHaveLength(1);
    });

    it("with only answered filter true", async () => {
      const answered = communityPrayerFromRow({
        id: "a",
        status: "answered",
        created_at: now.toISOString(),
        prayer_updates: [],
      });
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([answered]);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: false, answered: true },
        timeFilter: "all",
        now,
      });

      expect(result).toHaveLength(1);
    });

    it("with both status filters false returns all prayers", async () => {
      const prayers = [
        communityPrayerFromRow({
          id: "c",
          status: "current",
          created_at: now.toISOString(),
          prayer_updates: [],
        }),
        communityPrayerFromRow({
          id: "a",
          status: "answered",
          created_at: now.toISOString(),
          prayer_updates: [],
        }),
      ];
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue(prayers);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: false, answered: false },
        timeFilter: "all",
        now,
      });

      expect(result).toHaveLength(2);
    });

    it("sorts prayers by latest activity with updates", async () => {
      const older = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const newer = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const newest = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

      const prayer1 = communityPrayerFromRow({
        id: "p1",
        created_at: older.toISOString(),
        prayer_updates: [{ id: "u1", created_at: newest.toISOString() }],
      });
      const prayer2 = communityPrayerFromRow({
        id: "p2",
        created_at: newer.toISOString(),
        prayer_updates: [],
      });
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([prayer2, prayer1]);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: true, answered: true },
        timeFilter: "all",
        now,
      });

      expect(result[0].id).toBe("p1");
      expect(result[1].id).toBe("p2");
    });

    it("uses PrayerService snapshot updates as provided", async () => {
      const prayerWithMixedUpdates = {
        id: "p1",
        status: "current",
        created_at: now.toISOString(),
        updates: [
          {
            id: "u1",
            content: "approved",
            created_at: now.toISOString(),
            approval_status: "approved",
          },
          {
            id: "u3",
            content: "approved2",
            created_at: now.toISOString(),
            approval_status: "approved",
          },
        ],
      } as PrayerRequest;
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([
        prayerWithMixedUpdates,
      ]);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: true, answered: true },
        timeFilter: "all",
        now,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.updates?.length).toBe(2);
    });

    it("includes old prayers with recent updates when using time filter", async () => {
      const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const oldPrayerWithRecentUpdate = communityPrayerFromRow({
        id: "p1",
        created_at: oldDate.toISOString(),
        prayer_updates: [{ id: "u1", created_at: recentDate.toISOString() }],
      });
      const recentPrayer = communityPrayerFromRow({
        id: "p2",
        created_at: recentDate.toISOString(),
        prayer_updates: [],
      });
      const oldPrayerWithoutUpdates = communityPrayerFromRow({
        id: "p3",
        created_at: oldDate.toISOString(),
        prayer_updates: [],
      });
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([
        oldPrayerWithRecentUpdate,
        recentPrayer,
        oldPrayerWithoutUpdates,
      ]);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: true, answered: true },
        timeFilter: "month",
        now,
      });

      expect(result).toHaveLength(2);
      expect(result.map((prayer) => prayer.id).sort()).toEqual(["p1", "p2"]);
    });

    it("applies status filters and timeFilter week correctly", async () => {
      const recent = communityPrayerFromRow({
        id: "r",
        status: "current",
        created_at: now.toISOString(),
        prayer_updates: [],
      });
      mockPrayerService.getAllCommunityPrayersSnapshot.mockReturnValue([recent]);

      const result = await loader.loadCommunityPrayers({
        statusFilters: { current: true, answered: false },
        timeFilter: "week",
        now,
      });

      expect(result).toHaveLength(1);
    });
  });
});
