import { describe, it, expect } from "vitest";
import {
  applyMultiSelectFilter,
  formatMultiSelectDisplay,
  initPendingFromApplied,
  normalizeWithAvailableFallback,
  resolveMultiSelectApplied,
} from "./presentation-settings-filters-state";

describe("presentation-settings-filters-state", () => {
  it("initPendingFromApplied uses all available when applied is empty", () => {
    expect(initPendingFromApplied([], ["a", "b"])).toEqual(["a", "b"]);
    expect(initPendingFromApplied(["a"], ["a", "b"])).toEqual(["a"]);
  });

  it("resolveMultiSelectApplied returns null for empty pending", () => {
    expect(resolveMultiSelectApplied([], ["a"])).toBeNull();
  });

  it("resolveMultiSelectApplied returns empty array when all selected", () => {
    expect(resolveMultiSelectApplied(["a", "b"], ["a", "b"])).toEqual([]);
  });

  it("applyMultiSelectFilter returns applied when values change", () => {
    const outcome = applyMultiSelectFilter({
      pending: ["a", "b"],
      available: ["a", "b", "c"],
      applied: ["a"],
      normalize: (values) => normalizeWithAvailableFallback(values, ["a", "b", "c"]),
    });
    expect(outcome).toEqual({ result: "applied", next: ["a", "b"] });
  });

  it("applyMultiSelectFilter returns unchanged when equal", () => {
    const outcome = applyMultiSelectFilter({
      pending: ["a", "b"],
      available: ["a", "b"],
      applied: [],
      normalize: (values) => normalizeWithAvailableFallback(values, ["a", "b"]),
    });
    expect(outcome).toEqual({ result: "unchanged" });
  });

  it("formatMultiSelectDisplay shows all label when empty", () => {
    expect(formatMultiSelectDisplay([], "All Items")).toBe("All Items");
    expect(formatMultiSelectDisplay(["a", "b"], "All Items")).toBe("a, b");
  });
});
