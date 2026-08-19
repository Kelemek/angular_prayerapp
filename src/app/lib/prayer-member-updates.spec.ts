import { describe, expect, it } from 'vitest';
import {
  buildMemberPrayerUpdateInsertRow,
  buildMemberPrayerUpdatePatch,
  groupMemberPrayerUpdatesByPersonId,
  planningCenterListDataCacheKey,
  trimMemberPersonId,
  writeMemberUpdatesCacheForPerson,
  memberUpdatesCacheForPerson,
} from './prayer-member-updates';

describe('prayer-member-updates', () => {
  it('groups rows by person_id', () => {
    const grouped = groupMemberPrayerUpdatesByPersonId([
      {
        id: 'u1',
        person_id: 'p1',
        content: 'a',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        is_answered: false,
      },
      {
        id: 'u2',
        person_id: 'p2',
        content: 'b',
        created_at: '2026-01-02',
        updated_at: '2026-01-02',
        is_answered: true,
      },
    ]);

    expect(grouped['p1']).toHaveLength(1);
    expect(grouped['p2'][0].is_answered).toBe(true);
  });

  it('builds partial update patch from PrayerUpdate fields', () => {
    expect(buildMemberPrayerUpdatePatch({ content: 'new' })).toEqual({
      content: 'new',
    });
    expect(
      buildMemberPrayerUpdatePatch({ is_answered: true, author: 'ignored' })
    ).toEqual({ is_answered: true });
  });

  it('builds planning center list cache key', () => {
    expect(planningCenterListDataCacheKey('list-42')).toBe(
      'planningCenterListData_list-42'
    );
  });

  it('builds member prayer update insert row', () => {
    expect(buildMemberPrayerUpdateInsertRow('p1', 'Pray', true)).toEqual({
      person_id: 'p1',
      content: 'Pray',
      is_answered: true,
    });
  });

  it('trimMemberPersonId rejects blank ids', () => {
    expect(trimMemberPersonId('  abc  ')).toBe('abc');
    expect(trimMemberPersonId('   ')).toBeNull();
  });

  it('reads and writes single-person cache slices', () => {
    const existing = { p1: [{ id: 'u1', content: 'a', created_at: '', updated_at: '', is_answered: false }] };
    expect(memberUpdatesCacheForPerson(existing, 'p1')).toHaveLength(1);
    expect(memberUpdatesCacheForPerson(existing, 'p2')).toBeUndefined();
    const merged = writeMemberUpdatesCacheForPerson(existing, 'p2', [
      { id: 'u2', content: 'b', created_at: '', updated_at: '', is_answered: true },
    ]);
    expect(merged.p2[0].content).toBe('b');
    expect(merged.p1).toHaveLength(1);
  });
});
