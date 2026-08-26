import type { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";

/**
 * Default item height estimate (px) for autosize virtual scroll stepping and deep-link
 * `scrollToOffset` before the target prayer card mounts.
 */
export const HOME_PRAYER_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE = 400;

/** Buffer rendered above/below the viewport (px). */
export const HOME_PRAYER_VIRTUAL_SCROLL_MIN_BUFFER_PX = 400;

export const HOME_PRAYER_VIRTUAL_SCROLL_MAX_BUFFER_PX = 800;

/**
 * Move autosize virtual scroll toward `index` for `?prayerId=` deep links on Public tabs.
 * Jumps to the estimated offset when below target or far past it; otherwise
 * nudges forward one row per retry (never snaps back after a forward nudge).
 */
export function scrollHomePrayerVirtualViewportToIndex(
  viewport: CdkVirtualScrollViewport,
  index: number,
  elementId: string
): boolean {
  if (typeof document !== "undefined" && document.getElementById(elementId)) {
    return true;
  }

  const step = HOME_PRAYER_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
  const targetOffset = Math.max(0, index * step);
  const currentOffset = viewport.measureScrollOffset();

  let nextOffset: number;
  if (currentOffset < targetOffset) {
    nextOffset = targetOffset;
  } else if (currentOffset > targetOffset + step) {
    nextOffset = targetOffset;
  } else {
    nextOffset = currentOffset + step;
  }

  if (nextOffset !== currentOffset) {
    viewport.scrollToOffset(nextOffset, "auto");
  }
  viewport.checkViewportSize();
  return !!document.getElementById(elementId);
}
