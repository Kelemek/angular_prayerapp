import { describe, it, expect } from 'vitest';
import type { AdminData } from '../services/admin-data.service';
import type { PrayerRequest, PrayerUpdate } from '../types/prayer';
import {
  buildConsolidatedApprovals,
  firstPendingTab,
  nextPendingTab,
  pendingQueues,
} from './admin-pending-queues';

function stubAdminData(overrides: Partial<AdminData> = {}): AdminData {
  return {
    pendingPrayers: [],
    pendingUpdates: [],
    pendingDeletionRequests: [],
    pendingUpdateDeletionRequests: [],
    pendingAccountRequests: [],
    approvedPrayers: [],
    approvedUpdates: [],
    deniedPrayers: [],
    deniedUpdates: [],
    deniedDeletionRequests: [],
    deniedUpdateDeletionRequests: [],
    approvedPrayersCount: 0,
    approvedUpdatesCount: 0,
    deniedPrayersCount: 0,
    deniedUpdatesCount: 0,
    loading: false,
    error: null,
    ...overrides,
  };
}

function stubPrayer(id: string): PrayerRequest {
  return {
    id,
    title: id,
    description: '',
    status: 'current',
    requester: 'A',
    prayer_for: 'B',
    email: 'a@example.com',
    date_requested: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

function stubUpdate(id: string, prayerId: string, extra: Partial<PrayerUpdate> = {}): PrayerUpdate {
  return {
    id,
    prayer_id: prayerId,
    content: 'u',
    author: 'A',
    author_email: 'a@example.com',
    created_at: '2026-01-01',
    ...extra,
  };
}

describe('pendingQueues', () => {
  it('returns all false when data is missing', () => {
    expect(pendingQueues(null)).toEqual({ approvals: false, deletions: false, accounts: false });
  });

  it('treats pending updates as approvals', () => {
    expect(pendingQueues(stubAdminData({ pendingUpdates: [stubUpdate('u1', 'p1')] })).approvals).toBe(true);
  });
});

describe('firstPendingTab', () => {
  it('prefers approvals, then deletions, then accounts, else settings', () => {
    expect(firstPendingTab(stubAdminData({ pendingPrayers: [stubPrayer('p1')] }))).toBe('prayers');
    expect(
      firstPendingTab(stubAdminData({ pendingDeletionRequests: [{ id: 'd1' } as AdminData['pendingDeletionRequests'][number]] })),
    ).toBe('deletions');
    expect(
      firstPendingTab(stubAdminData({ pendingAccountRequests: [{ id: 'a1', email: '', first_name: '', last_name: '', approval_status: 'pending', created_at: '' }] })),
    ).toBe('accounts');
    expect(firstPendingTab(stubAdminData())).toBe('settings');
  });
});

describe('nextPendingTab', () => {
  it('stays on the current queue while it still has work', () => {
    expect(
      nextPendingTab('prayers', stubAdminData({ pendingPrayers: [stubPrayer('p1')] })),
    ).toBe('prayers');
  });

  it('moves to the next non-empty queue and wraps', () => {
    expect(
      nextPendingTab(
        'prayers',
        stubAdminData({ pendingDeletionRequests: [{ id: 'd1' } as AdminData['pendingDeletionRequests'][number]] }),
      ),
    ).toBe('deletions');
    expect(
      nextPendingTab(
        'deletions',
        stubAdminData({ pendingPrayers: [stubPrayer('p1')] }),
      ),
    ).toBe('prayers');
    expect(
      nextPendingTab(
        'accounts',
        stubAdminData({ pendingDeletionRequests: [{ id: 'd1' } as AdminData['pendingDeletionRequests'][number]] }),
      ),
    ).toBe('deletions');
  });

  it('never auto-leaves settings', () => {
    expect(
      nextPendingTab('settings', stubAdminData({ pendingPrayers: [stubPrayer('p1')] })),
    ).toBe('settings');
  });

  it('goes to settings when nothing is pending', () => {
    expect(nextPendingTab('prayers', stubAdminData())).toBe('settings');
  });
});

describe('buildConsolidatedApprovals', () => {
  it('returns empty when data is missing', () => {
    expect(buildConsolidatedApprovals(null)).toEqual([]);
  });

  it('groups pending updates under their parent prayer', () => {
    const prayer = stubPrayer('p1');
    const update = stubUpdate('u1', 'p1');
    const result = buildConsolidatedApprovals(
      stubAdminData({ pendingPrayers: [prayer], pendingUpdates: [update] }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].prayer.id).toBe('p1');
    expect(result[0].pendingUpdates.map((u) => u.id)).toEqual(['u1']);
  });

  it('includes approved prayers that still have pending updates', () => {
    const update = stubUpdate('u1', 'p2', {
      prayers: { id: 'p2', title: 'From update' },
    });
    const result = buildConsolidatedApprovals(stubAdminData({ pendingUpdates: [update] }));
    expect(result).toHaveLength(1);
    expect(result[0].prayer.id).toBe('p2');
    expect(result[0].pendingUpdates).toHaveLength(1);
  });
});
