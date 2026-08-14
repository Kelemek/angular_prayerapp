import { describe, it, expect } from "vitest";
import {
  isAllOptionsSelected,
  sortedArraysEqual,
  toggleMultiSelectItem,
} from "./presentation-settings-multi-select";

describe("presentation-settings-multi-select", () => {
  describe("toggleMultiSelectItem", () => {
    it("adds an item when not selected", () => {
      expect(toggleMultiSelectItem(["a"], "b")).toEqual(["a", "b"]);
    });

    it("removes an item when more than one selected", () => {
      expect(toggleMultiSelectItem(["a", "b"], "a")).toEqual(["b"]);
    });

    it("keeps the last item when toggling the only selection", () => {
      expect(toggleMultiSelectItem(["a"], "a")).toEqual(["a"]);
    });
  });

  describe("sortedArraysEqual", () => {
    it("compares normalized sorted arrays", () => {
      expect(sortedArraysEqual(["b", "a"], ["a", "b"])).toBe(true);
      expect(sortedArraysEqual(["a"], ["a", "b"])).toBe(false);
    });
  });

  describe("isAllOptionsSelected", () => {
    it("returns true when every available option is pending", () => {
      expect(isAllOptionsSelected(["a", "b"], ["a", "b"])).toBe(true);
      expect(isAllOptionsSelected(["a", "b"], ["a"])).toBe(false);
      expect(isAllOptionsSelected([], ["a"])).toBe(false);
    });
  });
});
