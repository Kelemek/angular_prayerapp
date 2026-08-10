import { describe, it, expect } from 'vitest';
import { resolvePrayerItemDeepLinkTab, resolvePersonalDeepLinkCategoryMode } from './prayer-item-deep-link';

describe('resolvePrayerItemDeepLinkTab', () => {
  const community = [
    { id: 'c-current', status: 'current' },
    { id: 'c-answered', status: 'answered' },
    { id: 'c-archived', status: 'archived' },
  ];
  const personal = [{ id: 'p-1' }];

  it('routes pc-member ids to planning_center_list', () => {
    expect(
      resolvePrayerItemDeepLinkTab('pc-member-42', community, personal)
    ).toBe('planning_center_list');
  });

  it('routes personal prayer ids to personal tab', () => {
    expect(resolvePrayerItemDeepLinkTab('p-1', community, personal)).toBe(
      'personal'
    );
  });

  it('routes answered community prayers to answered tab', () => {
    expect(resolvePrayerItemDeepLinkTab('c-answered', community, personal)).toBe(
      'answered'
    );
  });

  it('routes archived community prayers to total tab', () => {
    expect(resolvePrayerItemDeepLinkTab('c-archived', community, personal)).toBe(
      'total'
    );
  });

  it('routes current community prayers to current tab', () => {
    expect(resolvePrayerItemDeepLinkTab('c-current', community, personal)).toBe(
      'current'
    );
  });

  it('returns null when prayer is not in loaded lists yet', () => {
    expect(resolvePrayerItemDeepLinkTab('unknown', community, personal)).toBe(
      null
    );
  });
});

describe('resolvePersonalDeepLinkCategoryMode', () => {
  const personal = [
    { id: 'p-current', category: 'Health' },
    { id: 'p-answered', category: 'Answered' },
    { id: 'p-uncategorized', category: null },
  ];

  it('returns answered for personal prayers in Answered category', () => {
    expect(resolvePersonalDeepLinkCategoryMode('p-answered', personal)).toBe(
      'answered'
    );
  });

  it('returns current for non-answered personal prayers', () => {
    expect(resolvePersonalDeepLinkCategoryMode('p-current', personal)).toBe(
      'current'
    );
    expect(
      resolvePersonalDeepLinkCategoryMode('p-uncategorized', personal)
    ).toBe('current');
  });

  it('returns null when id is not a personal prayer', () => {
    expect(resolvePersonalDeepLinkCategoryMode('unknown', personal)).toBeNull();
  });
});
