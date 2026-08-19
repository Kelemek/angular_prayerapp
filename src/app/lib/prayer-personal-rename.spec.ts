import { describe, expect, it } from 'vitest';
import {
  hasPersonalCategoryRenameTargets,
  matchingPersonalPrayerIdsForCategoryRename,
  personalCategoryRenameDbPayload,
} from './prayer-personal-rename';

describe('prayer-personal-rename', () => {
  it('matchingPersonalPrayerIdsForCategoryRename trims category names', () => {
    const ids = matchingPersonalPrayerIdsForCategoryRename(
      [
        { id: 'a', category: ' Evening ' },
        { id: 'b', category: 'Morning' },
      ],
      'Evening'
    );
    expect(ids).toEqual(['a']);
  });

  it('hasPersonalCategoryRenameTargets checks non-empty id list', () => {
    expect(hasPersonalCategoryRenameTargets(['a'])).toBe(true);
    expect(hasPersonalCategoryRenameTargets([])).toBe(false);
  });

  it('personalCategoryRenameDbPayload sets category and timestamp', () => {
    const payload = personalCategoryRenameDbPayload('Night');
    expect(payload.category).toBe('Night');
    expect(payload.updated_at).toBeTruthy();
  });
});
