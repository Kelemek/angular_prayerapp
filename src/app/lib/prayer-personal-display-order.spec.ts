import { describe, expect, it, vi } from 'vitest';
import {
  buildPersonalPrayerDisplayOrderDbPayload,
  firstSupabaseBatchError,
  runPersonalPrayerDisplayOrderBatchUpdates,
} from './prayer-personal-display-order';

describe('prayer-personal-display-order', () => {
  it('builds display order db payload', () => {
    expect(buildPersonalPrayerDisplayOrderDbPayload(42)).toEqual({
      display_order: 42,
    });
  });

  it('finds first batch error', () => {
    expect(firstSupabaseBatchError([{ error: null }, { error: 'boom' }])).toBe('boom');
    expect(firstSupabaseBatchError([{ error: null }])).toBeNull();
  });

  it('runPersonalPrayerDisplayOrderBatchUpdates throws on first failed update', async () => {
    await expect(
      runPersonalPrayerDisplayOrderBatchUpdates(
        [{ prayerId: 'p1', displayOrder: 1 }],
        async () => ({ error: new Error('fail') })
      )
    ).rejects.toThrow('fail');
  });

  it('runPersonalPrayerDisplayOrderBatchUpdates runs all updates', async () => {
    const run = vi.fn().mockResolvedValue({ error: null });
    await runPersonalPrayerDisplayOrderBatchUpdates(
      [
        { prayerId: 'p1', displayOrder: 1 },
        { prayerId: 'p2', displayOrder: 2 },
      ],
      run
    );
    expect(run).toHaveBeenCalledTimes(2);
  });
});
