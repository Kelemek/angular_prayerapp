/** Open a fixed popover upward when it would clip below the visible viewport. */
export const shouldOpenFixedPopoverUp = (
  triggerTop: number,
  triggerBottom: number,
  popoverHeight: number,
  viewportBottom: number,
  viewportTop = 0,
  gap = 4
): boolean => {
  const spaceBelow = viewportBottom - triggerBottom;
  const spaceAbove = triggerTop - viewportTop;
  const needed = popoverHeight + gap;
  if (spaceBelow >= needed) {
    return false;
  }
  if (spaceAbove >= needed) {
    return true;
  }
  return spaceAbove > spaceBelow;
};

export interface SafeAreaViewportBounds {
  top: number;
  bottom: number;
  width: number;
}

/** Visible bounds for clipping checks (scroll viewport or visual viewport). */
export const getSafeAreaViewportBounds = (
  anchor: HTMLElement | null
): SafeAreaViewportBounds => {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, width: 0 };
  }

  let top = 0;
  let bottom = window.innerHeight;
  let width = window.innerWidth;

  const scrollRoot =
    anchor?.closest('.safe-area-viewport') ??
    document.querySelector('.safe-area-viewport');

  if (scrollRoot instanceof HTMLElement) {
    const rect = scrollRoot.getBoundingClientRect();
    top = rect.top;
    bottom = rect.bottom;
    width = rect.width;
  }

  const visualViewport = window.visualViewport;
  if (visualViewport) {
    top = Math.max(top, visualViewport.offsetTop);
    bottom = Math.min(bottom, visualViewport.offsetTop + visualViewport.height);
    width = Math.min(width, visualViewport.width);
  }

  if (typeof document !== 'undefined' && document.body) {
    const bodyPaddingBottom = Number.parseFloat(
      getComputedStyle(document.body).paddingBottom
    );
    if (Number.isFinite(bodyPaddingBottom) && bodyPaddingBottom > 0) {
      bottom = Math.min(bottom, window.innerHeight - bodyPaddingBottom);
    }
  }

  return { top, bottom, width };
};
