import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';
import {
  applyPrayerEditorBulkDeleteConfirmation,
  applyPrayerEditorBulkStatusConfirmation,
  prayerEditorConfirmationListState,
} from './admin-prayer-editor-confirmation-apply';

vi.mock('./admin-prayer-editor-mutations', () => ({
  mutatePrayerEditorBulkStatus: vi.fn().mockResolvedValue({
    searchResults: [],
    allPrayers: [],
    selectedPrayers: new Set<string>(),
    bulkStatus: '',
    statusLabel: 'Current',
    prayerCount: 2,
  }),
  mutatePrayerEditorBulkDelete: vi.fn().mockResolvedValue({
    searchResults: [],
    allPrayers: [],
    totalItems: 0,
    currentPage: 1,
    selectedPrayers: new Set<string>(),
    prayerCount: 3,
  }),
  mutatePrayerEditorSingleDelete: vi.fn(),
}));

const prayer: PrayerEditorPrayer = {
  id: '1',
  title: 'Test',
  requester: 'A',
  email: 'a@b.com',
  status: 'current',
  created_at: '2024-01-01',
  denial_reason: null,
  description: 'd',
  approval_status: 'approved',
  prayer_for: 'B',
  prayer_updates: [],
};

describe('admin-prayer-editor-confirmation-apply', () => {
  const client = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applyPrayerEditorBulkStatusConfirmation returns toast and refresh flags', async () => {
    const state = prayerEditorConfirmationListState({
      searchResults: [prayer],
      allPrayers: [prayer],
      selectedPrayers: new Set(['1', '2']),
      bulkStatus: 'current',
      totalItems: 1,
      currentPage: 1,
    });

    const result = await applyPrayerEditorBulkStatusConfirmation(client, state);

    expect(result.toastSuccess).toBe('2 prayers updated to Current');
    expect(result.needsLoadPageData).toBe(true);
    expect(result.refreshMainSite).toBe(true);
  });

  it('applyPrayerEditorBulkDeleteConfirmation updates totals', async () => {
    const state = prayerEditorConfirmationListState({
      searchResults: [prayer],
      allPrayers: [prayer],
      selectedPrayers: new Set(['1']),
      bulkStatus: '',
      totalItems: 1,
      currentPage: 1,
    });

    const result = await applyPrayerEditorBulkDeleteConfirmation(client, state);

    expect(result.totalItems).toBe(0);
    expect(result.toastSuccess).toBe('3 prayers deleted successfully');
  });
});
