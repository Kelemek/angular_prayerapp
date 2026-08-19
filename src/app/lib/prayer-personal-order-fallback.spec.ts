import { describe, expect, it, vi } from 'vitest';
import {
  applyCategorySwapFallbackSteps,
  buildCategorySwapFallbackPlan,
  categoryReorderFallbackUpdates,
  collectPersonalPrayerOrderFallbackUpdates,
} from './prayer-personal-order-fallback';
import type { PrayerRequest } from './prayer-types';

function prayer(
  id: string,
  category: string | null,
  displayOrder: number
): PrayerRequest {
  return {
    id,
    category,
    display_order: displayOrder,
    title: id,
    description: '',
    status: 'active',
    requester: 'r',
    date_requested: '',
    created_at: '',
    updated_at: '',
    updates: [],
  };
}

describe('prayer-personal-order-fallback', () => {
  it('collectPersonalPrayerOrderFallbackUpdates builds per-category order', async () => {
    const prayers = [
      prayer('a', 'Work', 2001),
      prayer('b', 'Work', 2000),
    ];
    const updates = await collectPersonalPrayerOrderFallbackUpdates(
      prayers,
      async () => ({ min: 2000, max: 2999 })
    );
    expect(updates).toEqual([
      { prayerId: 'a', displayOrder: 2001 },
      { prayerId: 'b', displayOrder: 2000 },
    ]);
  });

  it('categoryReorderFallbackUpdates assigns new prefixes', () => {
    const all = [prayer('p1', 'A', 3005), prayer('p2', 'B', 2003)];
    const updates = categoryReorderFallbackUpdates(['B', 'A'], all);
    expect(updates).toEqual([
      { prayerId: 'p2', displayOrder: 2003 },
      { prayerId: 'p1', displayOrder: 1005 },
    ]);
  });

  it('applyCategorySwapFallbackSteps runs three batches', async () => {
    const steps = buildCategorySwapFallbackPlan(
      [prayer('a1', 'A', 2000), prayer('b1', 'B', 1000)],
      'A',
      'B'
    );
    expect(steps).not.toBeNull();
    const batches: string[][] = [];
    await applyCategorySwapFallbackSteps(steps!, async (updates) => {
      batches.push(updates.map((u) => u.prayerId));
    });
    expect(batches.length).toBe(3);
    expect(batches[0]).toEqual(['a1']);
  });
});
