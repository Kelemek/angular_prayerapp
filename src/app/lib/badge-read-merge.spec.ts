import { describe, it, expect } from 'vitest';
import {
  badgeReadStateNeedsUpsert,
  mergeBadgeReadPrayersData,
  mergeBadgeReadPromptsData,
  mergeBadgeReadStateSnapshots,
  normalizeBadgeReadPrayersData,
  normalizeBadgeReadPromptsData,
} from './badge-read-merge';

describe('badge-read-merge', () => {
  it('normalizes malformed prayers data', () => {
    expect(normalizeBadgeReadPrayersData(null)).toEqual({
      prayers: [],
      updates: [],
    });
    expect(normalizeBadgeReadPrayersData({ prayers: 'x', updates: [1, 'u1'] })).toEqual({
      prayers: [],
      updates: ['u1'],
    });
  });

  it('normalizes malformed prompts data', () => {
    expect(normalizeBadgeReadPromptsData(undefined)).toEqual({
      prompts: [],
      updates: [],
    });
    expect(normalizeBadgeReadPromptsData({ prompts: ['p1'], updates: null })).toEqual({
      prompts: ['p1'],
      updates: [],
    });
  });

  it('union-merges prayers and prompts read IDs', () => {
    expect(
      mergeBadgeReadPrayersData(
        { prayers: ['p1'], updates: ['u1'] },
        { prayers: ['p2'], updates: ['u1', 'u2'] }
      )
    ).toEqual({
      prayers: ['p1', 'p2'],
      updates: ['u1', 'u2'],
    });

    expect(
      mergeBadgeReadPromptsData(
        { prompts: ['a'], updates: [] },
        { prompts: ['b'], updates: ['x'] }
      )
    ).toEqual({
      prompts: ['a', 'b'],
      updates: ['x'],
    });
  });

  it('detects when merged state has extras vs remote baseline', () => {
    const merged = mergeBadgeReadStateSnapshots(
      {
        prayersData: { prayers: ['p1', 'p2'], updates: [] },
        promptsData: { prompts: [], updates: [] },
      },
      {
        prayersData: { prayers: ['p1'], updates: [] },
        promptsData: { prompts: [], updates: [] },
      }
    );

    expect(
      badgeReadStateNeedsUpsert(merged, {
        prayersData: { prayers: ['p1'], updates: [] },
        promptsData: { prompts: [], updates: [] },
      })
    ).toBe(true);

    expect(
      badgeReadStateNeedsUpsert(merged, {
        prayersData: { prayers: ['p1', 'p2'], updates: [] },
        promptsData: { prompts: [], updates: [] },
      })
    ).toBe(false);
  });
});
