import { describe, it, expect } from 'vitest';
import {
  applyPrayerCatalogFilters,
  filterPrayerRequestsByStatusAndSearch,
} from './prayer-filter';
import type { PrayerRequest } from './prayer-types';
import { isPersonalPrayerDisplayOrderOnlyChange } from './prayer-personal-display';

describe('prayer-filter', () => {
  const prayers: PrayerRequest[] = [
    {
      id: '1',
      title: 'Findme',
      description: 'desc',
      status: 'current',
      requester: 'a',
      prayer_for: 'John',
      date_requested: '2024-01-01',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      updates: [],
    },
    {
      id: '2',
      title: 'Other',
      description: 'desc',
      status: 'answered',
      requester: 'b',
      prayer_for: 'Mary',
      date_requested: '2024-01-02',
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
      updates: [],
    },
  ];

  it('applyPrayerCatalogFilters filters by status', () => {
    expect(applyPrayerCatalogFilters(prayers, { status: 'current' })).toHaveLength(1);
  });

  it('filterPrayerRequestsByStatusAndSearch matches prayer_for', () => {
    expect(
      filterPrayerRequestsByStatusAndSearch(prayers, { search: 'healing' })
    ).toEqual([]);
    expect(
      filterPrayerRequestsByStatusAndSearch(prayers, { search: 'mary' })
    ).toHaveLength(1);
  });
});

describe('isPersonalPrayerDisplayOrderOnlyChange', () => {
  it('returns true when only display_order changed', () => {
    expect(
      isPersonalPrayerDisplayOrderOnlyChange(
        { id: '1', display_order: 1001, title: 't' },
        { id: '1', display_order: 1002, title: 't' }
      )
    ).toBe(true);
  });

  it('returns false when other fields changed', () => {
    expect(
      isPersonalPrayerDisplayOrderOnlyChange(
        { id: '1', display_order: 1001, title: 't' },
        { id: '1', display_order: 1002, title: 'changed' }
      )
    ).toBe(false);
  });
});
