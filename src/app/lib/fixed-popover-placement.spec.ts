import { describe, it, expect } from 'vitest';
import {
  computeFixedAnchoredMenuPosition,
  getSafeAreaViewportBounds,
  shouldOpenFixedPopoverUp,
} from './fixed-popover-placement';

describe('fixedPopoverPlacement', () => {
  describe('shouldOpenFixedPopoverUp', () => {
    it('opens downward when there is room below', () => {
      expect(shouldOpenFixedPopoverUp(100, 130, 200, 800, 0)).toBe(false);
    });

    it('opens upward when near the bottom of the viewport', () => {
      expect(shouldOpenFixedPopoverUp(900, 930, 200, 950, 0)).toBe(true);
    });

    it('prefers the side with more space when both are tight', () => {
      expect(shouldOpenFixedPopoverUp(200, 230, 400, 300, 0)).toBe(true);
    });

    it('accounts for a sticky header via viewportTop', () => {
      expect(shouldOpenFixedPopoverUp(350, 380, 200, 400, 80)).toBe(true);
    });
  });

  describe('computeFixedAnchoredMenuPosition', () => {
    it('anchors an upward menu to the trigger when CSS max-height is shorter than the list', () => {
      const trigger = { top: 700, bottom: 744, left: 16, width: 400 };
      const unconstrained = 7 * 44 + 8;
      const cssMax = 288;
      const position = computeFixedAnchoredMenuPosition(
        trigger,
        unconstrained,
        cssMax,
        { top: 0, bottom: 800 },
        4
      );

      expect(position.openUp).toBe(true);
      expect(position.maxHeight).toBe(288);
      expect(position.top + position.maxHeight + 4).toBe(trigger.top);
      expect(position.left).toBe(16);
      expect(position.width).toBe(400);
    });

    it('opens downward against the trigger when there is room below', () => {
      const trigger = { top: 100, bottom: 144, left: 8, width: 320 };
      const position = computeFixedAnchoredMenuPosition(
        trigger,
        200,
        288,
        { top: 0, bottom: 800 },
        4
      );

      expect(position.openUp).toBe(false);
      expect(position.top).toBe(148);
      expect(position.maxHeight).toBe(200);
    });
  });

  describe('getSafeAreaViewportBounds', () => {
    it('uses the safe-area scroll container when present', () => {
      const viewport = document.createElement('div');
      viewport.className = 'safe-area-viewport';
      viewport.getBoundingClientRect = () =>
        ({
          top: 48,
          bottom: 900,
          left: 0,
          right: 1200,
          width: 1200,
          height: 852,
          x: 0,
          y: 48,
          toJSON: () => ({}),
        }) as DOMRect;
      document.body.appendChild(viewport);

      const anchor = document.createElement('button');
      viewport.appendChild(anchor);

      const bounds = getSafeAreaViewportBounds(anchor);
      expect(bounds).toEqual({ top: 48, bottom: 900, width: 1200 });

      viewport.remove();
    });
  });
});
