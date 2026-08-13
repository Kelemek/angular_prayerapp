/** Open the card popover upward when it would clip below the visible viewport. */
export const shouldOpenPersonalCategoryColorPickerUp = (
  pillTop: number,
  pillBottom: number,
  dropdownHeight: number,
  viewportBottom: number,
  viewportTop = 0,
  gap = 4
): boolean => {
  const spaceBelow = viewportBottom - pillBottom;
  const spaceAbove = pillTop - viewportTop;
  const needed = dropdownHeight + gap;
  if (spaceBelow >= needed) {
    return false;
  }
  if (spaceAbove >= needed) {
    return true;
  }
  return spaceAbove > spaceBelow;
};

/** Rough height for pre-flip before the popover is measured in the DOM. */
export const PERSONAL_CATEGORY_COLOR_PICKER_ESTIMATED_HEIGHT = 260;

export interface PersonalCategoryHeaderPickerPosition {
  topPx: number;
  leftPx: number;
  openUp: boolean;
}

/** Fixed header popover: below the category label, left-aligned to the pill. */
export const computePersonalCategoryHeaderPickerPosition = (
  pillRect: Pick<DOMRect, 'top' | 'bottom' | 'left'>,
  dropdownHeight: number,
  viewport: { top: number; bottom: number },
  gap = 4
): PersonalCategoryHeaderPickerPosition => {
  const openUp = shouldOpenPersonalCategoryColorPickerUp(
    pillRect.top,
    pillRect.bottom,
    dropdownHeight,
    viewport.bottom,
    viewport.top,
    gap
  );
  const topPx = openUp
    ? pillRect.top - dropdownHeight - gap
    : pillRect.bottom + gap;
  return {
    topPx,
    leftPx: pillRect.left,
    openUp,
  };
};

/** Visible bounds for clipping checks (scroll viewport or visual viewport). */
export const getPersonalCategoryColorPickerViewportBounds = (
  anchor: HTMLElement | null
): { top: number; bottom: number } => {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0 };
  }

  let top = 0;
  let bottom = window.innerHeight;

  const scrollRoot =
    anchor?.closest('.safe-area-viewport') ??
    document.querySelector('.safe-area-viewport');

  if (scrollRoot instanceof HTMLElement) {
    const rect = scrollRoot.getBoundingClientRect();
    top = rect.top;
    bottom = rect.bottom;
  }

  const visualViewport = window.visualViewport;
  if (visualViewport) {
    top = Math.max(top, visualViewport.offsetTop);
    bottom = Math.min(bottom, visualViewport.offsetTop + visualViewport.height);
  }

  if (typeof document !== 'undefined' && document.body) {
    const bodyPaddingBottom = Number.parseFloat(
      getComputedStyle(document.body).paddingBottom
    );
    if (Number.isFinite(bodyPaddingBottom) && bodyPaddingBottom > 0) {
      bottom = Math.min(bottom, window.innerHeight - bodyPaddingBottom);
    }
  }

  return { top, bottom };
};

/** True when the category pill has scrolled fully out of the visible viewport. */
export const shouldDismissPersonalCategoryPickerOnScroll = (
  pillRect: Pick<DOMRect, 'top' | 'bottom'>,
  viewport: { top: number; bottom: number }
): boolean => {
  return pillRect.bottom <= viewport.top || pillRect.top >= viewport.bottom;
};

export const isNodeInsidePersonalCategoryPickerDropdown = (
  target: EventTarget | null,
  dropdown: HTMLElement | null
): boolean => {
  return target instanceof Node && !!dropdown?.contains(target);
};
