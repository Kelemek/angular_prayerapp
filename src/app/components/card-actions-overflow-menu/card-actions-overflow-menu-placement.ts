import { shouldOpenFixedPopoverUp } from '../../lib/fixed-popover-placement';

export const CARD_ACTIONS_OVERFLOW_ITEM_HEIGHT_PX = 44;
export const CARD_ACTIONS_OVERFLOW_PANEL_PADDING_PX = 8;
export const CARD_ACTIONS_OVERFLOW_MIN_WIDTH_PX = 192;

export function estimateCardActionsOverflowHeight(itemCount: number): number {
  return (
    Math.max(0, itemCount) * CARD_ACTIONS_OVERFLOW_ITEM_HEIGHT_PX +
    CARD_ACTIONS_OVERFLOW_PANEL_PADDING_PX
  );
}

export interface CardActionsOverflowPosition {
  topPx: number;
  leftPx: number;
  openUp: boolean;
}

/** Fixed menu: right-aligned to the hamburger, flips up near the bottom. */
export const computeCardActionsOverflowPosition = (
  triggerRect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>,
  menuSize: { width: number; height: number },
  viewport: { top: number; bottom: number; width: number },
  gap = 4,
  pad = 8
): CardActionsOverflowPosition => {
  const openUp = shouldOpenFixedPopoverUp(
    triggerRect.top,
    triggerRect.bottom,
    menuSize.height,
    viewport.bottom,
    viewport.top,
    gap
  );
  let topPx = openUp
    ? triggerRect.top - menuSize.height - gap
    : triggerRect.bottom + gap;
  topPx = Math.min(topPx, viewport.bottom - pad - menuSize.height);
  topPx = Math.max(viewport.top + pad, topPx);

  let leftPx = triggerRect.right - menuSize.width;
  leftPx = Math.min(leftPx, viewport.width - pad - menuSize.width);
  leftPx = Math.max(pad, leftPx);

  return { topPx, leftPx, openUp };
};
