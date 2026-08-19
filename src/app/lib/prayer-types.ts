export type PrayerStatus = 'current' | 'answered' | 'archived';

export interface PrayerUpdate {
  id: string;
  prayer_id: string;
  content: string;
  author: string;
  author_email?: string;
  created_at: string;
  updated_at?: string;
  is_anonymous?: boolean;
  is_answered?: boolean;
  /** Personal prayer updates use this flag (member updates use is_answered). */
  mark_as_answered?: boolean;
  approval_status?: string;
  in_planning_center?: boolean | null;
}

export interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  status: PrayerStatus;
  approval_status?: 'pending' | 'approved' | 'rejected';
  requester: string;
  prayer_for: string;
  email?: string | null;
  is_anonymous?: boolean;
  type?: 'prayer' | 'prompt';
  date_requested: string;
  date_answered?: string | null;
  created_at: string;
  updated_at: string;
  last_reminder_sent?: string | null;
  category?: string | null;
  display_order?: number;
  prayer_image?: string | null;
  updates: PrayerUpdate[];
  in_planning_center?: boolean | null;
  prayed_for_count?: number;
  /** Set on personal-prayer rows (legacy cache entries may only have email). */
  user_email?: string;
}

export interface PrayerFilters {
  status?: PrayerStatus;
  search?: string;
  type?: string;
  category?: string;
}
