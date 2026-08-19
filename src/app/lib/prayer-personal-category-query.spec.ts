import { describe, expect, it } from 'vitest';
import {
  countPersonalPrayersInCategory,
  mapAllCategoryDisplayOrders,
  personalCategoryRangeForUncategorized,
  personalCategoryRangeFromQueryState,
  shouldFetchAllCategoryDisplayOrders,
} from './prayer-personal-category-query';

describe('prayer-personal-category-query', () => {
  it('personalCategoryRangeForUncategorized returns fixed range for empty category', () => {
    expect(personalCategoryRangeForUncategorized(null)).toEqual({ min: 0, max: 999 });
    expect(personalCategoryRangeForUncategorized('')).toEqual({ min: 0, max: 999 });
    expect(personalCategoryRangeForUncategorized('Family')).toBeNull();
  });

  it('shouldFetchAllCategoryDisplayOrders when category has no rows', () => {
    expect(shouldFetchAllCategoryDisplayOrders([])).toBe(true);
    expect(shouldFetchAllCategoryDisplayOrders([{ display_order: 2000 }])).toBe(false);
  });

  it('mapAllCategoryDisplayOrders extracts display_order values', () => {
    expect(mapAllCategoryDisplayOrders([{ display_order: 1001 }, { display_order: 2002 }])).toEqual([
      1001,
      2002,
    ]);
  });

  it('personalCategoryRangeFromQueryState uses existing orders in category', () => {
    const range = personalCategoryRangeFromQueryState('Family', [{ display_order: 2005 }], []);
    expect(range).toEqual({ min: 2000, max: 2999 });
  });

  it('countPersonalPrayersInCategory counts rows', () => {
    expect(countPersonalPrayersInCategory([{ id: 'a' }, { id: 'b' }])).toBe(2);
    expect(countPersonalPrayersInCategory(null)).toBe(0);
  });
});
