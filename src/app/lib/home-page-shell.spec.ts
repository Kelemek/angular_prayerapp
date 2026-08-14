import { describe, expect, it, vi } from "vitest";
import { createHomePageShellHandlers } from "./home-page-shell";

describe("createHomePageShellHandlers", () => {
  it("opens logout confirmation via modals controller", () => {
    const modals = { showLogoutConfirmation: false };
    const shell = createHomePageShellHandlers({
      modals: modals as never,
      prayerCardActions: {} as never,
      memberCardActions: {} as never,
      filter: {} as never,
      personalCategory: {} as never,
      memorizationPanel: {} as never,
      helpTour: {} as never,
      adminNav: {} as never,
      presentationNav: {} as never,
      memorizationRecommendationsService: {} as never,
      planningCenterListId: () => null,
      catalog: {} as never,
      getActiveFilter: () => "current",
      getPersonalPrayers: () => [],
    });

    shell.header.openLogoutConfirmation();
    expect(modals.showLogoutConfirmation).toBe(true);
  });

  it("delegates togglePromptType to filter coordinator", () => {
    const togglePromptType = vi.fn();
    const shell = createHomePageShellHandlers({
      modals: {} as never,
      prayerCardActions: {} as never,
      memberCardActions: {} as never,
      filter: { togglePromptType } as never,
      personalCategory: {} as never,
      memorizationPanel: {} as never,
      helpTour: {} as never,
      adminNav: {} as never,
      presentationNav: {} as never,
      memorizationRecommendationsService: {} as never,
      planningCenterListId: () => null,
      catalog: {} as never,
      getActiveFilter: () => "current",
      getPersonalPrayers: () => [],
    });

    shell.prayerContent.togglePromptType("Morning");
    expect(togglePromptType).toHaveBeenCalledWith("Morning");
  });
});
