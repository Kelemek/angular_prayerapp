import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailPrayerReminderSettings } from './admin-email-reminders';

export async function saveEmailPrayerReminderSettings(
  client: SupabaseClient,
  settings: EmailPrayerReminderSettings,
): Promise<void> {
  const { error } = await client
    .from('admin_settings')
    .upsert({
      id: 1,
      enable_reminders: settings.enableReminders,
      reminder_interval_days: settings.reminderIntervalDays,
      enable_auto_archive: settings.enableAutoArchive,
      days_before_archive: settings.daysBeforeArchive,
    })
    .select();

  if (error) {
    throw error;
  }
}
