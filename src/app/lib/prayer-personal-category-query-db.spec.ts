import { describe, expect, it, vi } from 'vitest';
import {
  fetchPersonalCategoryPrayerCountWithDb,
  personalCategoryDbEqValue,
  resolvePersonalCategoryRangeWithDb,
} from './prayer-personal-category-query-db';

describe('prayer-personal-category-query-db', () => {
  it('personalCategoryDbEqValue normalizes empty to null', () => {
    expect(personalCategoryDbEqValue(null)).toBeNull();
    expect(personalCategoryDbEqValue('')).toBeNull();
    expect(personalCategoryDbEqValue('Family')).toBe('Family');
  });

  it('resolvePersonalCategoryRangeWithDb returns uncategorized range without DB', async () => {
    const fetchCategory = vi.fn();
    const fetchAll = vi.fn();
    const range = await resolvePersonalCategoryRangeWithDb(
      null,
      'me@test.com',
      fetchCategory,
      fetchAll,
      1000
    );
    expect(range).toEqual({ min: 0, max: 999 });
    expect(fetchCategory).not.toHaveBeenCalled();
    expect(fetchAll).not.toHaveBeenCalled();
  });

  it('resolvePersonalCategoryRangeWithDb fetches all orders when category empty', async () => {
    const fetchCategory = vi.fn().mockResolvedValue({ data: [], error: null });
    const fetchAll = vi.fn().mockResolvedValue({
      data: [{ category: 'A', display_order: 1001 }],
      error: null,
    });

    const range = await resolvePersonalCategoryRangeWithDb(
      'NewCat',
      'me@test.com',
      fetchCategory,
      fetchAll,
      1000
    );

    expect(fetchCategory).toHaveBeenCalledWith('me@test.com', 'NewCat');
    expect(fetchAll).toHaveBeenCalledWith('me@test.com', 1000);
    expect(range).toEqual({ min: 2000, max: 2999 });
  });

  it('fetchPersonalCategoryPrayerCountWithDb returns 0 without email', async () => {
    const count = await fetchPersonalCategoryPrayerCountWithDb(null, 'Family', vi.fn());
    expect(count).toBe(0);
  });

  it('fetchPersonalCategoryPrayerCountWithDb counts ids from fetch', async () => {
    const count = await fetchPersonalCategoryPrayerCountWithDb(
      'me@test.com',
      'Family',
      vi.fn().mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }], error: null })
    );
    expect(count).toBe(2);
  });
});
