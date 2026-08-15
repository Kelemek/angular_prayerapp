/** Long-press duration before opening personal category rename. */
export const PERSONAL_CATEGORY_LONG_PRESS_MS = 500;

/** Cancel long-press when the pointer moves farther than this (px). */
export const PERSONAL_CATEGORY_LONG_PRESS_MOVE_PX = 10;

/** Suppress the synthetic click after long-press / context-menu rename. */
export const PERSONAL_CATEGORY_CLICK_SUPPRESS_MS = 400;

export function isPersonalCategoryDragHandleTarget(
  target: EventTarget | null
): boolean {
  return (
    target instanceof Element &&
    !!target.closest('[data-personal-category-drag-handle]')
  );
}

/** Clears native text selection started by a mobile long-press gesture. */
export function clearBrowserTextSelection(): void {
  window.getSelection()?.removeAllRanges();
}
