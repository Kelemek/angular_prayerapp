import type {
  AccountApprovalRequest,
  AdminPendingDeletionRequest,
  AdminPendingUpdate,
  AdminPendingUpdateDeletionRequest,
} from '../types/admin-data';
import type {
  DeletionRequest,
  PrayerRequest,
  PrayerStatus,
  UpdateDeletionRequest,
} from '../types/prayer';

export interface AdminPrayerRow {
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
  approval_status?: 'pending' | 'approved' | 'denied';
  denial_reason?: string | null;
  approved_at?: string | null;
  denied_at?: string | null;
  category?: string | null;
  display_order?: number;
}

export interface AdminUpdatePrayerEmbed {
  id?: string;
  title?: string;
  description?: string;
  requester?: string;
  prayer_for?: string;
  status?: PrayerStatus;
  email?: string;
}

export interface AdminPendingUpdateRow {
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
  prayers?: AdminUpdatePrayerEmbed | AdminUpdatePrayerEmbed[] | null;
}

export type AdminDeletionRequestRow = DeletionRequest & {
  prayers?: { title?: string } | { title?: string }[] | null;
};

export type AdminUpdateDeletionRequestRow = UpdateDeletionRequest & {
  prayer_updates?: AdminPendingUpdateDeletionRequest['prayer_updates'] | null;
};

export interface EmailSubscriberPcRow {
  email: string;
  in_planning_center: boolean | null;
}

function singleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapPrayerRow(row: AdminPrayerRow, inPlanningCenter: boolean | null = null): PrayerRequest {
  return {
    ...row,
    in_planning_center: inPlanningCenter,
  };
}

export function mapPendingUpdateRow(
  row: AdminPendingUpdateRow,
  pcStatusMap: Map<string, boolean>,
): AdminPendingUpdate {
  const prayers = singleRelation(row.prayers);
  const authorEmail = row.author_email?.toLowerCase();
  const prayerEmail = prayers?.email?.toLowerCase();
  return {
    id: row.id,
    prayer_id: row.prayer_id,
    content: row.content,
    author: row.author,
    author_email: row.author_email,
    is_anonymous: row.is_anonymous,
    mark_as_answered: row.mark_as_answered,
    created_at: row.created_at,
    updated_at: row.updated_at,
    approval_status: row.approval_status,
    denial_reason: row.denial_reason,
    approved_at: row.approved_at,
    denied_at: row.denied_at,
    prayer_title: prayers?.title,
    in_planning_center: authorEmail ? (pcStatusMap.get(authorEmail) ?? null) : null,
    prayers: prayers
      ? {
          ...prayers,
          in_planning_center: prayerEmail ? (pcStatusMap.get(prayerEmail) ?? null) : null,
        }
      : undefined,
  };
}

export function mapUpdateWithPrayerTitle(row: AdminPendingUpdateRow): AdminPendingUpdate {
  const prayers = singleRelation(row.prayers);
  return {
    id: row.id,
    prayer_id: row.prayer_id,
    content: row.content,
    author: row.author,
    author_email: row.author_email,
    is_anonymous: row.is_anonymous,
    mark_as_answered: row.mark_as_answered,
    created_at: row.created_at,
    updated_at: row.updated_at,
    approval_status: row.approval_status,
    denial_reason: row.denial_reason,
    approved_at: row.approved_at,
    denied_at: row.denied_at,
    prayer_title: prayers?.title,
    prayers: prayers ?? undefined,
  };
}

export function mapDeletionRequestRow(row: AdminDeletionRequestRow): AdminPendingDeletionRequest {
  const prayers = singleRelation(row.prayers);
  return {
    ...row,
    prayer_title: prayers?.title,
  };
}

export function mapUpdateDeletionRequestRow(
  row: AdminUpdateDeletionRequestRow,
): AdminPendingUpdateDeletionRequest {
  return {
    ...row,
    prayer_updates: row.prayer_updates ?? undefined,
  };
}

export function mapAccountApprovalRequestRow(row: AccountApprovalRequest): AccountApprovalRequest {
  return row;
}

export function collectPendingEmailsForPcLookup(
  prayers: AdminPrayerRow[],
  updates: AdminPendingUpdateRow[],
): string[] {
  const emails = new Set<string>();
  for (const prayer of prayers) {
    if (prayer.email) {
      emails.add(prayer.email.toLowerCase());
    }
  }
  for (const update of updates) {
    if (update.author_email) {
      emails.add(update.author_email.toLowerCase());
    }
  }
  return Array.from(emails);
}

export function buildPlanningCenterStatusMap(rows: EmailSubscriberPcRow[]): Map<string, boolean> {
  const statusMap = new Map<string, boolean>();
  for (const record of rows) {
    statusMap.set(record.email.toLowerCase(), record.in_planning_center === true);
  }
  return statusMap;
}

export function prayerStatusAfterApprovedUpdate(
  markAsAnswered: boolean | undefined,
  currentStatus: string | null,
): string | null {
  if (markAsAnswered) {
    return 'answered';
  }
  if (currentStatus === 'answered' || currentStatus === 'archived') {
    return 'current';
  }
  return null;
}

export function nestedPrayerTitle(
  prayers: AdminUpdatePrayerEmbed | AdminUpdatePrayerEmbed[] | null | undefined,
): string {
  return singleRelation(prayers)?.title ?? 'Prayer';
}

export function nestedPrayerDescription(
  prayers: AdminUpdatePrayerEmbed | AdminUpdatePrayerEmbed[] | null | undefined,
): string {
  return singleRelation(prayers)?.description ?? '';
}

export function nestedPrayerStatus(
  prayers: AdminUpdatePrayerEmbed | AdminUpdatePrayerEmbed[] | null | undefined,
): string {
  return singleRelation(prayers)?.status ?? 'current';
}
