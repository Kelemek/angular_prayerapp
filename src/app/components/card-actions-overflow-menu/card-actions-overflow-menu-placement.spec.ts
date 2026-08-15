import { describe, it, expect } from 'vitest';
import {
  computeCardActionsOverflowPosition,
  estimateCardActionsOverflowHeight,
} from './card-actions-overflow-menu-placement';

describe('cardActionsOverflowPlacement', () => {
  describe('estimateCardActionsOverflowHeight', () => {
    it('uses 44px rows plus panel padding', () => {
      expect(estimateCardActionsOverflowHeight(4)).toBe(184);
    });
  });

  describe('computeCardActionsOverflowPosition', () => {
    it('places the menu below and right-aligned to the trigger', () => {
      const position = computeCardActionsOverflowPosition(
        { top: 100, bottom: 136, left: 400, right: 424 },
        { width: 192, height: 180 },
        { top: 0, bottom: 800, width: 800 }
      );

      expect(position.openUp).toBe(false);
      expect(position.topPx).toBe(140);
      expect(position.leftPx).toBe(232);
    });

    it('opens upward when there is not enough room below', () => {
      const position = computeCardActionsOverflowPosition(
        { top: 900, bottom: 936, left: 500, right: 524 },
        { width: 192, height: 180 },
        { top: 0, bottom: 950, width: 800 }
      );

      expect(position.openUp).toBe(true);
      expect(position.topPx).toBe(716);
      expect(position.leftPx).toBe(332);
    });

    it('clamps horizontally so the panel stays on screen', () => {
      const position = computeCardActionsOverflowPosition(
        { top: 40, bottom: 70, left: 10, right: 34 },
        { width: 192, height: 100 },
        { top: 0, bottom: 800, width: 200 }
      );

      expect(position.leftPx).toBe(8);
    });
  });
});
