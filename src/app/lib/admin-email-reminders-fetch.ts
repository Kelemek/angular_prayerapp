import type { SupabaseClient } from '@supabase/supabase-js';

export type EmailPrayerReminderSettingsRow = {
  enable_reminders?: boolean | null;
  reminder_interval_days?: number | null;
  enable_auto_archive?: boolean | null;
  days_before_archive?: number | null;
};

export async function fetchEmailPrayerReminderSettings(
  client: SupabaseClient,
): Promise<EmailPrayerReminderSettingsRow | null> {
  const { data, error } = await client
    .from('admin_settings')
    .select(
      'enable_reminders, reminder_interval_days, enable_auto_archive, days_before_archive',
    )
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as EmailPrayerReminderSettingsRow | null;
}
