import type { AdminData } from '../types/admin-data';
import type { PrayerRequest } from '../types/prayer';

export type AdminTab = 'prayers' | 'deletions' | 'accounts' | 'settings';

export type AdminPendingUpdate = AdminData['pendingUpdates'][number];

export interface ConsolidatedApproval {
  prayer: PrayerRequest;
  pendingUpdates: AdminPendingUpdate[];
}

export interface AdminPendingQueues {
  approvals: boolean;
  deletions: boolean;
  accounts: boolean;
}

const QUEUE_ORDER = ['prayers', 'deletions', 'accounts'] as const;
type AdminWorkTab = (typeof QUEUE_ORDER)[number];

export function pendingQueues(data: AdminData | null | undefined): AdminPendingQueues {
  if (!data) {
    return { approvals: false, deletions: false, accounts: false };
  }
  return {
    approvals: (data.pendingPrayers?.length ?? 0) > 0 || (data.pendingUpdates?.length ?? 0) > 0,
    deletions:
      (data.pendingDeletionRequests?.length ?? 0) > 0 ||
      (data.pendingUpdateDeletionRequests?.length ?? 0) > 0,
    accounts: (data.pendingAccountRequests?.length ?? 0) > 0,
  };
}

function isQueueFilled(queues: AdminPendingQueues, tab: AdminWorkTab): boolean {
  switch (tab) {
    case 'prayers':
      return queues.approvals;
    case 'deletions':
      return queues.deletions;
    case 'accounts':
      return queues.accounts;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

/** First non-empty work queue, otherwise Settings. */
export function firstPendingTab(data: AdminData | null | undefined): AdminTab {
  const queues = pendingQueues(data);
  for (const tab of QUEUE_ORDER) {
    if (isQueueFilled(queues, tab)) {
      return tab;
    }
  }
  return 'settings';
}

/**
 * If the current queue is empty, move to the next non-empty queue (wraps).
 * Settings is a sink: never auto-leave it. Nothing pending → Settings.
 */
export function nextPendingTab(
  current: AdminTab,
  data: AdminData | null | undefined,
): AdminTab {
  const queues = pendingQueues(data);
  if (!queues.approvals && !queues.deletions && !queues.accounts) {
    return 'settings';
  }

  switch (current) {
    case 'settings':
      return 'settings';
    case 'prayers':
    case 'deletions':
    case 'accounts': {
      if (isQueueFilled(queues, current)) {
        return current;
      }
      const startIndex = QUEUE_ORDER.indexOf(current);
      for (let i = 1; i < QUEUE_ORDER.length; i++) {
        const tab = QUEUE_ORDER[(startIndex + i) % QUEUE_ORDER.length];
        if (isQueueFilled(queues, tab)) {
          return tab;
        }
      }
      return 'settings';
    }
    default: {
      const _exhaustive: never = current;
      return _exhaustive;
    }
  }
}

export function buildConsolidatedApprovals(
  data: AdminData | null | undefined,
): ConsolidatedApproval[] {
  if (!data) {
    return [];
  }

  const updatesMap = new Map<string, AdminPendingUpdate[]>();
  const prayersMap = new Map<string, PrayerRequest>();

  for (const prayer of data.pendingPrayers ?? []) {
    prayersMap.set(prayer.id, prayer);
  }

  for (const update of data.pendingUpdates ?? []) {
    const prayerId = update.prayer_id;
    if (update.prayers && !prayersMap.has(prayerId)) {
      prayersMap.set(prayerId, update.prayers as PrayerRequest);
    }
    const list = updatesMap.get(prayerId);
    if (list) {
      list.push(update);
    } else {
      updatesMap.set(prayerId, [update]);
    }
  }

  return Array.from(prayersMap.values()).map((prayer) => ({
    prayer,
    pendingUpdates: updatesMap.get(prayer.id) ?? [],
  }));
}
