import { describe, expect, it } from 'vitest';
import {
  applyEmailPrayerReminderRow,
  clampReminderDays,
  DEFAULT_EMAIL_PRAYER_REMINDER_SETTINGS,
} from './admin-email-reminders';

describe('admin-email-reminders', () => {
  it('clamps reminder days', () => {
    expect(clampReminderDays(0)).toBe(1);
    expect(clampReminderDays(-5)).toBe(1);
    expect(clampReminderDays(100)).toBe(90);
    expect(clampReminderDays(30)).toBe(30);
  });

  it('applies row fields when present', () => {
    const result = applyEmailPrayerReminderRow(
      DEFAULT_EMAIL_PRAYER_REMINDER_SETTINGS,
      {
        enable_reminders: true,
        reminder_interval_days: 14,
        enable_auto_archive: true,
        days_before_archive: 10,
      },
    );
    expect(result).toEqual({
      enableReminders: true,
      reminderIntervalDays: 14,
      enableAutoArchive: true,
      daysBeforeArchive: 10,
    });
  });

  it('skips null row fields', () => {
    const result = applyEmailPrayerReminderRow(
      DEFAULT_EMAIL_PRAYER_REMINDER_SETTINGS,
      {
        enable_reminders: null,
        reminder_interval_days: null,
        enable_auto_archive: null,
        days_before_archive: null,
      },
    );
    expect(result).toEqual(DEFAULT_EMAIL_PRAYER_REMINDER_SETTINGS);
  });
});
