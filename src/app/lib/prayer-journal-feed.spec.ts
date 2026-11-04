import { afterEach, describe, expect, it } from 'vitest';
import {
  bindPrayerJournalFeedLoader,
  resetPrayerJournalFeedForTests,
  syncPrayerJournalFeed,
} from './prayer-journal-feed';

describe('syncPrayerJournalFeed', () => {
  afterEach(() => {
    resetPrayerJournalFeedForTests();
  });

  it('coalesces two syncs in the same turn into one loader call', async () => {
    const batches: string[][] = [];
    bindPrayerJournalFeedLoader((entries) => {
      batches.push(entries.map((entry) => `${entry.kind}:${entry.prayerId}`));
    });
    syncPrayerJournalFeed(
      [{ kind: 'community', prayerId: 'c1' }],
      ['community']
    );
    syncPrayerJournalFeed([{ kind: 'personal', prayerId: 'p1' }], ['personal']);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(batches).toHaveLength(1);
    expect(batches[0]?.sort()).toEqual(['community:c1', 'personal:p1']);
  });
});
