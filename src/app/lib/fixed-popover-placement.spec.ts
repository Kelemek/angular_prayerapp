import { describe, it, expect } from 'vitest';
import {
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
