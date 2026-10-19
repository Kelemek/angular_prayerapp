import { describe, expect, it } from 'vitest';
import type { GroupPrayerRow } from '../services/prayer-group.service';
import {
  filterGroupPrayersForHome,
  groupPrayerCardModel,
  groupPrayersForHomeView,
  sortGroupPrayersForDisplay,
} from './home-group-catalog';

const prayers: GroupPrayerRow[] = [
  {
    id: '1',
    group_id: 'family',
    title: 'A',
    description: null,
    prayer_for: 'A',
    requester: 'Mark',
    email: 'a@example.com',
    status: 'current',
    date_requested: '2026-10-01T00:00:00Z',
    prayed_for_count: 0,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '2',
    group_id: 'family',
    title: 'B',
    description: null,
    prayer_for: 'B',
    requester: 'Mark',
    email: 'a@example.com',
    status: 'answered',
    date_requested: '2026-10-02T00:00:00Z',
    prayed_for_count: 0,
    created_at: '2026-10-02T00:00:00Z',
    updated_at: '2026-10-02T00:00:00Z',
  },
];

describe('filterGroupPrayersForHome', () => {
  it('shows every prayer in the selected group', () => {
    expect(filterGroupPrayersForHome(prayers, 'named', 'family')).toHaveLength(2);
  });

  it('keeps current prayers on the Current chip', () => {
    expect(filterGroupPrayersForHome(prayers, 'current', null).map((row) => row.id)).toEqual(['1']);
  });
});

describe('sortGroupPrayersForDisplay', () => {
  const multiGroupPrayers: GroupPrayerRow[] = [
    {
      id: 'b-old',
      group_id: 'beta',
      title: 'B old',
      description: null,
      prayer_for: 'B old',
      requester: 'Mark',
      email: 'a@example.com',
      status: 'current',
      date_requested: '2026-10-01T00:00:00Z',
      prayed_for_count: 0,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'a-new',
      group_id: 'alpha',
      title: 'A new',
      description: null,
      prayer_for: 'A new',
      requester: 'Mark',
      email: 'a@example.com',
      status: 'current',
      date_requested: '2026-10-03T00:00:00Z',
      prayed_for_count: 0,
      created_at: '2026-10-03T00:00:00Z',
      updated_at: '2026-10-03T00:00:00Z',
    },
    {
      id: 'b-new',
      group_id: 'beta',
      title: 'B new',
      description: null,
      prayer_for: 'B new',
      requester: 'Mark',
      email: 'a@example.com',
      status: 'current',
      date_requested: '2026-10-04T00:00:00Z',
      prayed_for_count: 0,
      created_at: '2026-10-04T00:00:00Z',
      updated_at: '2026-10-04T00:00:00Z',
    },
  ];

  const groupOrder = [{ id: 'alpha' }, { id: 'beta' }];

  it('orders cards by group chip order on Current', () => {
    expect(
      sortGroupPrayersForDisplay(multiGroupPrayers, groupOrder, 'current').map((row) => row.id),
    ).toEqual(['a-new', 'b-new', 'b-old']);
  });

  it('keeps date order when viewing a single group', () => {
    const named = groupPrayersForHomeView(multiGroupPrayers, 'named', 'beta', groupOrder);
    expect(named.map((row) => row.id)).toEqual(['b-new', 'b-old']);
  });
});

describe('groupPrayerCardModel', () => {
  it('keeps the group prayer and its updates in the prayer-card shape', () => {
    const card = groupPrayerCardModel(prayers[0]!, [
      {
        id: 'u1',
        group_prayer_id: '1',
        content: 'Update',
        author: 'Mark',
        author_email: 'a@example.com',
        mark_as_answered: false,
        created_at: '2026-10-03T00:00:00Z',
        updated_at: '2026-10-03T00:00:00Z',
      },
    ]);
    expect(card.prayer_for).toBe('A');
    expect(card.prayed_for_count).toBe(0);
    expect(card.updates).toHaveLength(1);
    expect(card.updates[0]?.prayer_id).toBe('1');
  });
});
