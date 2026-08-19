import { describe, expect, it } from 'vitest';
import {
  buildCategoryReorderDisplayOrderUpdates,
  buildCategorySwapFallbackSteps,
  buildPrayerOrderDisplayOrderUpdates,
  displayOrderRangeFromExistingCategory,
  interpretPersonalCategoryRpcMutation,
  isUncategorizedCategory,
  nextAvailableCategoryRange,
  nextDisplayOrderInCategoryRange,
  personalPrayerIdsWithTrimmedCategory,
  personalPrayerOrderRpcArgs,
  resolvePersonalCategoryRangeFromDbState,
  rpcMutationSucceeded,
  validatePersonalCategoryRename,
  validatePersonalCategorySwapInputs,
} from './prayer-personal-category';

describe('prayer-personal-category', () => {
  it('computes range from existing category display orders', () => {
    expect(displayOrderRangeFromExistingCategory([2501, 2500])).toEqual({
      min: 2000,
      max: 2999,
    });
  });

  it('assigns next available prefix range for new categories', () => {
    expect(nextAvailableCategoryRange([1001, 2005])).toEqual({
      min: 3000,
      max: 3999,
    });
  });

  it('interprets RPC mutation success and failure', () => {
    expect(interpretPersonalCategoryRpcMutation([{ success: false, message: 'nope' }])).toEqual({
      ok: false,
      message: 'nope',
    });
    expect(interpretPersonalCategoryRpcMutation([{ success: true, message: 'ok' }])).toEqual({
      ok: true,
      logMessage: 'ok',
    });
    expect(interpretPersonalCategoryRpcMutation([])).toEqual({ ok: true });
  });

  it('validates category swap inputs', () => {
    expect(validatePersonalCategorySwapInputs('me@test.com', 'A', 'B')).toEqual({
      ok: true,
      categoryA: 'A',
      categoryB: 'B',
    });
    expect(validatePersonalCategorySwapInputs(null, 'A', 'B').ok).toBe(false);
    expect(validatePersonalCategorySwapInputs('me@test.com', null, 'B').ok).toBe(false);
  });

  it('resolves category range from db state', () => {
    expect(
      resolvePersonalCategoryRangeFromDbState('Family', [{ display_order: 2501 }], [])
    ).toEqual({ min: 2000, max: 2999 });
    expect(resolvePersonalCategoryRangeFromDbState('Family', [], [1001])).toEqual({
      min: 2000,
      max: 2999,
    });
  });

  it('validates personal category rename', () => {
    const sanitize = (c: string | null | undefined) => (c?.trim() ? c.trim() : null);
    expect(
      validatePersonalCategoryRename(' Old ', 'New', sanitize, ['Other'], [])
    ).toMatchObject({ ok: true, oldName: 'Old', newName: 'New' });
    expect(
      validatePersonalCategoryRename('Old', 'Old', sanitize, [], [])
    ).toEqual({ ok: true, oldName: 'Old', newName: 'Old', unchanged: true });
    expect(
      validatePersonalCategoryRename('Old', 'Taken', sanitize, ['Taken'], []).ok
    ).toBe(false);
  });

  it('nextDisplayOrderInCategoryRange returns null when full', () => {
    expect(
      nextDisplayOrderInCategoryRange(1999, { min: 1000, max: 1999 })
    ).toBeNull();
    expect(
      nextDisplayOrderInCategoryRange(1005, { min: 1000, max: 1999 })
    ).toBe(1006);
  });

  it('builds reorder updates with descending prefixes', () => {
    const updates = buildCategoryReorderDisplayOrderUpdates(
      ['Family', 'Work'],
      [
        { id: 'p1', category: 'Family', display_order: 2001 } as never,
        { id: 'p2', category: 'Work', display_order: 1001 } as never,
      ]
    );
    expect(updates).toEqual([
      { prayerId: 'p1', displayOrder: 2001 },
      { prayerId: 'p2', displayOrder: 1001 },
    ]);
  });

  it('builds swap fallback steps with temp prefix', () => {
    const steps = buildCategorySwapFallbackSteps(
      [{ id: 'a1', category: 'A', display_order: 2001 } as never],
      [{ id: 'b1', category: 'B', display_order: 1001 } as never]
    );
    expect(steps?.step1[0].displayOrder).toBe(999001);
    expect(steps?.step2[0].displayOrder).toBe(2001);
    expect(steps?.step3[0].displayOrder).toBe(1001);
  });

  it('matches trimmed category names for rename ids', () => {
    const ids = personalPrayerIdsWithTrimmedCategory(
      [
        { id: 'p1', category: ' Family ' },
        { id: 'p2', category: 'Work' },
      ],
      'Family'
    );
    expect(ids).toEqual(['p1']);
  });

  it('rpcMutationSucceeded reads success flag', () => {
    expect(rpcMutationSucceeded([{ success: true }])).toBe(true);
    expect(rpcMutationSucceeded([{ success: false }])).toBe(false);
    expect(rpcMutationSucceeded([])).toBe(true);
  });

  it('isUncategorizedCategory treats empty as uncategorized', () => {
    expect(isUncategorizedCategory(null)).toBe(true);
    expect(isUncategorizedCategory('  ')).toBe(true);
    expect(isUncategorizedCategory('Family')).toBe(false);
  });

  it('buildPrayerOrderDisplayOrderUpdates assigns descending within range', () => {
    const updates = buildPrayerOrderDisplayOrderUpdates(
      [{ id: 'p1' } as never, { id: 'p2' } as never],
      { min: 1000, max: 1999 }
    );
    expect(updates).toEqual([
      { prayerId: 'p1', displayOrder: 1001 },
      { prayerId: 'p2', displayOrder: 1000 },
    ]);
  });
});
