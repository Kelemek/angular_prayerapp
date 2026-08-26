import { formatTime12, parseReminderTimeOptionValue } from './hour-reminders/hour-reminder-format';
import type {
  PrayerItemReminder,
  PrayerItemReminderMode,
} from '../types/prayer-item-reminder';

export const PRAYER_ITEM_REMINDER_WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const PRAYER_ITEM_REMINDER_DATE_OPTIONS_DAYS = 90;

export function formatPrayerItemReminderLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayPrayerItemReminderLocalDateString(): string {
  return formatPrayerItemReminderLocalDate(new Date());
}

export function buildPrayerItemReminderDateOptions(
  days: number
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = formatPrayerItemReminderLocalDate(d);
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
    const monthDay = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const label =
      i === 0
        ? `Today · ${monthDay}`
        : i === 1
          ? `Tomorrow · ${monthDay}`
          : `${weekday}, ${monthDay}`;
    options.push({ value, label });
  }
  return options;
}

export function refreshPrayerItemReminderLocalDate(
  dateOptions: { value: string; label: string }[],
  currentLocalDate: string
): string {
  const today = todayPrayerItemReminderLocalDateString();
  if (!currentLocalDate || !dateOptions.some((o) => o.value === currentLocalDate)) {
    return today;
  }
  return currentLocalDate;
}

export function prayerItemReminderDropdownShellClass(open: boolean): string {
  return open
    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30'
    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20';
}

/** Close dropdowns on outside pointer down without a full-screen layer above the modal (that blocked Add reminder). */
export function shouldClosePrayerItemReminderDropdownOnPointerDown(
  target: Node | null,
  modalHost: HTMLElement
): boolean {
  if (!target) {
    return true;
  }
  if (!modalHost.contains(target)) {
    return true;
  }
  if (target instanceof Element) {
    if (
      target.closest('[role="listbox"]') ||
      target.closest('[aria-haspopup="listbox"]')
    ) {
      return false;
    }
  }
  return true;
}

export function buildPrayerItemReminderDropdownPanelStyle(
  trigger: HTMLElement
): Record<string, string> {
  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const maxHeight = 240;
  const viewportPad = 8;
  const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
  const spaceAbove = rect.top - gap - viewportPad;
  const openUp = spaceBelow < Math.min(maxHeight, 160) && spaceAbove > spaceBelow;
  const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
  const height = Math.min(maxHeight, available);
  const top = openUp
    ? Math.max(viewportPad, rect.top - gap - height)
    : rect.bottom + gap;

  return {
    top: `${top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${height}px`,
  };
}

export function formatPrayerItemReminderLine(
  r: PrayerItemReminder,
  dateOptions: { value: string; label: string }[]
): string {
  const time = formatTime12(r.local_hour, r.local_minute ?? 0);
  if (r.mode === 'once') {
    const dateLabel =
      dateOptions.find((o) => o.value === r.local_date)?.label ??
      r.local_date ??
      '';
    return `Once · ${dateLabel} · ${time}`;
  }
  if (r.mode === 'daily') {
    return `Daily · ${time}`;
  }
  const day =
    PRAYER_ITEM_REMINDER_WEEKDAYS.find((d) => d.value === r.local_weekday)?.label ??
    'Weekly';
  return `Weekly · ${day} · ${time}`;
}

export function isPrayerItemReminderOnceInPast(
  date: string,
  hour: number,
  minute: number
): boolean {
  const [y, mo, d] = date.split('-').map(Number);
  if (!y || !mo || !d) return true;
  const target = new Date(y, mo - 1, d, hour, minute, 0, 0);
  return target.getTime() <= Date.now();
}

export function validatePrayerItemReminderAddInput(
  mode: PrayerItemReminderMode,
  localDate: string,
  selectedTimeValue: string
): string | null {
  const parsed = parseReminderTimeOptionValue(selectedTimeValue);
  if (!parsed) {
    return 'Choose a valid reminder time.';
  }
  if (mode === 'once') {
    if (!localDate) {
      return 'Choose a date for a one-time reminder.';
    }
    if (isPrayerItemReminderOnceInPast(localDate, parsed.hour, parsed.minute)) {
      return 'That date and time is already in the past.';
    }
  }
  return null;
}

export function prayerItemReminderAddErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : '';
  if (code === '23505') {
    return 'You already have a reminder for that schedule.';
  }
  return err && typeof err === 'object' && 'message' in err
    ? String((err as { message: string }).message)
    : 'Could not save reminder.';
}

export function prayerItemReminderRemoveErrorMessage(err: unknown): string {
  return err && typeof err === 'object' && 'message' in err
    ? String((err as { message: string }).message)
    : 'Could not remove reminder.';
}

export function prayerItemReminderDateLabel(
  dateOptions: { value: string; label: string }[],
  localDate: string
): string {
  const found = dateOptions.find((o) => o.value === localDate)?.label;
  return found ?? (localDate || 'Choose a date');
}

export function prayerItemReminderWeekdayLabel(localWeekday: number): string {
  return (
    PRAYER_ITEM_REMINDER_WEEKDAYS.find((d) => d.value === localWeekday)?.label ??
    'Choose a day'
  );
}

export function prayerItemReminderTimeLabel(selectedTimeValue: string): string {
  const parsed = parseReminderTimeOptionValue(selectedTimeValue);
  if (!parsed) return 'Choose a time';
  return formatTime12(parsed.hour, parsed.minute);
}
