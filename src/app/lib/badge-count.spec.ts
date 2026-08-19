import { describe, it, expect } from 'vitest';
import { calculateBadgeCount } from './badge-count';
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
