import { describe, it, expect } from 'vitest';
import {
  prayerEditorClampPage,
  prayerEditorPageView,
  prayerEditorSearchResultsState,
} from './admin-prayer-editor-pagination-state';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

describe('admin-prayer-editor-pagination-state', () => {
  const prayer = (id: string): PrayerEditorPrayer => ({
    id,
    title: `Title ${id}`,
    requester: 'John',
    email: 'john@example.com',
    status: 'current',
    created_at: '2024-01-01T00:00:00Z',
    description: 'Desc',
  });

  it('clamps page within bounds', () => {
    expect(prayerEditorClampPage(0, 25, 10)).toBe(1);
    expect(prayerEditorClampPage(5, 25, 10)).toBe(3);
    expect(prayerEditorClampPage(99, 25, 10)).toBe(3);
  });

  it('builds page view flags', () => {
    const view = prayerEditorPageView(25, 10, 2);
    expect(view.totalPages).toBe(3);
    expect(view.isFirstPage).toBe(false);
    expect(view.isLastPage).toBe(false);
    expect(view.paginationRange.length).toBeGreaterThan(0);
  });

  it('builds search results state', () => {
    const prayers = [prayer('p1'), prayer('p2')];
    const state = prayerEditorSearchResultsState(prayers);
    expect(state.allPrayers).toEqual(prayers);
    expect(state.totalItems).toBe(2);
    expect(state.currentPage).toBe(1);
  });
});
