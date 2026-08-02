import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_MEMORIZE_LIST_VIEW,
  DEFAULT_MEMORIZE_TABLE_SORT,
  MEMORIZE_LIST_VIEW_KEY,
  MEMORIZE_TABLE_SORT_KEY,
  loadMemorizeListView,
  loadMemorizeTableSort,
  saveMemorizeListView,
  saveMemorizeTableSort,
} from './memorization-list-prefs';

describe('memorization-list-prefs', () => {
  afterEach(() => {
    localStorage.removeItem(MEMORIZE_LIST_VIEW_KEY);
    localStorage.removeItem(MEMORIZE_TABLE_SORT_KEY);
  });

  it('defaults list view to cards when unset', () => {
    expect(DEFAULT_MEMORIZE_LIST_VIEW).toBe('cards');
    expect(loadMemorizeListView()).toBe('cards');
  });

  it('saves and loads list view', () => {
    saveMemorizeListView('table');
    expect(loadMemorizeListView()).toBe('table');
  });

  it('falls back to cards for corrupt list view', () => {
    localStorage.setItem(MEMORIZE_LIST_VIEW_KEY, 'grid');
    expect(loadMemorizeListView()).toBe('cards');
  });

  it('defaults table sort to mastery ascending', () => {
    expect(loadMemorizeTableSort()).toEqual(DEFAULT_MEMORIZE_TABLE_SORT);
  });

  it('saves and loads table sort', () => {
    saveMemorizeTableSort({ sortBy: 'sessions', sortDirection: 'desc' });
    expect(loadMemorizeTableSort()).toEqual({
      sortBy: 'sessions',
      sortDirection: 'desc',
    });
  });

  it('falls back to default for corrupt table sort JSON', () => {
    localStorage.setItem(MEMORIZE_TABLE_SORT_KEY, '{not-json');
    expect(loadMemorizeTableSort()).toEqual(DEFAULT_MEMORIZE_TABLE_SORT);
  });

  it('falls back to default for invalid sortBy', () => {
    localStorage.setItem(
      MEMORIZE_TABLE_SORT_KEY,
      JSON.stringify({ sortBy: 'foo', sortDirection: 'asc' })
    );
    expect(loadMemorizeTableSort()).toEqual(DEFAULT_MEMORIZE_TABLE_SORT);
  });
});
