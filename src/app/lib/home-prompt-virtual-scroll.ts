import type { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";

/**
 * Default item height estimate (px) for autosize virtual scroll stepping and deep-link
 * `scrollToOffset` before the target prompt card mounts.
 */
export const HOME_PROMPT_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE = 280;

/** Buffer rendered above/below the viewport (px). */
export const HOME_PROMPT_VIRTUAL_SCROLL_MIN_BUFFER_PX = 280;

export const HOME_PROMPT_VIRTUAL_SCROLL_MAX_BUFFER_PX = 560;

/**
 * Move autosize virtual scroll toward `index` for `?promptId=` deep links.
 * Jumps to the estimated offset when below target or far past it; otherwise
 * nudges forward one row per retry (never snaps back after a forward nudge).
 */
export function scrollHomePromptVirtualViewportToIndex(
  viewport: CdkVirtualScrollViewport,
  index: number,
  elementId: string
): boolean {
  if (typeof document !== "undefined" && document.getElementById(elementId)) {
    return true;
  }

  const step = HOME_PROMPT_VIRTUAL_SCROLL_ESTIMATED_ITEM_SIZE;
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
