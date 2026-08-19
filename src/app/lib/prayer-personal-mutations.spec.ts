import { describe, expect, it } from 'vitest';
import {
  applyPersonalPrayerFieldUpdate,
  isClearingPersonalAnsweredCategory,
  personalPrayerStatusFromCategory,
  removePersonalPrayerUpdateById,
} from './prayer-personal-mutations';

describe('prayer-personal-mutations', () => {
  it('maps Answered category to answered status', () => {
    expect(personalPrayerStatusFromCategory('Answered')).toBe('answered');
    expect(personalPrayerStatusFromCategory('Family')).toBe('current');
  });

  it('detects clearing Answered category', () => {
    expect(isClearingPersonalAnsweredCategory('Answered', 'Family')).toBe(true);
    expect(isClearingPersonalAnsweredCategory('Family', 'Answered')).toBe(false);
  });

  it('clears update answered flags when leaving Answered', () => {
    const updated = applyPersonalPrayerFieldUpdate(
      [
        {
          id: 'p1',
          category: 'Answered',
          updates: [{ id: 'u1', mark_as_answered: true } as never],
        } as never,
      ],
      'p1',
      {
        updates: { category: 'Family' },
        newCategory: 'Family',
        newDisplayOrder: 1001,
        clearingAnswered: true,
        updatedAt: '2026-01-01',
      }
    );
    expect(updated[0].updates?.[0].mark_as_answered).toBe(false);
    expect(updated[0].status).toBe('current');
  });

  it('removes personal prayer update by id', () => {
    const updated = removePersonalPrayerUpdateById(
      [{ id: 'p1', updates: [{ id: 'u1' }, { id: 'u2' }] } as never],
      'u1'
    );
    expect(updated[0].updates).toHaveLength(1);
    expect(updated[0].updates?.[0].id).toBe('u2');
  });
});
