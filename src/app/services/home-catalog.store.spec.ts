import { describe, it, expect } from "vitest";
import { HomeCatalogStore } from "./home-catalog.store";

describe("HomeCatalogStore", () => {
  it("rebuilds derived lists from source state", () => {
    const store = new HomeCatalogStore();
    store.rebuild({
      personalPrayers: [
        {
          id: "p1",
          prayer_for: "A",
          description: "d",
          title: "t",
          category: "Family",
          updates: [],
        } as any,
      ],
      planningCenterPrayers: [],
      prompts: [{ id: "1", title: "Hello", description: "d", type: "Morning" }],
      filter: {
        activeFilter: "prompts",
        searchTerm: "",
        personalCategoryFilterMode: "current",
        selectedPersonalCategories: [],
        selectedPromptTypes: [],
      },
    });

    expect(store.filteredPersonalPrayers).toHaveLength(1);
    expect(store.displayedPrompts).toHaveLength(1);
    expect(store.uniquePromptTypes).toEqual(["Morning"]);
    expect(store.personalCategoryCount("Family")).toBe(1);
  });
});
