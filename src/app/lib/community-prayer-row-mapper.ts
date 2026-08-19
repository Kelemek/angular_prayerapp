import type { PrayerRequest } from '../lib/prayer-types';

/** Supabase `prayers` row shape when `prayer_updates` are joined. */
export type CommunityPrayerRow = {
  id: string;
  title?: string;
  prayer_for: string;
  description: string;
  requester?: string;
  is_anonymous?: boolean;
  status: PrayerRequest["status"];
  created_at: string;
  date_requested?: string;
  updated_at?: string;
  category?: string | null;
  email?: string | null;
  user_email?: string;
  prayer_image?: string | null;
  prayed_for_count?: number;
  approval_status?: PrayerRequest["approval_status"];
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
    approval_status?: string;
    is_answered?: boolean;
  }>;
};

/** Map a joined community prayer row to the shared `PrayerRequest` card model. */
export function communityPrayerRowToPrayerRequest(
  row: CommunityPrayerRow
): PrayerRequest {
  const updates = (row.prayer_updates || [])
    .filter((update) => update.approval_status === "approved")
    .map((update) => ({
      id: update.id,
      prayer_id: row.id,
      content: update.content,
      author: update.author,
      created_at: update.created_at,
      is_answered: update.is_answered,
      approval_status: update.approval_status,
    }));
  return {
    id: row.id,
    title: row.title ?? `Prayer for ${row.prayer_for}`,
    prayer_for: row.prayer_for,
    description: row.description,
    requester: row.requester ?? "",
    is_anonymous: row.is_anonymous ?? false,
    status: row.status,
    created_at: row.created_at,
    date_requested: row.date_requested ?? row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    category: row.category,
    email: row.email,
    user_email: row.user_email,
    prayer_image: row.prayer_image,
    prayed_for_count: row.prayed_for_count,
    approval_status: row.approval_status,
    updates,
  };
}
