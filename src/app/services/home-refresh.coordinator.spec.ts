import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomeRefreshCoordinator } from "./home-refresh.coordinator";

describe("HomeRefreshCoordinator", () => {
  let coordinator: HomeRefreshCoordinator;
  let host: {
    getActiveFilter: ReturnType<typeof vi.fn>;
    getPlanningCenterListId: ReturnType<typeof vi.fn>;
    markForCheck: ReturnType<typeof vi.fn>;
    setRefreshing: ReturnType<typeof vi.fn>;
    shouldThrottleRefresh: ReturnType<typeof vi.fn>;
    recordRefreshAttempt: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    coordinator = new HomeRefreshCoordinator();
    host = {
      getActiveFilter: vi.fn(() => "current"),
      getPlanningCenterListId: vi.fn(() => null),
      markForCheck: vi.fn(),
      setRefreshing: vi.fn(),
      shouldThrottleRefresh: vi.fn(() => false),
      recordRefreshAttempt: vi.fn(),
    };
    coordinator.bindHost(host, {
      prayerService: { loadPrayers: vi.fn().mockResolvedValue(undefined), loadPersonalPrayers: vi.fn().mockResolvedValue(undefined) } as any,
      userSessionService: { getCurrentSession: vi.fn(() => ({ email: "user@example.com" })) } as any,
      personalCategoryColorService: { loadColors: vi.fn().mockResolvedValue(undefined) } as any,
      memorizationService: { loadItems: vi.fn().mockResolvedValue(undefined) } as any,
      planningCenter: { loadForCurrentUser: vi.fn() } as any,
      toastService: { error: vi.fn() } as any,
    });
  });

  it("skips refresh when throttled", async () => {
    host.shouldThrottleRefresh.mockReturnValue(true);
    await coordinator.onPullToRefresh();
    expect(host.setRefreshing).not.toHaveBeenCalled();
  });

  it("loads prayers and personal data when session exists", async () => {
    const prayerService = {
      loadPrayers: vi.fn().mockResolvedValue(undefined),
      loadPersonalPrayers: vi.fn().mockResolvedValue(undefined),
    };
    coordinator.bindHost(host, {
      prayerService: prayerService as any,
      userSessionService: { getCurrentSession: vi.fn(() => ({ email: "user@example.com" })) } as any,
      personalCategoryColorService: { loadColors: vi.fn().mockResolvedValue(undefined) } as any,
      memorizationService: { loadItems: vi.fn().mockResolvedValue(undefined) } as any,
      planningCenter: { loadForCurrentUser: vi.fn() } as any,
      toastService: { error: vi.fn() } as any,
    });

    await coordinator.onPullToRefresh();

    expect(prayerService.loadPrayers).toHaveBeenCalledWith(false);
    expect(prayerService.loadPersonalPrayers).toHaveBeenCalledWith(false);
    expect(host.setRefreshing).toHaveBeenCalledWith(false);
  });
});
