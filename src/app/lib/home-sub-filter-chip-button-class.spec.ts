import { describe, expect, it } from "vitest";
import { buildHomeSubFilterChipButtonClass } from "./home-sub-filter-chip-button-class";

describe("buildHomeSubFilterChipButtonClass", () => {
  it("applies active class and cursor when enabled", () => {
    expect(
      buildHomeSubFilterChipButtonClass({
        base: "base",
        active: true,
        activeClass: "active",
        inactiveClass: "inactive",
      })
    ).toBe("base active cursor-pointer");
  });

  it("applies inactive class, relative, and disabled styling", () => {
    expect(
      buildHomeSubFilterChipButtonClass({
        base: "base",
        active: false,
        activeClass: "active",
        inactiveClass: "inactive",
        relative: true,
        disabled: true,
      })
    ).toBe("base inactive relative opacity-50 cursor-not-allowed");
  });
});
