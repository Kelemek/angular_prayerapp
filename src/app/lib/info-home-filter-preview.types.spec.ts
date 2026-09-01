import { describe, expect, it } from "vitest";
import {
  isMemorizePreviewFilter,
  isPublicAreaPreviewFilter,
  isPublicPreviewFilter,
} from "./info-home-filter-preview.types";

describe("isPublicPreviewFilter", () => {
  it("returns true for community preview filters", () => {
    expect(isPublicPreviewFilter("current")).toBe(true);
    expect(isPublicPreviewFilter("answered")).toBe(true);
    expect(isPublicPreviewFilter("archived")).toBe(true);
    expect(isPublicPreviewFilter("total")).toBe(true);
  });

  it("returns false for Prompts, Personal, and Memorize", () => {
    expect(isPublicPreviewFilter("prompts")).toBe(false);
    expect(isPublicPreviewFilter("personal")).toBe(false);
    expect(isPublicPreviewFilter("memorize")).toBe(false);
  });
});

describe("isPublicAreaPreviewFilter", () => {
  it("includes Prompts with the Church preview filters", () => {
    expect(isPublicAreaPreviewFilter("current")).toBe(true);
    expect(isPublicAreaPreviewFilter("prompts")).toBe(true);
    expect(isPublicAreaPreviewFilter("total")).toBe(true);
  });

  it("returns false for Personal and Memorize", () => {
    expect(isPublicAreaPreviewFilter("personal")).toBe(false);
    expect(isPublicAreaPreviewFilter("memorize")).toBe(false);
  });
});

describe("isMemorizePreviewFilter", () => {
  it("returns true only for memorize", () => {
    expect(isMemorizePreviewFilter("memorize")).toBe(true);
    expect(isMemorizePreviewFilter("personal")).toBe(false);
    expect(isMemorizePreviewFilter("current")).toBe(false);
  });
});
