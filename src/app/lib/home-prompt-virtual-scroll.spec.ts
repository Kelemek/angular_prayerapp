import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import {
  HOME_PROMPT_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE,
  scrollHomePromptVirtualViewportToIndex,
} from "./home-prompt-virtual-scroll";

describe("scrollHomePromptVirtualViewportToIndex", () => {
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
    el.id = "prompt-card-p1";
    document.body.appendChild(el);

    const result = scrollHomePromptVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      5,
      "prompt-card-p1"
    );

    expect(result).toBe(true);
    expect(viewport.scrollToOffset).not.toHaveBeenCalled();
  });

  it("jumps to the estimated target offset in one call", () => {
    const step = HOME_PROMPT_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
    const index = 5;

    const result = scrollHomePromptVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      index,
      "prompt-card-p1"
    );

    expect(result).toBe(false);
    expect(offsets).toEqual([index * step]);
    expect(viewport.checkViewportSize).toHaveBeenCalled();
  });

  it("snaps back toward the estimate when scrolled far below the target", () => {
    const step = HOME_PROMPT_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
    const index = 5;
    const targetOffset = index * step;

    scrollHomePromptVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      index,
      "prompt-card-missing"
    );

    expect(offsets).toEqual([targetOffset]);
    expect(offsets[0]).not.toBe((index + 2) * step * 3);
  });

  it("nudges forward one row when already at the estimate but the card is not mounted", () => {
    const step = HOME_PROMPT_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
    const index = 2;
    scrollOffset = index * step;
    offsets.length = 0;

    scrollHomePromptVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      index,
      "prompt-card-missing"
    );

    expect(offsets).toEqual([index * step + step]);
  });

  it("continues forward after nudging past the estimate without snapping back", () => {
    const step = HOME_PROMPT_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
    const index = 2;
    scrollOffset = index * step + step;
    offsets.length = 0;

    scrollHomePromptVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      index,
      "prompt-card-missing"
    );

    expect(offsets).toEqual([index * step + step * 2]);
  });

  it("snaps back toward the estimate when scrolled far below the target", () => {
    const step = HOME_PROMPT_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
    scrollOffset = step * 10;

    scrollHomePromptVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      2,
      "prompt-card-p1"
    );

    expect(offsets).toEqual([step * 2]);
  });

  it("returns true once the target mounts", () => {
    const step = HOME_PROMPT_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
    const index = 2;

    scrollHomePromptVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      index,
      "prompt-card-p1"
    );

    const el = document.createElement("div");
    el.id = "prompt-card-p1";
    document.body.appendChild(el);

    const result = scrollHomePromptVirtualViewportToIndex(
      viewport as CdkVirtualScrollViewport,
      index,
      "prompt-card-p1"
    );

    expect(result).toBe(true);
    expect(offsets).toEqual([index * step]);
  });
});
