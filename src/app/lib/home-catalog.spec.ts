import { describe, it, expect } from "vitest";
import {
  filterDisplayedPromptsForHome,
  filterPersonalPrayersForHome,
  filterPlanningCenterPrayersForHome,
  getPromptCountByType,
  getUniquePromptTypes,
} from "./home-catalog";
import type { PrayerRequest } from "../services/prayer.service";

const baseFilter = {
  activeFilter: "personal" as const,
  searchTerm: "",
  personalCategoryFilterMode: "current" as const,
  selectedPersonalCategories: [] as string[],
  selectedPromptTypes: [] as string[],
};

describe("home-catalog", () => {
  it("filters personal prayers by search term and category mode", () => {
    const prayers = [
      {
        id: "p1",
        prayer_for: "Alice",
        description: "Need help",
        title: "T",
        category: "Family",
        updates: [],
      },
      {
        id: "p2",
        prayer_for: "Bob",
        description: "Done",
        title: "T",
        category: "Answered",
        updates: [{ content: "recovery", created_at: "2025-01-01" }],
      },
    ] as PrayerRequest[];

    expect(
      filterPersonalPrayersForHome(prayers, {
        ...baseFilter,
        personalCategoryFilterMode: "current",
      }).map((p) => p.id)
    ).toEqual(["p1"]);

    expect(
      filterPersonalPrayersForHome(prayers, {
        ...baseFilter,
        personalCategoryFilterMode: "total",
        searchTerm: "recovery",
      }).map((p) => p.id)
    ).toEqual(["p2"]);

    expect(
      filterPersonalPrayersForHome(prayers, {
        ...baseFilter,
        personalCategoryFilterMode: "named",
        selectedPersonalCategories: ["Family"],
      }).map((p) => p.id)
    ).toEqual(["p1"]);
  });

  it("filters planning center prayers by search term", () => {
    const prayers = [
      {
        id: "m1",
        prayer_for: "Member",
        description: "Alpha",
        title: "T",
        updates: [],
      },
    ] as PrayerRequest[];

    expect(filterPlanningCenterPrayersForHome(prayers, "")).toHaveLength(1);
    expect(filterPlanningCenterPrayersForHome(prayers, "beta")).toHaveLength(0);
  });

  it("filters displayed prompts by active tab, search, and type", () => {
    const prompts = [
      { id: "1", title: "Hello", description: "World", type: "T1" },
      { id: "2", title: "Other", description: "stuff", type: "T2" },
    ];

    expect(
      filterDisplayedPromptsForHome(prompts, {
        ...baseFilter,
        activeFilter: "current",
      })
    ).toEqual([]);

    expect(
      filterDisplayedPromptsForHome(prompts, {
        ...baseFilter,
        activeFilter: "prompts",
        searchTerm: "hello",
      })
    ).toHaveLength(1);

    expect(
      filterDisplayedPromptsForHome(prompts, {
        ...baseFilter,
        activeFilter: "prompts",
        selectedPromptTypes: ["T2"],
      })
    ).toHaveLength(1);
  });

  it("derives unique prompt types and counts", () => {
    const prompts = [
      { id: "1", title: "A", description: "", type: "X" },
      { id: "2", title: "B", description: "", type: "Y" },
      { id: "3", title: "C", description: "", type: "X" },
    ];
    expect(getUniquePromptTypes(prompts)).toEqual(["X", "Y"]);
    expect(getPromptCountByType(prompts, "X")).toBe(2);
  });
});
