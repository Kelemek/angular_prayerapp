import { describe, it, expect } from "vitest";
import {
  homeHasSubFilterRowBelowTabs,
  isCommunityPrayerFilter,
  isPublicTabFilter,
} from "./home-community-filter";

describe("isCommunityPrayerFilter", () => {
  it("returns true for community prayer filters", () => {
    expect(isCommunityPrayerFilter("current")).toBe(true);
    expect(isCommunityPrayerFilter("answered")).toBe(true);
    expect(isCommunityPrayerFilter("archived")).toBe(true);
    expect(isCommunityPrayerFilter("total")).toBe(true);
  });

  it("returns false for other home filters", () => {
    expect(isCommunityPrayerFilter("prompts")).toBe(false);
    expect(isCommunityPrayerFilter("personal")).toBe(false);
    expect(isCommunityPrayerFilter("memorize")).toBe(false);
    expect(isCommunityPrayerFilter("planning_center_list")).toBe(false);
  });
});

describe("isPublicTabFilter", () => {
  it("returns true for community prayer filters and Members", () => {
    expect(isPublicTabFilter("current")).toBe(true);
    expect(isPublicTabFilter("answered")).toBe(true);
    expect(isPublicTabFilter("archived")).toBe(true);
    expect(isPublicTabFilter("total")).toBe(true);
    expect(isPublicTabFilter("planning_center_list")).toBe(true);
  });

  it("returns false for other home filters", () => {
    expect(isPublicTabFilter("prompts")).toBe(false);
    expect(isPublicTabFilter("personal")).toBe(false);
    expect(isPublicTabFilter("memorize")).toBe(false);
  });
});

describe("homeHasSubFilterRowBelowTabs", () => {
  it("returns true when a sub-filter row renders under the main tabs", () => {
    expect(homeHasSubFilterRowBelowTabs("current", false)).toBe(true);
    expect(homeHasSubFilterRowBelowTabs("answered", false)).toBe(true);
    expect(homeHasSubFilterRowBelowTabs("archived", false)).toBe(true);
    expect(homeHasSubFilterRowBelowTabs("total", false)).toBe(true);
    expect(homeHasSubFilterRowBelowTabs("planning_center_list", false)).toBe(
      true
    );
    expect(homeHasSubFilterRowBelowTabs("personal", false)).toBe(true);
    expect(homeHasSubFilterRowBelowTabs("memorize", false)).toBe(true);
    expect(homeHasSubFilterRowBelowTabs("prompts", true)).toBe(true);
  });

  it("returns false when content follows tabs directly", () => {
    expect(homeHasSubFilterRowBelowTabs("prompts", false)).toBe(false);
  });
});
