import type {
  DeletionRequest,
  PrayerRequest,
  PrayerUpdate,
  UpdateDeletionRequest,
} from './prayer';

export interface AccountApprovalRequest {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  affiliation_reason?: string | null;
  approval_status: 'pending' | 'approved' | 'denied';
  created_at: string;
  updated_at: string;
}

export type AdminPendingUpdate = PrayerUpdate & {
  prayer_title?: string;
  in_planning_center?: boolean | null;
};

export type AdminPendingDeletionRequest = DeletionRequest & { prayer_title?: string };

export type AdminPendingUpdateDeletionRequest = UpdateDeletionRequest & {
  prayer_updates?: {
    content?: string;
    author?: string;
    author_email?: string;
    prayers?: { title?: string };
  };
};

export interface AdminData {
  pendingPrayers: PrayerRequest[];
  pendingUpdates: AdminPendingUpdate[];
  pendingDeletionRequests: AdminPendingDeletionRequest[];
  pendingUpdateDeletionRequests: AdminPendingUpdateDeletionRequest[];
  pendingAccountRequests: AccountApprovalRequest[];
  approvedPrayers: PrayerRequest[];
  approvedUpdates: AdminPendingUpdate[];
  deniedPrayers: PrayerRequest[];
  deniedUpdates: AdminPendingUpdate[];
  deniedDeletionRequests: AdminPendingDeletionRequest[];
  deniedUpdateDeletionRequests: AdminPendingUpdateDeletionRequest[];
  approvedPrayersCount: number;
  approvedUpdatesCount: number;
  deniedPrayersCount: number;
  deniedUpdatesCount: number;
  loading: boolean;
  error: string | null;
}

export const EMPTY_ADMIN_DATA: AdminData = {
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
};
