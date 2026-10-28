import { describe, expect, it } from 'vitest';
import { EMPTY_ADMIN_DATA, type AdminData } from '../types/admin-data';
import { adminNavTileCount } from './admin-nav-tiles';
import {
  pendingApprovalItemsFromAdminData,
  sumPendingApprovalItems,
} from './admin-pending-item-count';
import { buildConsolidatedApprovals } from './admin-pending-queues';

describe('admin pending item count', () => {
  it('adds every pending queue', () => {
    expect(
      sumPendingApprovalItems({
        prayers: 1,
        updates: 2,
        deletionRequests: 3,
        updateDeletionRequests: 4,
        accountRequests: 5,
      }),
    ).toBe(15);
  });

  it('sums the five pending arrays', () => {
    const data: AdminData = {
      ...EMPTY_ADMIN_DATA,
      pendingPrayers: [{}] as AdminData['pendingPrayers'],
      pendingUpdates: [{}, {}] as AdminData['pendingUpdates'],
      pendingDeletionRequests: [{}] as AdminData['pendingDeletionRequests'],
      pendingUpdateDeletionRequests: [{}] as AdminData['pendingUpdateDeletionRequests'],
      pendingAccountRequests: [{}] as AdminData['pendingAccountRequests'],
    };

    expect(pendingApprovalItemsFromAdminData(data)).toBe(6);
  });

  it('counts two pending updates on one prayer as two items', () => {
    const data: AdminData = {
      ...EMPTY_ADMIN_DATA,
      pendingUpdates: [
        { id: 'u1', prayer_id: 'p1', prayers: { id: 'p1' } },
        { id: 'u2', prayer_id: 'p1', prayers: { id: 'p1' } },
      ] as AdminData['pendingUpdates'],
    };

    const consolidated = buildConsolidatedApprovals(data);

    expect(pendingApprovalItemsFromAdminData(data)).toBe(2);
    expect(consolidated).toHaveLength(1);
    expect(adminNavTileCount('prayers', data, consolidated.length)).toBe(1);
  });
});
