import { describe, it, expect, beforeEach, vi } from "vitest";
import { of } from "rxjs";
import { HomeHelpTourLauncher } from "./home-help-tour.launcher";
import type { HomeHelpTourHost } from "./home-help-tour-host.adapter";
import type { HelpSection } from "../types/help-content";

function makeSection(id: string): HelpSection {
  return {
    id,
    title: "Title",
    description: "Description",
    icon: "icon",
    content: [],
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "test",
  };
}

describe("HomeHelpTourLauncher", () => {
  let launcher: HomeHelpTourLauncher;
  let helpDriverTourService: {
    startFilteringHelpSectionTour: ReturnType<typeof vi.fn>;
    startFullGuidedTourWelcome: ReturnType<typeof vi.fn>;
  };
  let host: HomeHelpTourHost;

  beforeEach(() => {
    vi.clearAllMocks();
    helpDriverTourService = {
      startFilteringHelpSectionTour: vi.fn(),
      startFullGuidedTourWelcome: vi.fn(),
    };
    launcher = new HomeHelpTourLauncher(
      helpDriverTourService as any,
      { getSections: vi.fn(() => of([])) } as any
    );
    host = {
      closeHelp: vi.fn(),
      markForCheck: vi.fn(),
      getActiveFilter: vi.fn(() => "current"),
      setFilter: vi.fn(),
      getPromptsCount: vi.fn(() => 0),
      getMemorizedItemsCount: vi.fn(() => 0),
      clearSelectedPromptTypes: vi.fn(),
      openPrayerForm: vi.fn(),
      closePrayerForm: vi.fn(),
      openUserSettings: vi.fn(),
      closeUserSettings: vi.fn(),
      openSearchPanel: vi.fn(),
      getPrayerFormHooks: vi.fn(() => null),
      getWalkthroughPersonalPrayer: vi.fn(),
      openWalkthroughPersonalEdit: vi.fn(),
      closeWalkthroughPersonalEdit: vi.fn(),
      clickWalkthroughAddUpdate: vi.fn(),
      narrowToWalkthroughCategoryFilter: vi.fn(),
      deleteWalkthroughTestPrayer: vi.fn(),
      getCurrentPrayers: vi.fn(async () => []),
      hasSessionEmail: vi.fn(() => false),
      navigateToPresentation: vi.fn(),
      stashPresentationTourSession: vi.fn(),
    };
    launcher.bindHost(host);
  });

  it("closes help and starts the matching section tour", () => {
    vi.useFakeTimers();
    launcher.startSectionTour(makeSection("help_filtering"));
    vi.advanceTimersByTime(280);
    expect(host.closeHelp).toHaveBeenCalled();
    expect(host.setFilter).toHaveBeenCalledWith("current");
    vi.advanceTimersByTime(80);
    expect(helpDriverTourService.startFilteringHelpSectionTour).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("starts the full guided tour welcome when sections exist", () => {
    vi.useFakeTimers();
    launcher.startFullGuidedTour([makeSection("help_filtering")]);
    vi.advanceTimersByTime(280);
    expect(host.closeHelp).toHaveBeenCalled();
    expect(helpDriverTourService.startFullGuidedTourWelcome).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
