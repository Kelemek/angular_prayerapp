import { describe, it, expect } from "vitest";
import {
  mergedNamedPersonalCategoryNames,
  namedPersonalCategoryNamesFromPrayers,
  personalCategoryNamesFromPrayers,
} from "./personal-category-order";

describe("personalCategoryNamesFromPrayers", () => {
  it("sorts categories by minimum display_order descending", () => {
    const names = personalCategoryNamesFromPrayers([
      { category: "Members", display_order: 1001 },
      { category: "Leaders", display_order: 2002 },
      { category: "Members", display_order: 1005 },
    ]);
    expect(names).toEqual(["Leaders", "Members"]);
  });

  it("excludes Answered from named chip list", () => {
    const names = namedPersonalCategoryNamesFromPrayers([
      { category: "Answered", display_order: 3000 },
      { category: "Health", display_order: 2000 },
    ]);
    expect(names).toEqual(["Health"]);
  });

  it("mergedNamedPersonalCategoryNames appends color-only names", () => {
    expect(
      mergedNamedPersonalCategoryNames(
        [{ category: "Health", display_order: 1000 }],
        ["Travel", "Answered", "Health"]
      )
    ).toEqual(["Health", "Travel"]);
  });
});
