import { describe, it, expect, vi } from "vitest";
import { PresentationHomeHandoffCoordinator } from "./presentation-home-handoff.coordinator";
import {
  HOME_RETURN_CONTEXT_STATE_KEY,
  PRESENTATION_HOME_HANDOFF_STATE_KEY,
  buildPresentationHomeHandoff,
} from "../types/presentation";

describe("PresentationHomeHandoffCoordinator", () => {
  const coordinator = new PresentationHomeHandoffCoordinator();

  it("applies handoff filters and return context to page state", () => {
    const page = {
      contentTypes: ["prayers"] as const,
      statusFilters: { current: true, answered: true },
      selectedPromptCategories: [] as string[],
      selectedPersonalCategories: [] as string[],
      homeReturnContext: null,
    };

    coordinator.applyHandoff(page, {
      contentTypes: ["personal"],
      statusFilters: { current: false, answered: true },
      promptCategories: ["encouragement"],
      personalCategories: ["Family"],
      returnContext: {
        activeFilter: "personal",
        selectedPersonalCategories: ["Family"],
        personalCategoryFilterMode: "named",
      },
    });

    expect(page.contentTypes).toEqual(["personal"]);
    expect(page.statusFilters).toEqual({ current: false, answered: true });
    expect(page.selectedPromptCategories).toEqual(["encouragement"]);
    expect(page.selectedPersonalCategories).toEqual(["Family"]);
    expect(page.homeReturnContext).toEqual({
      activeFilter: "personal",
      selectedPersonalCategories: ["Family"],
      personalCategoryFilterMode: "named",
    });
  });

  it("consumes one-shot history state handoff", () => {
    const handoff = buildPresentationHomeHandoff({
      contentTypes: ["prayers"],
      activeFilter: "community",
    });
    const replaceHistoryState = vi.fn();

    const consumed = coordinator.consumeFromNavigation({
      historyState: { [PRESENTATION_HOME_HANDOFF_STATE_KEY]: handoff },
      replaceHistoryState,
      getQueryParam: () => null,
      clearQueryParams: vi.fn(),
    });

    expect(consumed?.contentTypes).toEqual(["prayers"]);
    expect(replaceHistoryState).toHaveBeenCalled();
  });

  it("navigates home with return context when exiting presentation", () => {
    const router = { navigate: vi.fn() };
    const returnContext = {
      activeFilter: "personal" as const,
      selectedPersonalCategories: ["Evening"],
    };

    coordinator.navigateExit(router as any, returnContext);

    expect(router.navigate).toHaveBeenCalledWith(["/"], {
      state: { [HOME_RETURN_CONTEXT_STATE_KEY]: returnContext },
    });
  });

  it("builds home handoff from active filter and category state", () => {
    const handoff = coordinator.buildHandoffFromHome({
      activeFilter: "personal",
      selectedPromptTypes: [],
      selectedPersonalCategories: ["Family"],
      personalCategoryFilterMode: "named",
      defaultPrayerView: "current",
    });

    expect(handoff.contentTypes).toEqual(["personal"]);
    expect(handoff.personalCategories).toEqual(["Family"]);
    expect(handoff.returnContext).toEqual({
      activeFilter: "personal",
      personalCategoryFilterMode: "named",
      selectedPersonalCategories: ["Family"],
    });
  });

  it("consumes one-shot home return context from history state", () => {
    const replaceHistoryState = vi.fn();
    const consumed = coordinator.consumeHomeReturnContext({
      historyState: {
        [HOME_RETURN_CONTEXT_STATE_KEY]: {
          activeFilter: "prompts",
          selectedPromptTypes: ["Morning"],
        },
      },
      replaceHistoryState,
    });

    expect(consumed).toEqual({
      activeFilter: "prompts",
      selectedPromptTypes: ["Morning"],
    });
    expect(replaceHistoryState).toHaveBeenCalled();
  });

  it("applies home return context through host adapter hooks", () => {
    const host = {
      setFilter: vi.fn(),
      setSelectedPromptTypes: vi.fn(),
      applyPersonalReturnContext: vi.fn(),
      onReturnContextApplied: vi.fn(),
    };

    coordinator.applyHomeReturnContext(host, {
      activeFilter: "personal",
      personalCategoryFilterMode: "named",
      selectedPersonalCategories: ["Family"],
    });

    expect(host.setFilter).toHaveBeenCalledWith("personal");
    expect(host.applyPersonalReturnContext).toHaveBeenCalledWith({
      personalCategoryFilterMode: "named",
      selectedPersonalCategories: ["Family"],
    });
    expect(host.onReturnContextApplied).toHaveBeenCalled();
  });

  it("defers presentation navigation for modifier clicks", () => {
    expect(
      coordinator.shouldUseNativePresentationNavigation({
        button: 0,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      } as MouseEvent)
    ).toBe(true);
  });
});
