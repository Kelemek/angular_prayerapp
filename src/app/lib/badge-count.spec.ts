import { describe, it, expect } from 'vitest';
import {
  calculateBadgeCount,
  checkIndividualBadgeForItem,
  getBadgeUnreadIds,
  isViewerAuthored,
} from './badge-count';
import type { BadgeCachedItem } from './badge-types';

describe('calculateBadgeCount', () => {
  const items: BadgeCachedItem[] = [
    {
      id: 'p1',
      status: 'current',
      updated_at: '2024-01-01',
      updates: [{ id: 'u1', created_at: '2024-01-02' }],
    },
    {
      id: 'p2',
      status: 'answered',
      updated_at: '2024-01-01',
    },
  ];

  const readPrayers = { prayers: ['p2'], updates: [] };
  const readPrompts = { prompts: [], updates: [] };

  it('counts unread prayers and updates', () => {
    expect(calculateBadgeCount(items, 'prayers', readPrayers, readPrompts)).toBe(2);
  });

  it('filters by prayer status', () => {
    expect(
      calculateBadgeCount(items, 'prayers', readPrayers, readPrompts, 'current')
    ).toBe(2);
    expect(
      calculateBadgeCount(items, 'prayers', readPrayers, readPrompts, 'answered')
    ).toBe(0);
  });
});

describe('own-content exclusion', () => {
  const noneRead = { prayers: [], updates: [] };
  const promptsNoneRead = { prompts: [], updates: [] };
  const items: BadgeCachedItem[] = [
    {
      id: 'mine',
      status: 'current',
      updated_at: '2024-01-01',
      email: 'Me@Example.com',
      updates: [
        { id: 'u-mine', created_at: '2024-01-02', author_email: 'me@example.com' },
        { id: 'u-other', created_at: '2024-01-03', author_email: 'other@example.com' },
      ],
    },
    {
      id: 'theirs',
      status: 'current',
      updated_at: '2024-01-01',
      email: 'other@example.com',
      updates: [{ id: 'u-mine-2', created_at: '2024-01-02', author_email: ' ME@example.com ' }],
    },
  ];

  it('skips the viewer’s own prayers and updates in the count', () => {
    expect(
      calculateBadgeCount(items, 'prayers', noneRead, promptsNoneRead, 'current', 'me@example.com')
    ).toBe(2);
  });

  it('counts everything when there is no viewer email', () => {
    expect(calculateBadgeCount(items, 'prayers', noneRead, promptsNoneRead, 'current')).toBe(5);
  });

  it('hides the individual badge and unread id for own prayers', () => {
    expect(
      checkIndividualBadgeForItem(items, 'prayers', 'mine', noneRead, promptsNoneRead, 'me@example.com')
    ).toBe(false);
    expect(
      checkIndividualBadgeForItem(items, 'prayers', 'theirs', noneRead, promptsNoneRead, 'me@example.com')
    ).toBe(true);
    expect(
      getBadgeUnreadIds(items, 'prayers', noneRead, promptsNoneRead, 'me@example.com')
    ).toEqual(['theirs']);
  });

  it('matches emails case- and whitespace-insensitively and never matches blanks', () => {
    expect(isViewerAuthored(' ME@example.com', 'me@example.com ')).toBe(true);
    expect(isViewerAuthored(null, 'me@example.com')).toBe(false);
    expect(isViewerAuthored('me@example.com', null)).toBe(false);
    expect(isViewerAuthored('', '')).toBe(false);
    expect(isViewerAuthored('  ', '  ')).toBe(false);
  });
});
