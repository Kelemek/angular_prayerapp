import { describe, expect, it } from "vitest";
import {
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
  HOME_WRAP_FILTER_CHIP_SOLO_FLEX_CLASS,
} from "./home-sub-filter-chip-classes";
import {
  computePersonalCategoryChipLayout,
  groupElementsByRow,
  measureNaturalLabelWidth,
  personalCategoryLayoutSignature,
} from "./home-wrap-filter-chip-layout";

function makeChip(
  category: string,
  labelText: string,
  topPx: number,
  naturalWidthPx: number
): HTMLElement {
  const chip = document.createElement("div");
  chip.setAttribute("data-personal-category-chip", category);
  chip.getBoundingClientRect = () =>
    ({
      top: topPx,
      left: 0,
      width: 200,
      height: 36,
      right: 200,
      bottom: 36,
    }) as DOMRect;

  const button = document.createElement("button");
  const label = document.createElement("span");
  label.setAttribute("data-personal-category-label", "");
  label.textContent = labelText;
  Object.defineProperty(label, "scrollWidth", {
    configurable: true,
    get: () => naturalWidthPx,
  });

  button.appendChild(label);
  chip.appendChild(button);
  return chip;
}

describe("personalCategoryLayoutSignature", () => {
  it("changes when a category count changes", () => {
    const counts = new Map([
      ["Family", 2],
      ["Health", 9],
    ]);
    const signature = () =>
      personalCategoryLayoutSignature(["Family", "Health"], (c) => counts.get(c) ?? 0);

    expect(signature()).toBe("Family:2|Health:9");
    counts.set("Health", 99);
    expect(signature()).toBe("Family:2|Health:99");
  });
});

describe("personal category chip flex classes", () => {
  it("uses disjoint min-width rules for shared vs solo rows", () => {
    expect(HOME_WRAP_FILTER_CHIP_FLEX_CLASS).toContain("min-w-max");
    expect(HOME_WRAP_FILTER_CHIP_SOLO_FLEX_CLASS).toContain("min-w-0");
    expect(HOME_WRAP_FILTER_CHIP_SOLO_FLEX_CLASS).not.toContain("min-w-max");
  });
});

describe("groupElementsByRow", () => {
  it("groups elements with similar top positions", () => {
    const a = document.createElement("div");
    const b = document.createElement("div");
    const c = document.createElement("div");
    a.getBoundingClientRect = () =>
      ({ top: 10, left: 0, width: 1, height: 1 }) as DOMRect;
    b.getBoundingClientRect = () =>
      ({ top: 11, left: 100, width: 1, height: 1 }) as DOMRect;
    c.getBoundingClientRect = () =>
      ({ top: 40, left: 0, width: 1, height: 1 }) as DOMRect;

    expect(groupElementsByRow([a, b, c])).toEqual([[a, b], [c]]);
  });
});

describe("measureNaturalLabelWidth", () => {
  it("measures unconstrained label width", () => {
    const label = document.createElement("span");
    label.textContent = "hello";
    document.body.appendChild(label);
    Object.defineProperty(label, "scrollWidth", {
      configurable: true,
      get: () => 120,
    });

    expect(measureNaturalLabelWidth(label)).toBe(120);
    label.remove();
  });
});

describe("computePersonalCategoryChipLayout", () => {
  it("marks solo overflowing chips for truncation only", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", {
      configurable: true,
      get: () => 300,
    });

    container.appendChild(makeChip("short", "short (1)", 0, 80));
    container.appendChild(makeChip("paired-a", "paired-a (1)", 0, 120));
    container.appendChild(makeChip("paired-b", "paired-b (1)", 0, 120));
    container.appendChild(
      makeChip("solo-long", "solo-long label (1)", 40, 320)
    );

    const layout = computePersonalCategoryChipLayout(container);
    expect(layout.soloRowCategories.has("solo-long")).toBe(true);
    expect(layout.truncatedCategories.has("solo-long")).toBe(true);
    expect(layout.truncatedCategories.has("short")).toBe(false);
    expect(layout.truncatedCategories.has("paired-a")).toBe(false);
  });
});
