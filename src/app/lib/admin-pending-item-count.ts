import type { AdminData } from '../types/admin-data';

/** Head-only pending totals for the five admin approval queues. */
export interface AdminPendingCounts {
  prayers: number;
  updates: number;
  deletionRequests: number;
  updateDeletionRequests: number;
  accountRequests: number;
}

/** Raw item total. Two updates on one prayer count as two. */
export function sumPendingApprovalItems(counts: AdminPendingCounts): number {
  return (
    counts.prayers +
    counts.updates +
    counts.deletionRequests +
    counts.updateDeletionRequests +
    counts.accountRequests
  );
}

/** Same raw total from a loaded admin snapshot, using pending array lengths. */
export function pendingApprovalItemsFromAdminData(data: AdminData): number {
  return (
    data.pendingPrayers.length +
    data.pendingUpdates.length +
    data.pendingDeletionRequests.length +
    data.pendingUpdateDeletionRequests.length +
    data.pendingAccountRequests.length
  );
}
