import { describe, expect, it, vi } from 'vitest';
import { planPersonalPrayerAdd } from './prayer-personal-add-plan';

describe('planPersonalPrayerAdd', () => {
  it('returns limit message when category is full', async () => {
    const plan = await planPersonalPrayerAdd(
      'Family',
      'me@test.com',
      (c) => c ?? null,
      {
        getCategoryCount: vi.fn().mockResolvedValue(1000),
        getCategoryRange: vi.fn(),
        queryMaxDisplayOrderInRange: vi.fn(),
      }
    );
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.userMessage).toContain('limit');
    }
  });

  it('returns display order when category has room', async () => {
    const plan = await planPersonalPrayerAdd(
      'Family',
      'me@test.com',
      (c) => c ?? null,
      {
        getCategoryCount: vi.fn().mockResolvedValue(1),
        getCategoryRange: vi.fn().mockResolvedValue({ min: 2000, max: 2999 }),
        queryMaxDisplayOrderInRange: vi.fn().mockResolvedValue({
          data: { display_order: 2005 },
          error: null,
        }),
      }
    );
    expect(plan).toEqual({
      ok: true,
      category: 'Family',
      displayOrder: 2006,
    });
  });
});
