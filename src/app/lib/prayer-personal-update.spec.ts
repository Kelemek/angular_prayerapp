import { describe, expect, it } from 'vitest';
import {
  buildClearPersonalPrayerAnsweredFlagsPayload,
  displayOrderForPersonalCategoryChange,
  findPersonalPrayerById,
  personalCategoryAtLimitMessage,
  resolvePersonalPrayerCategoryEdit,
} from './prayer-personal-update';

describe('prayer-personal-update', () => {
  it('finds prayer by id', () => {
    expect(
      findPersonalPrayerById([{ id: 'p1' } as never, { id: 'p2' } as never], 'p2')?.id
    ).toBe('p2');
  });

  it('resolves category edit with sanitize', () => {
    const result = resolvePersonalPrayerCategoryEdit(
      { id: 'p1', category: 'Old' } as never,
      { category: ' New ' },
      (c) => (c?.trim() ? c.trim() : null)
    );
    expect(result.categoryChanged).toBe(true);
    expect(result.newCategory).toBe('New');
  });

  it('builds category limit message', () => {
    expect(personalCategoryAtLimitMessage('Family')).toContain('Family');
  });

  it('computes display order after category change', () => {
    expect(
      displayOrderForPersonalCategoryChange(null, { display_order: 2005 }, {
        min: 2000,
        max: 2999,
      })
    ).toBe(2006);
  });

  it('builds clear answered flags payload', () => {
    expect(buildClearPersonalPrayerAnsweredFlagsPayload()).toMatchObject({
      mark_as_answered: false,
    });
  });
});
