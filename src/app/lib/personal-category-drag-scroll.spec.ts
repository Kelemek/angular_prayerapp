import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_CLASS,
  lockHomePersonalCategoryDragScroll,
  unlockHomePersonalCategoryDragScroll,
} from "./personal-category-drag-scroll";

describe("personal-category-drag-scroll", () => {
  let viewport: HTMLElement;

  beforeEach(() => {
    const shell = document.createElement("div");
    shell.className = "main-page-shell";
    viewport = document.createElement("div");
    viewport.className = "safe-area-viewport";
    shell.appendChild(viewport);
    document.body.appendChild(shell);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("locks and unlocks the home scroll viewport", () => {
    const locked = lockHomePersonalCategoryDragScroll();
    expect(locked).toBe(viewport);
    expect(viewport.classList.contains(HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_CLASS)).toBe(
      true
    );

    unlockHomePersonalCategoryDragScroll(locked);
    expect(viewport.classList.contains(HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_CLASS)).toBe(
      false
    );
  });

  it("returns null when the home viewport is missing", () => {
    document.body.innerHTML = "";
    expect(lockHomePersonalCategoryDragScroll()).toBeNull();
  });
});
