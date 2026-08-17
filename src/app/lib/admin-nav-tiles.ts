import type { AdminData } from '../services/admin-data.service';
import type { AdminTab } from './admin-pending-queues';

export interface AdminNavTileDef {
  tab: AdminTab;
  label: string;
  /** Prefix shown only on large screens (e.g. "Pending "). */
  labelPrefixLg?: string;
  countColorClass: string;
  kind: 'count' | 'settings';
}

export const ADMIN_NAV_TILES: readonly AdminNavTileDef[] = [
  {
    tab: 'prayers',
    label: 'Approvals',
    labelPrefixLg: 'Pending ',
    countColorClass: 'text-green-600 dark:text-green-400',
    kind: 'count',
  },
  {
    tab: 'deletions',
    label: 'Deletions',
    labelPrefixLg: 'Pending ',
    countColorClass: 'text-red-600 dark:text-red-400',
    kind: 'count',
  },
  {
    tab: 'accounts',
    label: 'Accounts',
    labelPrefixLg: 'Pending ',
    countColorClass: 'text-amber-600 dark:text-amber-400',
    kind: 'count',
  },
  {
    tab: 'settings',
    label: 'Settings',
    countColorClass: 'text-gray-600 dark:text-gray-400',
    kind: 'settings',
  },
];

export function adminNavTileCount(
  tab: AdminTab,
  data: AdminData | null | undefined,
  consolidatedApprovalsCount: number,
): number {
  switch (tab) {
    case 'prayers':
      return consolidatedApprovalsCount;
    case 'deletions':
      return (
        (data?.pendingDeletionRequests?.length ?? 0) +
        (data?.pendingUpdateDeletionRequests?.length ?? 0)
      );
    case 'accounts':
      return data?.pendingAccountRequests?.length ?? 0;
    case 'settings':
      return 0;
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}
