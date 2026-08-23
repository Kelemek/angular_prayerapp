import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomeDeepLinkCoordinator } from "./home-deep-link.coordinator";
import type { HomeDeepLinkHost } from "./home-deep-link-host.adapter";

describe("HomeDeepLinkCoordinator", () => {
  let coordinator: HomeDeepLinkCoordinator;
  let host: HomeDeepLinkHost;

  beforeEach(() => {
    coordinator = new HomeDeepLinkCoordinator();
    host = {
      markForCheck: vi.fn(),
      getActiveFilter: vi.fn(() => "current"),
      setFilter: vi.fn(),
      stripQueryParam: vi.fn(),
      clearDeepLinkFilters: vi.fn(),
      resolvePrayerDeepLinkTab: vi.fn(() => "personal"),
      isMemberPrayerId: vi.fn(() => false),
      isPrayerInLoadedCatalog: vi.fn(() => true),
      shouldGiveUpMemberPrayerDeepLink: vi.fn(() => false),
      shouldGiveUpCommunityPersonalPrayerDeepLink: vi.fn(() => false),
      requestFreshPrayerCatalog: vi.fn(),
      isPromptInCatalog: vi.fn(() => true),
      arePromptsStillLoading: vi.fn(() => false),
      requestFreshPromptCatalog: vi.fn(),
      applyPendingVerseMemorizationDeepLink: vi.fn(),
    };
    coordinator.bindHost(host);
  });

  it("captures initial email filter and deep-link ids", () => {
    coordinator.captureInitialQueryParams({
      filter: "memorize",
      prayerId: " prayer-1 ",
      promptId: "prompt-1",
    });

    expect(coordinator.initialEmailFilterTab).toBe("memorize");
    expect(coordinator.consumeInitialEmailFilterTab()).toBe("memorize");
  });

  it("captures archived email filter tab", () => {
    coordinator.captureInitialQueryParams({
      filter: "archived",
    });

    expect(coordinator.consumeInitialEmailFilterTab()).toBe("archived");
  });

  it("defers deep links until view is ready", () => {
    coordinator.handleNavigationDeepLinks(
      { filter: null, prayerId: "p1", promptId: null },
      false
    );

    expect(host.setFilter).not.toHaveBeenCalled();
    expect(host.stripQueryParam).not.toHaveBeenCalled();
  });

  it("opens prayer deep links when view is ready", () => {
    const scrollSpy = vi
      .spyOn(document, "getElementById")
      .mockReturnValue({ scrollIntoView: vi.fn() } as unknown as HTMLElement);

    coordinator.handleNavigationDeepLinks(
      { filter: null, prayerId: "p1", promptId: null },
      true
    );

    expect(host.clearDeepLinkFilters).toHaveBeenCalledWith({ prayerId: "p1" });
    expect(host.setFilter).toHaveBeenCalledWith("personal");
    expect(host.stripQueryParam).toHaveBeenCalledWith("prayerId");
    scrollSpy.mockRestore();
  });

  it("switches to prompts for prompt deep links", () => {
    const scrollSpy = vi
      .spyOn(document, "getElementById")
      .mockReturnValue({ scrollIntoView: vi.fn() } as unknown as HTMLElement);

    coordinator.openPromptDeepLink("prompt-1");

    expect(host.requestFreshPromptCatalog).toHaveBeenCalled();
    expect(host.clearDeepLinkFilters).toHaveBeenCalled();
    expect(host.setFilter).toHaveBeenCalledWith("prompts");
    scrollSpy.mockRestore();
  });

  it("gives up unresolved prompt deep links when catalog finished loading", () => {
    vi.mocked(host.isPromptInCatalog).mockReturnValue(false);
    vi.mocked(host.arePromptsStillLoading).mockReturnValue(false);

    coordinator.captureInitialQueryParams({ promptId: "missing" });
    coordinator.retryPendingPromptDeepLinkIfNeeded();

    expect(host.setFilter).not.toHaveBeenCalled();
  });

  it("captures verse memorization deep link params", () => {
    coordinator.captureInitialQueryParams({
      verseRef: "John 3:16",
      verseTranslation: "esv",
    });

    expect(coordinator.consumePendingVerseMemorization()).toEqual({
      reference: "John 3:16",
      translation: "esv",
    });
    expect(coordinator.consumePendingVerseMemorization()).toBeNull();
  });

  it("applies verse memorization deep link when memorize filter is active", () => {
    coordinator.captureInitialQueryParams({
      filter: "memorize",
      verseRef: "Romans 8:28",
      verseTranslation: "niv",
    });

    coordinator.handleNavigationDeepLinks(
      {
        filter: "memorize",
        verseRef: "Romans 8:28",
        verseTranslation: "niv",
      },
      true
    );

    expect(host.setFilter).toHaveBeenCalledWith("memorize");
    expect(host.applyPendingVerseMemorizationDeepLink).toHaveBeenCalled();
  });
});
