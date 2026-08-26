import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import {
  HOME_PRAYER_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE,
  scrollHomePrayerVirtualViewportToIndex,
} from "./home-prayer-virtual-scroll";

describe("scrollHomePrayerVirtualViewportToIndex", () => {
  let viewport: Pick<
    CdkVirtualScrollViewport,
    "scrollToOffset" | "checkViewportSize" | "measureScrollOffset"
  >;
  let offsets: number[];
  let scrollOffset: number;

  beforeEach(() => {
    offsets = [];
    scrollOffset = 0;
    viewport = {
      scrollToOffset: vi.fn((offset: number) => {
        scrollOffset = offset;
        offsets.push(offset);
      }),
      checkViewportSize: vi.fn(),
      measureScrollOffset: vi.fn(() => scrollOffset),
    };
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns true when the target element is already mounted", () => {
    const el = document.createElement("div");
    el.id = "prayer-card-p1";
    document.body.appendChild(el);

    const result = scrollHomePrayerVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      5,
      "prayer-card-p1"
    );

    expect(result).toBe(true);
    expect(viewport.scrollToOffset).not.toHaveBeenCalled();
  });

  it("jumps to the estimated target offset in one call", () => {
    const step = HOME_PRAYER_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
    const index = 5;

    const result = scrollHomePrayerVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      index,
      "prayer-card-p1"
    );

    expect(result).toBe(false);
    expect(offsets).toEqual([index * step]);
    expect(viewport.checkViewportSize).toHaveBeenCalled();
  });

  it("nudges forward one row when already at the estimate but the card is not mounted", () => {
    const step = HOME_PRAYER_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
    const index = 2;
    scrollOffset = index * step;
    offsets.length = 0;

    scrollHomePrayerVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      index,
      "prayer-card-missing"
    );

    expect(offsets).toEqual([index * step + step]);
  });
});
