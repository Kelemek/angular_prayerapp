import { describe, it, expect } from "vitest";
import {
  formatPresentationContentTypeLabel,
  formatPresentationTimeFilterLabel,
  getAvailablePresentationContentTypes,
  PRESENTATION_CONTENT_TYPE_OPTIONS,
  PRESENTATION_STATUS_FILTER_OPTIONS,
  PRESENTATION_TIME_FILTER_OPTIONS,
} from "./presentation-settings-filter-options";

describe("presentation-settings-filter-options", () => {
  it("exposes content type options", () => {
    expect(PRESENTATION_CONTENT_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      "prayers",
      "prompts",
      "personal",
      "members",
    ]);
  });

  it("getAvailablePresentationContentTypes excludes members without mapped list", () => {
    expect(getAvailablePresentationContentTypes(false)).toEqual([
      "prayers",
      "prompts",
      "personal",
    ]);
    expect(getAvailablePresentationContentTypes(true)).toEqual([
      "prayers",
      "prompts",
      "personal",
      "members",
    ]);
  });

  it("formatPresentationContentTypeLabel maps known values", () => {
    expect(formatPresentationContentTypeLabel("prayers")).toBe("Prayers");
    expect(formatPresentationContentTypeLabel("unknown" as "prayers")).toBe(
      "unknown"
    );
  });

  it("formatPresentationTimeFilterLabel maps known values", () => {
    expect(formatPresentationTimeFilterLabel("week")).toBe("Last Week");
    expect(formatPresentationTimeFilterLabel("all")).toBe("All Time");
  });

  it("exposes status and time filter option lists", () => {
    expect(PRESENTATION_STATUS_FILTER_OPTIONS).toEqual([
      "current",
      "answered",
      "archived",
    ]);
    expect(PRESENTATION_TIME_FILTER_OPTIONS.map((o) => o.value)).toContain("all");
  });
});
