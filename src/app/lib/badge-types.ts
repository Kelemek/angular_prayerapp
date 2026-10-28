export interface BadgeCachedItem {
  id: string;
  status?: 'current' | 'answered' | 'archived';
  type?: string;
  updated_at: string;
  /** Prayer requester email; prompts have no author. */
  email?: string | null;
  updates?: Array<{
    id: string;
    created_at: string;
    updated_at?: string;
    author_email?: string | null;
  }>;
}

export interface BadgeReadPrayersData {
  prayers: string[];
  updates: string[];
}

export interface BadgeReadPromptsData {
  prompts: string[];
  updates: string[];
}

export type BadgeItemType = 'prayers' | 'prompts';

export type BadgePrayerStatus = 'current' | 'answered';
