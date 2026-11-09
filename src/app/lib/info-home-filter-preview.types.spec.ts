import { describe, expect, it } from "vitest";
import {
  groupsPreviewStatusFromFilter,
  isGroupsAreaPreviewFilter,
  isMemorizePreviewFilter,
  isPublicAreaPreviewFilter,
  isPublicPreviewFilter,
  normalizeGroupsPreviewFilter,
} from "./info-home-filter-preview.types";

describe("isPublicPreviewFilter", () => {
  it("returns true for community preview filters", () => {
    expect(isPublicPreviewFilter("current")).toBe(true);
    expect(isPublicPreviewFilter("answered")).toBe(true);
    expect(isPublicPreviewFilter("archived")).toBe(true);
    expect(isPublicPreviewFilter("total")).toBe(true);
  });

  it("returns false for Prompts, Personal, Memorize, and Groups", () => {
    expect(isPublicPreviewFilter("prompts")).toBe(false);
    expect(isPublicPreviewFilter("personal")).toBe(false);
    expect(isPublicPreviewFilter("memorize")).toBe(false);
    expect(isPublicPreviewFilter("groups-current")).toBe(false);
  });
});

describe("isPublicAreaPreviewFilter", () => {
  it("includes Prompts with the Church preview filters", () => {
    expect(isPublicAreaPreviewFilter("current")).toBe(true);
    expect(isPublicAreaPreviewFilter("prompts")).toBe(true);
    expect(isPublicAreaPreviewFilter("total")).toBe(true);
  });

  it("returns false for Personal, Memorize, and Groups", () => {
    expect(isPublicAreaPreviewFilter("personal")).toBe(false);
    expect(isPublicAreaPreviewFilter("memorize")).toBe(false);
    expect(isPublicAreaPreviewFilter("groups-current")).toBe(false);
  });
});

describe("isGroupsAreaPreviewFilter", () => {
  it("includes groups slug filters", () => {
    expect(isGroupsAreaPreviewFilter("groups")).toBe(true);
    expect(isGroupsAreaPreviewFilter("groups-current")).toBe(true);
    expect(isGroupsAreaPreviewFilter("groups-answered")).toBe(true);
    expect(isGroupsAreaPreviewFilter("groups-total")).toBe(true);
    expect(isGroupsAreaPreviewFilter("current")).toBe(false);
  });
});

describe("groupsPreviewStatusFromFilter", () => {
  it("maps groups-* filters to status", () => {
    expect(groupsPreviewStatusFromFilter("groups-current")).toBe("current");
    expect(groupsPreviewStatusFromFilter("groups-answered")).toBe("answered");
    expect(groupsPreviewStatusFromFilter("groups-total")).toBe("total");
  });
});

describe("normalizeGroupsPreviewFilter", () => {
  it("normalizes bare groups to groups-current", () => {
    expect(normalizeGroupsPreviewFilter("groups")).toBe("groups-current");
    expect(normalizeGroupsPreviewFilter("personal")).toBe("personal");
  });
});

describe("isMemorizePreviewFilter", () => {
  it("returns true only for memorize", () => {
    expect(isMemorizePreviewFilter("memorize")).toBe(true);
    expect(isMemorizePreviewFilter("personal")).toBe(false);
    expect(isMemorizePreviewFilter("current")).toBe(false);
  });
});
