import { describe, expect, it } from 'vitest';
import {
  patchCommunityPrayerListsPrayedForCount,
  patchPersonalPrayersPrayedForCount,
  parsePrayedForRpcCount,
} from './prayer-prayed-for-increment';

describe('prayer-prayed-for-increment list patches', () => {
  it('parsePrayedForRpcCount accepts positive counts', () => {
    expect(parsePrayedForRpcCount(3)).toBe(3);
    expect(parsePrayedForRpcCount(0)).toBeNull();
  });

  it('patchCommunityPrayerListsPrayedForCount updates both lists', () => {
    const all = [{ id: 'p1', prayed_for_count: 1 } as never];
    const filtered = [{ id: 'p1', prayed_for_count: 1 } as never];
    const patched = patchCommunityPrayerListsPrayedForCount(all, filtered, 'p1', 5);
    expect(patched.all[0].prayed_for_count).toBe(5);
    expect(patched.filtered[0].prayed_for_count).toBe(5);
  });

  it('patchPersonalPrayersPrayedForCount updates personal list', () => {
    const prayers = [{ id: 'p1', prayed_for_count: 2 } as never];
    const patched = patchPersonalPrayersPrayedForCount(prayers, 'p1', 4);
    expect(patched[0].prayed_for_count).toBe(4);
  });
});
