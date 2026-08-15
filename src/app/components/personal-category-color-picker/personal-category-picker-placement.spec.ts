import { describe, it, expect } from 'vitest';
import {
  computePersonalCategoryHeaderPickerPosition,
  isNodeInsidePersonalCategoryPickerDropdown,
  shouldDismissPersonalCategoryPickerOnScroll,
} from './personal-category-picker-placement';

describe('personalCategoryPickerPlacement', () => {
  describe('computePersonalCategoryHeaderPickerPosition', () => {
    it('places the popover below and left-aligned to the category pill', () => {
      const position = computePersonalCategoryHeaderPickerPosition(
        { top: 100, bottom: 136, left: 24 },
        200,
        { top: 0, bottom: 800 }
      );

      expect(position.openUp).toBe(false);
      expect(position.topPx).toBe(140);
      expect(position.leftPx).toBe(24);
    });

    it('opens upward when there is not enough room below', () => {
      const position = computePersonalCategoryHeaderPickerPosition(
        { top: 900, bottom: 936, left: 16 },
        200,
        { top: 0, bottom: 950 }
      );

      expect(position.openUp).toBe(true);
      expect(position.topPx).toBe(696);
      expect(position.leftPx).toBe(16);
    });
  });

  describe('shouldDismissPersonalCategoryPickerOnScroll', () => {
    it('dismisses when the pill is fully above the viewport', () => {
      expect(
        shouldDismissPersonalCategoryPickerOnScroll(
          { top: 10, bottom: 40 },
          { top: 100, bottom: 800 }
        )
      ).toBe(true);
    });

    it('dismisses when the pill is fully below the viewport', () => {
      expect(
        shouldDismissPersonalCategoryPickerOnScroll(
          { top: 900, bottom: 930 },
          { top: 0, bottom: 800 }
        )
      ).toBe(true);
    });

    it('keeps open when the pill still intersects the viewport', () => {
      expect(
        shouldDismissPersonalCategoryPickerOnScroll(
          { top: 200, bottom: 230 },
          { top: 0, bottom: 800 }
        )
      ).toBe(false);
    });
  });

  describe('isNodeInsidePersonalCategoryPickerDropdown', () => {
    it('returns true for nodes inside the dropdown', () => {
      const dropdown = document.createElement('div');
      const child = document.createElement('button');
      dropdown.appendChild(child);
      expect(isNodeInsidePersonalCategoryPickerDropdown(child, dropdown)).toBe(
        true
      );
    });

    it('returns false for outside nodes', () => {
      const dropdown = document.createElement('div');
      const outside = document.createElement('button');
      expect(
        isNodeInsidePersonalCategoryPickerDropdown(outside, dropdown)
      ).toBe(false);
    });
  });
});
