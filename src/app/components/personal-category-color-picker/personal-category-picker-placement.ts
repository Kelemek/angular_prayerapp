import { shouldOpenFixedPopoverUp } from '../../lib/fixed-popover-placement';

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
  const openUp = shouldOpenFixedPopoverUp(
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
