import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPrayerTypesListFetch } from './admin-prayer-types-fetch-run';

vi.mock('./admin-prayer-types-fetch', () => ({
  fetchPrayerTypesList: vi.fn(),
}));

import { fetchPrayerTypesList } from './admin-prayer-types-fetch';

describe('runPrayerTypesListFetch', () => {
  const supabase = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns types on success', async () => {
    const types = [{ id: '1', name: 'General' }] as never;
    vi.mocked(fetchPrayerTypesList).mockResolvedValue(types);

    const outcome = await runPrayerTypesListFetch(supabase);

    expect(outcome).toEqual({ ok: true, types });
  });

  it('returns error message on failure', async () => {
    vi.mocked(fetchPrayerTypesList).mockRejectedValue(new Error('fetch failed'));

    const outcome = await runPrayerTypesListFetch(supabase);

    expect(outcome).toEqual({ ok: false, error: 'fetch failed' });
  });

  it('uses fallback when rejection has no message', async () => {
    vi.mocked(fetchPrayerTypesList).mockRejectedValue({});

    const outcome = await runPrayerTypesListFetch(supabase);

    expect(outcome).toEqual({ ok: false, error: 'Unknown error' });
  });
});
