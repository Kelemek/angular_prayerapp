import { describe, it, expect, vi } from 'vitest';
import {
  clearBrowserTextSelection,
  isPersonalCategoryDragHandleTarget,
} from './personal-category-long-press';

describe('isPersonalCategoryDragHandleTarget', () => {
  it('returns true for elements inside the drag handle', () => {
    const root = document.createElement('button');
    const handle = document.createElement('span');
    handle.setAttribute('data-personal-category-drag-handle', '');
    root.appendChild(handle);

    expect(isPersonalCategoryDragHandleTarget(handle)).toBe(true);
  });

  it('returns false for other category button content', () => {
    const label = document.createElement('span');
    expect(isPersonalCategoryDragHandleTarget(label)).toBe(false);
  });
});

describe('clearBrowserTextSelection', () => {
  it('removes all selection ranges', () => {
    const removeAllRanges = vi.fn();
    vi.spyOn(window, 'getSelection').mockReturnValue({
      removeAllRanges,
    } as unknown as Selection);

    clearBrowserTextSelection();

    expect(removeAllRanges).toHaveBeenCalled();
  });
});
