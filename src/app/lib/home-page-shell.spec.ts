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

  it("onCardMemorizeVerse switches to memorize tab and begins verse memorization", () => {
    const setFilter = vi.fn();
    const beginVerseMemorizationFromCard = vi.fn();
    const shell = createHomePageShellHandlers({
      modals: {} as never,
      prayerCardActions: {} as never,
      memberCardActions: {} as never,
      filter: { setFilter } as never,
      personalCategory: {} as never,
      memorizationPanel: {
        beginVerseMemorizationFromCard,
      } as never,
      helpTour: {} as never,
      adminNav: {} as never,
      presentationNav: {} as never,
      memorizationRecommendationsService: {} as never,
      planningCenterListId: () => null,
      catalog: {} as never,
      getActiveFilter: () => "current",
      getPersonalPrayers: () => [],
    });

    shell.prayerContent.onCardMemorizeVerse({
      verse_reference: "John 3:16",
      verse_translation: "esv",
      title: "Memorize: John 3:16",
    } as never);

    expect(setFilter).toHaveBeenCalledWith("memorize");
    expect(beginVerseMemorizationFromCard).toHaveBeenCalledWith("John 3:16", "esv");
  });
});
