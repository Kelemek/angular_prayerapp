import { describe, expect, it } from 'vitest';
import {
  readMemberPrayedForCountsCache,
  writeMemberPrayedForCountToCache,
} from './prayer-member-pray-for';

describe('prayer-member-pray-for cache helpers', () => {
  it('readMemberPrayedForCountsCache defaults empty map', () => {
    expect(readMemberPrayedForCountsCache(undefined)).toEqual({});
    expect(readMemberPrayedForCountsCache({ p1: 2 })).toEqual({ p1: 2 });
  });

  it('writeMemberPrayedForCountToCache merges count for person', () => {
    const merged = writeMemberPrayedForCountToCache({ p1: 1 }, 'p2', 3);
    expect(merged).toEqual({ p1: 1, p2: 3 });
  });
});
