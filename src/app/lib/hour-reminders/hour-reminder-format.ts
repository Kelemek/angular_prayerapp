import type { UserHourReminderSlot } from '../../types/user-hour-reminder';
import { REMINDER_QUARTER_MINUTES } from '../../types/user-hour-reminder';

export function formatTime12(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** @deprecated Prefer formatTime12(hour, 0) — kept for callers that only have an hour. */
export function formatHour12(h: number): string {
  return formatTime12(h, 0);
}

export interface ReminderTimeOption {
  hour: number;
  minute: number;
  value: string;
  label: string;
}

export function reminderTimeOptionValue(hour: number, minute: number): string {
  return `${hour}:${minute}`;
}

export function parseReminderTimeOptionValue(
  value: string
): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    !(REMINDER_QUARTER_MINUTES as readonly number[]).includes(minute)
  ) {
    return null;
  }
  return { hour, minute };
}

/** All local quarter-hour slots (96 options). */
export function buildReminderTimeOptions(): ReminderTimeOption[] {
  const options: ReminderTimeOption[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of REMINDER_QUARTER_MINUTES) {
      options.push({
        hour,
        minute,
        value: reminderTimeOptionValue(hour, minute),
        label: formatTime12(hour, minute),
      });
    }
  }
  return options;
}

/** Next quarter-hour slot strictly after `from` (wraps to 0:00 after 23:45). */
export function nextReminderQuarterSlot(
  from: Date = new Date()
): { hour: number; minute: number; value: string } {
  const totalMinutes = from.getHours() * 60 + from.getMinutes();
  const currentQuarterStart = Math.floor(totalMinutes / 15) * 15;
  const nextTotal = (currentQuarterStart + 15) % (24 * 60);
  const hour = Math.floor(nextTotal / 60);
  const minute = nextTotal % 60;
  return {
    hour,
    minute,
    value: reminderTimeOptionValue(hour, minute),
  };
}

/** @deprecated Prefer buildReminderTimeOptions for 15-minute slots. */
export function buildReminderHourOptions(): { value: number; label: string }[] {
  return Array.from({ length: 24 }, (_, h) => ({
    value: h,
    label: formatTime12(h, 0),
  }));
}

/** IANA zone from the device (used when saving new reminder hours). */
export function deviceIanaTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

export function formatHourReminderSlotLabel(slot: UserHourReminderSlot): string {
  const time = formatTime12(slot.local_hour, slot.local_minute ?? 0);
  if (slot.iana_timezone === deviceIanaTimezone()) {
    return time;
  }
  return `${time} · ${slot.iana_timezone}`;
}
