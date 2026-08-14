import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomeFilterCoordinator } from "./home-filter.coordinator";
import type { HomeFilterHost } from "./home-filter.coordinator";

describe("HomeFilterCoordinator", () => {
  let coordinator: HomeFilterCoordinator;
  let host: HomeFilterHost;

  beforeEach(() => {
    coordinator = new HomeFilterCoordinator();
    let pageState = {
      activeFilter: "current" as const,
      filters: { status: "current" as const, searchTerm: "find" },
      selectedPromptTypes: ["Morning"],
    };
    host = {
      getPageState: vi.fn(() => pageState),
      setActiveFilter: vi.fn((filter) => {
        pageState = { ...pageState, activeFilter: filter };
      }),
      setFilters: vi.fn((filters) => {
        pageState = { ...pageState, filters };
      }),
      clearSelectedPromptTypes: vi.fn(() => {
        pageState = { ...pageState, selectedPromptTypes: [] };
      }),
      setSelectedPromptTypes: vi.fn((types: string[]) => {
        pageState = { ...pageState, selectedPromptTypes: types };
      }),
      getPrompts: vi.fn(() => []),
      isPromptUnread: vi.fn(() => false),
      applyPrayerFilters: vi.fn(),
      loadPlanningCenterMemberPrayers: vi.fn(),
      loadMemorizationItems: vi.fn(),
      onFilterChanged: vi.fn(),
    };
    coordinator.bindHost(host);
  });

  it("applies search-only filter changes", () => {
    coordinator.onFiltersChange({ searchTerm: "grace" });

    expect(host.setFilters).toHaveBeenCalledWith({
      status: "current",
      searchTerm: "grace",
    });
    expect(host.applyPrayerFilters).toHaveBeenCalledWith({
      status: "current",
      search: "grace",
    });
    expect(host.onFilterChanged).toHaveBeenCalled();
  });

  it("switches to prompts and clears prayer results", () => {
    coordinator.setFilter("prompts");

    expect(host.setActiveFilter).toHaveBeenCalledWith("prompts");
    expect(host.clearSelectedPromptTypes).toHaveBeenCalled();
    expect(host.applyPrayerFilters).toHaveBeenCalledWith({ search: "" });
    expect(host.onFilterChanged).toHaveBeenCalled();
  });

  it("loads memorization items when memorize tab is selected", () => {
    coordinator.setFilter("memorize");

    expect(host.loadMemorizationItems).toHaveBeenCalled();
    expect(host.applyPrayerFilters).toHaveBeenCalledWith({ search: "" });
  });

  it("toggles prompt type chips and clears when re-selected", () => {
    coordinator.togglePromptType("Morning");
    expect(host.setSelectedPromptTypes).toHaveBeenCalledWith([]);

    coordinator.togglePromptType("Morning");
    expect(host.setSelectedPromptTypes).toHaveBeenLastCalledWith(["Morning"]);
  });

  it("clears selected prompt types via clearSelectedPromptTypes", () => {
    coordinator.clearSelectedPromptTypes();

    expect(host.setSelectedPromptTypes).toHaveBeenCalledWith([]);
    expect(host.onFilterChanged).toHaveBeenCalled();
  });
});
