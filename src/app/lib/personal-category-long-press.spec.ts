import { describe, it, expect } from 'vitest';
import { isPersonalCategoryDragHandleTarget } from './personal-category-long-press';

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
