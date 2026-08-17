import { describe, it, expect, vi } from 'vitest';
import {
  applyPrayerEditorListFilters,
  filterPrayersByApprovalClient,
  fetchPrayerEditorPrayers,
  prayerEditorPaginationRange,
  prayerEditorShowingRange,
  prayerEditorTotalPages,
  slicePrayerEditorPage,
  sortPrayersByLatestActivity,
} from './admin-prayer-editor-search';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

describe('admin-prayer-editor-search', () => {
  const basePrayer = (
    overrides: Partial<PrayerEditorPrayer> = {},
  ): PrayerEditorPrayer => ({
    id: 'p1',
    title: 'Prayer',
    requester: 'John',
    email: 'john@example.com',
    status: 'current',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  describe('applyPrayerEditorListFilters', () => {
    it('sets status and approval_status params when applicable', () => {
      const params = new URLSearchParams();
      applyPrayerEditorListFilters(params, 'current', 'approved');
      expect(params.get('status')).toBe('eq.current');
      expect(params.get('approval_status')).toBe('eq.approved');
    });

    it('skips client-only approval filters', () => {
      const params = new URLSearchParams();
      applyPrayerEditorListFilters(params, 'all', 'pending');
      expect(params.get('approval_status')).toBeNull();
    });
  });

  describe('filterPrayersByApprovalClient', () => {
    it('filters denied prayers and updates', () => {
      const prayers = [
        basePrayer({ id: '1', denial_reason: 'bad' }),
        basePrayer({
          id: '2',
          prayer_updates: [{ id: 'u1', content: 'x', author: 'a', created_at: '2024-01-02' }],
        }),
        basePrayer({ id: '3' }),
      ];
      const denied = filterPrayersByApprovalClient(prayers, 'denied');
      expect(denied.map((p) => p.id)).toEqual(['1']);
    });

    it('filters pending prayers and updates', () => {
      const prayers = [
        basePrayer({ id: '1', approval_status: 'pending' }),
        basePrayer({
          id: '2',
          approval_status: 'approved',
          prayer_updates: [
            {
              id: 'u1',
              content: 'x',
              author: 'a',
              created_at: '2024-01-02',
              approval_status: 'pending',
            },
          ],
        }),
        basePrayer({ id: '3', approval_status: 'approved' }),
      ];
      const pending = filterPrayersByApprovalClient(prayers, 'pending');
      expect(pending.map((p) => p.id)).toEqual(['1', '2']);
    });
  });

  describe('sortPrayersByLatestActivity', () => {
    it('orders by newest update or created_at', () => {
      const prayers = [
        basePrayer({
          id: 'old',
          created_at: '2024-01-01T00:00:00Z',
          prayer_updates: [
            {
              id: 'u1',
              content: 'old update',
              author: 'a',
              created_at: '2024-01-02T00:00:00Z',
            },
          ],
        }),
        basePrayer({
          id: 'new',
          created_at: '2024-01-10T00:00:00Z',
        }),
      ];
      const sorted = sortPrayersByLatestActivity(prayers);
      expect(sorted[0].id).toBe('new');
      expect(sorted[1].id).toBe('old');
    });
  });

  describe('pagination helpers', () => {
    it('slices page data and computes totals', () => {
      const all = Array.from({ length: 25 }, (_, i) => basePrayer({ id: `p${i}` }));
      expect(slicePrayerEditorPage(all, 2, 10).length).toBe(10);
      expect(prayerEditorTotalPages(25, 10)).toBe(3);
      expect(prayerEditorPaginationRange(2, 10, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(prayerEditorShowingRange(2, 10, 25)).toEqual({ start: 11, end: 20 });
    });
  });

  describe('fetchPrayerEditorPrayers', () => {
    it('merges update-content matches from a second query', async () => {
      const mainPrayer = basePrayer({ id: 'main', title: 'Main' });
      const updateMatch = basePrayer({ id: 'from-update', title: 'Update match' });

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('prayer_updates') && url.includes('inner')) {
          return Promise.resolve({
            ok: true,
            json: async () => [{ id: 'from-update' }],
          });
        }
        if (url.includes('id=in.')) {
          return Promise.resolve({
            ok: true,
            json: async () => [updateMatch],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => [mainPrayer],
        });
      });

      vi.stubGlobal('fetch', fetchMock);

      const results = await fetchPrayerEditorPrayers({
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'key',
        searchTerm: 'needle',
        statusFilter: '',
        approvalFilter: '',
      });

      expect(results.map((p) => p.id)).toEqual(['main', 'from-update']);
      vi.unstubAllGlobals();
    });
  });
});
