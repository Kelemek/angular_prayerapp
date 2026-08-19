import { deviceIanaTimezone, parseReminderTimeOptionValue } from './hour-reminders/hour-reminder-format';
import type { PrayerItemReminderService } from '../services/prayer-item-reminder.service';
import type {
  PrayerItemReminder,
  PrayerItemReminderKind,
  PrayerItemReminderMode,
} from '../types/prayer-item-reminder';

export interface PrayerItemReminderAddFormState {
  mode: PrayerItemReminderMode;
  localDate: string;
  localWeekday: number;
  selectedTimeValue: string;
}

export interface PrayerItemReminderAddContext {
  email: string;
  prayerId: string;
  prayerKind: PrayerItemReminderKind;
  prayerFor: string;
  titleSnapshot: string;
}

export async function addPrayerItemReminderFromModal(
  remindersService: PrayerItemReminderService,
  context: PrayerItemReminderAddContext,
  form: PrayerItemReminderAddFormState
): Promise<PrayerItemReminder[]> {
  const parsed = parseReminderTimeOptionValue(form.selectedTimeValue);
  if (!parsed) {
    throw new Error('Choose a valid reminder time.');
  }

  return remindersService.addReminder(context.email.trim(), {
    prayer_kind: context.prayerKind,
    prayer_id: context.prayerId,
    title_snapshot: context.titleSnapshot || `Prayer for ${context.prayerFor}`,
    prayer_for_snapshot: context.prayerFor,
    mode: form.mode,
    iana_timezone: deviceIanaTimezone(),
    local_hour: parsed.hour,
    local_minute: parsed.minute,
    local_date: form.mode === 'once' ? form.localDate : null,
    local_weekday: form.mode === 'weekly' ? form.localWeekday : null,
  });
}

export async function removePrayerItemReminderFromModal(
  remindersService: PrayerItemReminderService,
  email: string,
  reminderId: string
): Promise<PrayerItemReminder[]> {
  return remindersService.removeReminder(email.trim(), reminderId);
}
