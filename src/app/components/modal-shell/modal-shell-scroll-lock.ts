/** Refcounted scroll lock shared by nested {@link ModalShellComponent} instances. */

type SavedScrollLock = {
  scrollLockEl: HTMLElement | null;
  scrollLockPreviousOverflow: string;
  scrollLockPreviousTouchAction: string;
  bodyPreviousOverflow: string;
  htmlPreviousOverflow: string;
};

let depth = 0;
let saved: SavedScrollLock | null = null;

function findPageScrollContainer(): HTMLElement {
  const viewport = document.querySelector('.safe-area-viewport');
  if (viewport instanceof HTMLElement) {
    return viewport;
  }
  return document.documentElement;
}

export function acquireModalShellScrollLock(): void {
  if (depth === 0) {
    const scroller = findPageScrollContainer();
    const scrollLockEl =
      scroller !== document.documentElement && scroller !== document.body
        ? scroller
        : null;
    saved = {
      scrollLockEl,
      scrollLockPreviousOverflow: scrollLockEl?.style.overflow ?? '',
      scrollLockPreviousTouchAction: scrollLockEl?.style.touchAction ?? '',
      bodyPreviousOverflow: document.body.style.overflow,
      htmlPreviousOverflow: document.documentElement.style.overflow,
    };
    if (scrollLockEl) {
      scrollLockEl.style.overflow = 'hidden';
      scrollLockEl.style.touchAction = 'none';
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  depth += 1;
}

export function releaseModalShellScrollLock(): void {
  if (depth <= 0) {
    return;
  }
  depth -= 1;
  if (depth > 0 || !saved) {
    return;
  }
  const state = saved;
  saved = null;
  if (state.scrollLockEl) {
    state.scrollLockEl.style.overflow = state.scrollLockPreviousOverflow;
    state.scrollLockEl.style.touchAction = state.scrollLockPreviousTouchAction;
  }
  document.body.style.overflow = state.bodyPreviousOverflow;
  document.documentElement.style.overflow = state.htmlPreviousOverflow;
}

/** Test helper — resets refcount if a spec forgets to destroy a shell. */
export function resetModalShellScrollLockForTests(): void {
  if (depth > 0 && saved) {
    const state = saved;
    saved = null;
    depth = 0;
    if (state.scrollLockEl) {
      state.scrollLockEl.style.overflow = state.scrollLockPreviousOverflow;
      state.scrollLockEl.style.touchAction = state.scrollLockPreviousTouchAction;
    }
    document.body.style.overflow = state.bodyPreviousOverflow;
    document.documentElement.style.overflow = state.htmlPreviousOverflow;
    return;
  }
  depth = 0;
  saved = null;
}
