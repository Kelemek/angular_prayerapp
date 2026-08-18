import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EmailSubscriberRow } from './admin-email-subscribers';
import { runEmailSubscriberSearch } from './admin-email-subscribers-search-run';

vi.mock('./admin-email-subscribers-fetch', () => ({
  fetchEmailSubscriberList: vi.fn(),
}));

vi.mock('./admin-email-subscribers-sort', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./admin-email-subscribers-sort')>();
  return {
    ...actual,
    sortEmailSubscriberRows: vi.fn((rows) => rows),
    countActiveEmailSubscribers: vi.fn(() => 1),
  };
});

import { fetchEmailSubscriberList } from './admin-email-subscribers-fetch';

const baseRow: EmailSubscriberRow = {
  id: '1',
  name: 'Test',
  email: 'test@example.com',
  is_active: true,
  is_blocked: false,
  is_admin: false,
  receive_push: true,
  created_at: '2024-01-01',
};

describe('runEmailSubscriberSearch', () => {
  const client = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns sorted list and counts on success', async () => {
    vi.mocked(fetchEmailSubscriberList).mockResolvedValue({
      rows: [baseRow],
      count: 1,
    });

    const result = await runEmailSubscriberSearch(client, {
      searchQuery: 'test',
      sortBy: 'last_activity_date',
      sortDirection: 'desc',
      previousCsvSuccess: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.allSubscribers).toEqual([baseRow]);
      expect(result.totalItems).toBe(1);
      expect(result.totalActiveCount).toBe(1);
      expect(result.currentPage).toBe(1);
      expect(result.csvSuccess).toBeNull();
    }
  });

  it('preserves csv success when requested', async () => {
    vi.mocked(fetchEmailSubscriberList).mockResolvedValue({
      rows: [],
      count: 0,
    });

    const result = await runEmailSubscriberSearch(client, {
      searchQuery: '',
      sortBy: 'email',
      sortDirection: 'asc',
      preserveCsvSuccess: true,
      previousCsvSuccess: 'Import ok',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.csvSuccess).toBe('Import ok');
    }
  });

  it('returns failure message when fetch throws', async () => {
    vi.mocked(fetchEmailSubscriberList).mockRejectedValue(new Error('network'));

    const result = await runEmailSubscriberSearch(client, {
      searchQuery: '',
      sortBy: 'email',
      sortDirection: 'asc',
      previousCsvSuccess: null,
    });

    expect(result).toEqual({ ok: false, error: 'network' });
  });
});
