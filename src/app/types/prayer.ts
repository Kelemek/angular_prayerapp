export interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  status: PrayerStatus;
  requester: string;
  prayer_for: string;
  email: string;
  is_anonymous?: boolean;
  date_requested: string;
  date_answered?: string | null;
  created_at: string;
  updated_at: string;
  updates?: PrayerUpdate[];
  approval_status?: 'pending' | 'approved' | 'denied';
  denial_reason?: string | null;
  approved_at?: string | null;
  denied_at?: string | null;
}

export interface PrayerUpdate {
  id: string;
  prayer_id: string;
  content: string;
  author: string;
  author_email: string;
  is_anonymous?: boolean;
  mark_as_answered?: boolean;
  created_at: string;
  updated_at?: string;
  approval_status?: 'pending' | 'approved' | 'denied';
  denial_reason?: string | null;
  approved_at?: string | null;
  denied_at?: string | null;
}

export interface DeletionRequest {
  id: string;
  prayer_id: string;
  reason?: string | null;
  requested_by: string;
  requested_email: string;
  approval_status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  denial_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateDeletionRequest {
  id: string;
  update_id: string;
  reason?: string | null;
  requested_by: string;
  requested_email?: string | null;
  approval_status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  denial_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusChangeRequest {
  id: string;
  prayer_id: string;
  requested_status: PrayerStatus;
  reason?: string | null;
  requested_by: string;
  requested_email?: string | null;
  approval_status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  denial_reason?: string | null;
  created_at: string;
  updated_at: string;
}



export const PrayerStatus = {
  CURRENT: 'current',
  ANSWERED: 'answered',
  ARCHIVED: 'archived'
} as const;

export type PrayerStatus = typeof PrayerStatus[keyof typeof PrayerStatus];

// Permission levels for user actions
export type AllowanceLevel = 'everyone' | 'admin-only' | 'original-requestor';

export const AllowanceLevel = {
  EVERYONE: 'everyone' as const,
  ADMIN_ONLY: 'admin-only' as const,
  ORIGINAL_REQUESTOR: 'original-requestor' as const
} as const;

export const PrayerType = {
  HEALING: 'Healing',
  GUIDANCE: 'Guidance',
  THANKSGIVING: 'Thanksgiving',
  PROTECTION: 'Protection',
  FAMILY: 'Family',
  FINANCES: 'Finances',
  SALVATION: 'Salvation',
  MISSIONS: 'Missions',
  OTHER: 'Other'
} as const;

export type PrayerType = typeof PrayerType[keyof typeof PrayerType];

export interface PrayerTypeRecord {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrayerPrompt {
  id: string;
  title: string;
  type: PrayerType;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface PrayerFilters {
  status?: PrayerStatus;
  searchTerm?: string;
  email?: string;
}