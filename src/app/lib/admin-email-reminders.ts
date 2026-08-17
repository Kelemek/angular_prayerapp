export interface EmailPrayerReminderSettings {
  enableReminders: boolean;
  reminderIntervalDays: number;
  enableAutoArchive: boolean;
  daysBeforeArchive: number;
}

export const EMAIL_REMINDER_DAYS_MIN = 1;
export const EMAIL_REMINDER_DAYS_MAX = 90;

export const DEFAULT_EMAIL_PRAYER_REMINDER_SETTINGS: EmailPrayerReminderSettings = {
  enableReminders: false,
  reminderIntervalDays: 7,
  enableAutoArchive: false,
  daysBeforeArchive: 7,
};

export function emailSettingsErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Unknown error';
}

export function clampReminderDays(value: number): number {
  if (value < EMAIL_REMINDER_DAYS_MIN) return EMAIL_REMINDER_DAYS_MIN;
  if (value > EMAIL_REMINDER_DAYS_MAX) return EMAIL_REMINDER_DAYS_MAX;
  return value;
}

export function applyEmailPrayerReminderRow(
  current: EmailPrayerReminderSettings,
  row: {
    enable_reminders?: boolean | null;
    reminder_interval_days?: number | null;
    enable_auto_archive?: boolean | null;
    days_before_archive?: number | null;
  } | null,
): EmailPrayerReminderSettings {
  if (!row) return current;

  const next = { ...current };
  if (row.enable_reminders !== null && row.enable_reminders !== undefined) {
    next.enableReminders = row.enable_reminders;
  }
  if (
    row.reminder_interval_days !== null &&
    row.reminder_interval_days !== undefined
  ) {
    next.reminderIntervalDays = row.reminder_interval_days;
  }
  if (row.enable_auto_archive !== null && row.enable_auto_archive !== undefined) {
    next.enableAutoArchive = row.enable_auto_archive;
  }
  if (
    row.days_before_archive !== null &&
    row.days_before_archive !== undefined
  ) {
    next.daysBeforeArchive = row.days_before_archive;
  }
  return next;
}
