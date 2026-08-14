import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomePrayerCardActionsController } from "./home-prayer-card-actions.controller";

describe("HomePrayerCardActionsController", () => {
  const prayerCardActions = {
    toggleMemberUpdateAnswered: vi.fn(),
    addUpdateForCard: vi.fn(),
    deleteUpdateForCard: vi.fn(),
  };
  const planningCenter = {
    reloadMemberPrayerUpdates: vi.fn().mockResolvedValue(undefined),
  };
  let controller: HomePrayerCardActionsController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new HomePrayerCardActionsController(
      prayerCardActions as any,
      planningCenter as any
    );
  });

  it("reloads member updates after toggling answered", async () => {
    prayerCardActions.toggleMemberUpdateAnswered.mockResolvedValue(true);
    await controller.toggleMemberUpdateAnswered({
      updateId: "u1",
      prayerId: "pc-member-abc",
      isAnswered: true,
    });
    expect(planningCenter.reloadMemberPrayerUpdates).toHaveBeenCalledWith("abc");
  });
});
