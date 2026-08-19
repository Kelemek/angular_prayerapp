export type PrayerArchiveTimelineEventType =
  | 'reminder-sent'
  | 'reminder-upcoming'
  | 'reminder-missed'
  | 'archive-upcoming'
  | 'archive-missed'
  | 'archived'
  | 'answered';

export interface PrayerArchiveTimelineEvent {
  date: Date;
  prayer: {
    id: string;
    title: string;
  };
  eventType: PrayerArchiveTimelineEventType;
  daysUntil: number;
}

export interface PrayerArchiveTimelineDay {
  date: Date;
  dateStr: string;
  events: PrayerArchiveTimelineEvent[];
}

export interface PrayerArchiveTimelineConfig {
  userTimezone: string;
  reminderIntervalDays: number;
  daysBeforeArchive: number;
  reminderJobHourUtc: number;
  reminderJobMinuteUtc: number;
}

export const PRAYER_ARCHIVE_TIMELINE_DEFAULT_REMINDER_INTERVAL_DAYS = 30;
export const PRAYER_ARCHIVE_TIMELINE_DEFAULT_DAYS_BEFORE_ARCHIVE = 30;
export const PRAYER_ARCHIVE_TIMELINE_REMINDER_JOB_HOUR_UTC = 10;
export const PRAYER_ARCHIVE_TIMELINE_REMINDER_JOB_MINUTE_UTC = 0;
