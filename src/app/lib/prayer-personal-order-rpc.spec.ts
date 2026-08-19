import { describe, expect, it, vi } from 'vitest';
import { runPersonalPrayerOrderRpcPerCategory } from './prayer-personal-order-rpc';
import type { PrayerRequest } from './prayer-types';

function prayer(id: string, category: string): PrayerRequest {
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

describe('prayer-personal-order-rpc', () => {
  it('returns ok when rpc succeeds for each category', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const result = await runPersonalPrayerOrderRpcPerCategory(
      [prayer('p1', 'A'), prayer('p2', 'B')],
      'user@example.com',
      rpc
    );
    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('requests fallback when rpc errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('rpc fail') });
    const result = await runPersonalPrayerOrderRpcPerCategory(
      [prayer('p1', 'A')],
      'user@example.com',
      rpc
    );
    expect(result).toEqual({ ok: false, shouldFallback: true });
  });

  it('returns message when rpc reports failure row', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ success: false, message: 'bad order' }],
      error: null,
    });
    const result = await runPersonalPrayerOrderRpcPerCategory(
      [prayer('p1', 'A')],
      'user@example.com',
      rpc
    );
    expect(result).toEqual({
      ok: false,
      shouldFallback: false,
      message: 'bad order',
    });
  });
});
