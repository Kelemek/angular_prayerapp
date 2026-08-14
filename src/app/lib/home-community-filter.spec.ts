import { describe, it, expect } from "vitest";
import { isCommunityPrayerFilter } from "./home-community-filter";

describe("isCommunityPrayerFilter", () => {
  it("returns true for community prayer filters", () => {
    expect(isCommunityPrayerFilter("current")).toBe(true);
    expect(isCommunityPrayerFilter("answered")).toBe(true);
    expect(isCommunityPrayerFilter("total")).toBe(true);
  });

  it("returns false for other home filters", () => {
    expect(isCommunityPrayerFilter("prompts")).toBe(false);
    expect(isCommunityPrayerFilter("personal")).toBe(false);
    expect(isCommunityPrayerFilter("memorize")).toBe(false);
    expect(isCommunityPrayerFilter("planning_center_list")).toBe(false);
  });
});
