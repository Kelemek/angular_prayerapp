export interface BadgeCachedItem {
  id: string;
  status?: 'current' | 'answered' | 'archived';
  type?: string;
  updated_at: string;
  updates?: Array<{ id: string; created_at: string; updated_at?: string }>;
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
