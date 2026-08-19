import { describe, expect, it } from 'vitest';
import {
  personalPrayerUpdateClearsAnsweredFlags,
  shouldDropPersonalPrayerRemindersAfterUpdate,
  startPersonalPrayerUpdatePlan,
  validatePersonalCategoryChangeForUpdate,
} from './prayer-personal-update-plan';
import type { PrayerRequest } from './prayer-types';

function prayer(id: string, category: string | null): PrayerRequest {
  return {
    id,
    category,
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

describe('prayer-personal-update-plan', () => {
  it('startPersonalPrayerUpdatePlan returns missing when id not found', () => {
    expect(
      startPersonalPrayerUpdatePlan([], 'missing', {}, (c) => c ?? null)
    ).toEqual({ ok: false });
  });

  it('validatePersonalCategoryChangeForUpdate blocks at limit', () => {
    const result = validatePersonalCategoryChangeForUpdate(true, true, 1000, 'Work');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('Work');
    }
  });

  it('personalPrayerUpdateClearsAnsweredFlags when leaving Answered', () => {
    expect(personalPrayerUpdateClearsAnsweredFlags('Answered', 'Work')).toBe(true);
    expect(personalPrayerUpdateClearsAnsweredFlags('Work', 'Answered')).toBe(false);
  });

  it('shouldDropPersonalPrayerRemindersAfterUpdate when marked answered', () => {
    expect(shouldDropPersonalPrayerRemindersAfterUpdate('Answered')).toBe(true);
    expect(shouldDropPersonalPrayerRemindersAfterUpdate('Work')).toBe(false);
  });

  it('startPersonalPrayerUpdatePlan detects category change', () => {
    const plan = startPersonalPrayerUpdatePlan(
      [prayer('p1', 'Work')],
      'p1',
      { category: 'Family' },
      (c) => c ?? null
    );
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.categoryChanged).toBe(true);
      expect(plan.newCategory).toBe('Family');
    }
  });
});
