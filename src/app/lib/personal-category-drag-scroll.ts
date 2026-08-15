/** Applied to the home scroll viewport while a personal category chip is dragging. */
export const HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_CLASS =
  "home-personal-category-drag-scroll-lock";

export const HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_SELECTOR =
  ".main-page-shell .safe-area-viewport";

export function lockHomePersonalCategoryDragScroll(): HTMLElement | null {
  const viewport = document.querySelector(
    HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_SELECTOR
  );
  if (viewport instanceof HTMLElement) {
    viewport.classList.add(HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_CLASS);
    return viewport;
  }
  return null;
}

export function unlockHomePersonalCategoryDragScroll(
  element: HTMLElement | null
): void {
  element?.classList.remove(HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_CLASS);
}
