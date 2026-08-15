import { describe, it, expect } from "vitest";
import {
  HOME_FILTER_TAB_BORDER,
  HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS,
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS,
  homeSubFilterGroupClass,
} from "./home-sub-filter-chip-classes";

describe("homeSubFilterGroupClass", () => {
  it("builds a 2px rounded group border for the tab color", () => {
    expect(homeSubFilterGroupClass(HOME_FILTER_TAB_BORDER.personal)).toBe(
      "rounded-lg border-[2px] border-[#2F5F54] dark:border-[#2F5F54] p-2"
    );
  });

  it("aliases memorize group border to public blue", () => {
    expect(HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS).toBe(
      HOME_PUBLIC_SUB_FILTER_GROUP_CLASS
    );
  });
});
