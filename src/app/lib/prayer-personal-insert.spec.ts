import { describe, expect, it } from 'vitest';
import { planPersonalPrayerInsertDisplayOrder } from './prayer-personal-insert';

describe('prayer-personal-insert', () => {
  it('plans next display order within range', () => {
    const plan = planPersonalPrayerInsertDisplayOrder(
      null,
      { display_order: 2000 },
      { min: 2000, max: 2999 },
      'Work'
    );
    expect(plan).toEqual({ ok: true, displayOrder: 2001 });
  });

  it('returns user message when category range is full', () => {
    const plan = planPersonalPrayerInsertDisplayOrder(
      null,
      { display_order: 2999 },
      { min: 2000, max: 2999 },
      'Work'
    );
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.userMessage).toContain('Work');
      expect(plan.userMessage).toContain('full');
    }
  });
});
