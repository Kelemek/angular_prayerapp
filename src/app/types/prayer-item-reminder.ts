import type { ReminderQuarterMinute } from './user-hour-reminder';

export type PrayerItemReminderKind =
  | 'community'
  | 'personal'
  | 'pc_member'
  | 'prompt';
export type PrayerItemReminderMode = 'once' | 'daily' | 'weekly';

export interface PrayerItemReminder {
  id: string;
  user_email: string;
  prayer_kind: PrayerItemReminderKind;
  prayer_id: string;
  title_snapshot: string;
  prayer_for_snapshot: string;
  mode: PrayerItemReminderMode;
  iana_timezone: string;
  local_hour: number;
  local_minute: ReminderQuarterMinute | number;
  local_date: string | null;
  local_weekday: number | null;
  last_sent_at: string | null;
  created_at: string;
}

export interface CreatePrayerItemReminderInput {
  prayer_kind: PrayerItemReminderKind;
  prayer_id: string;
  title_snapshot: string;
  prayer_for_snapshot: string;
  mode: PrayerItemReminderMode;
  iana_timezone: string;
  local_hour: number;
  local_minute: number;
  local_date?: string | null;
  local_weekday?: number | null;
}

export function resolvePrayerItemKind(options: {
  prayerId: string;
  isPersonal: boolean;
  isPrompt?: boolean;
}): PrayerItemReminderKind {
  if (options.isPrompt) return 'prompt';
  if (options.prayerId.startsWith('pc-member-')) return 'pc_member';
  if (options.isPersonal) return 'personal';
  return 'community';
}

type ReminderScheduleFields = Pick<
  PrayerItemReminder,
  'prayer_kind' | 'prayer_id' | 'mode' | 'local_hour' | 'local_minute' | 'local_date' | 'local_weekday'
>;

/** True when two rows describe the same prayer + recurrence slot. */
export function prayerItemReminderSchedulesMatch(
  existing: ReminderScheduleFields,
  input: CreatePrayerItemReminderInput
): boolean {
  if (
    existing.prayer_kind !== input.prayer_kind ||
    existing.prayer_id !== input.prayer_id ||
    existing.mode !== input.mode ||
    existing.local_hour !== input.local_hour ||
    (existing.local_minute ?? 0) !== input.local_minute
  ) {
    return false;
  }
  if (input.mode === 'once') {
    return existing.local_date === (input.local_date ?? null);
  }
  if (input.mode === 'weekly') {
    return existing.local_weekday === (input.local_weekday ?? null);
  }
  return true;
}
