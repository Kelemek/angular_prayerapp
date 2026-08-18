import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPrayerEditorSearchWithOutcome } from './admin-prayer-editor-search-orchestration';

describe('runPrayerEditorSearchWithOutcome', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns prayers and pagination state on success', async () => {
    const mockPrayer = { id: '1', title: 'Test', prayer_updates: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [mockPrayer],
      }),
    );

    const outcome = await runPrayerEditorSearchWithOutcome({
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'key',
      searchTerm: '',
      statusFilter: '',
      approvalFilter: '',
      resultLimit: 50,
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.allPrayers).toEqual([mockPrayer]);
      expect(outcome.totalItems).toBe(1);
      expect(outcome.currentPage).toBe(1);
    }
  });

  it('returns failure outcome when search throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network fail')));

    const outcome = await runPrayerEditorSearchWithOutcome({
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'key',
      searchTerm: 'test',
      statusFilter: 'current',
      approvalFilter: 'approved',
      resultLimit: 50,
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error).toBeInstanceOf(Error);
    }
  });
});
