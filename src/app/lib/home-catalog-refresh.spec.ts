import { describe, it, expect } from "vitest";
import { HomeCatalogStore } from "../services/home-catalog.store";
import {
  refreshHomeCatalog,
  readFilteredPersonalPrayers,
  type HomeCatalogPageBindings,
} from "./home-catalog-refresh";

describe("home-catalog-refresh", () => {
  const baseBindings = (): HomeCatalogPageBindings => ({
    personalPrayers: [
      { id: "p1", prayer_for: "A", category: "Family" } as any,
      { id: "p2", prayer_for: "B", category: "Answered" } as any,
    ],
    planningCenterPrayers: [],
    prompts: [],
    activeFilter: "personal",
    filters: { searchTerm: "" },
    personalCategoryFilterMode: "current",
    selectedPersonalCategories: [],
    selectedPromptTypes: [],
  });

  it("refreshHomeCatalog filters personal prayers by mode", () => {
    const catalog = new HomeCatalogStore();
    refreshHomeCatalog(catalog, baseBindings());
    expect(catalog.filteredPersonalPrayers.map((p) => p.id)).toEqual(["p1"]);
  });

  it("readFilteredPersonalPrayers returns rebuilt list", () => {
    const catalog = new HomeCatalogStore();
    const prayers = readFilteredPersonalPrayers(catalog, {
      ...baseBindings(),
      personalCategoryFilterMode: "answered",
    });
    expect(prayers.map((p) => p.id)).toEqual(["p2"]);
  });
});
