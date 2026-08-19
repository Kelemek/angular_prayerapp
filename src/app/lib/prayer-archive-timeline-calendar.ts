/**
 * Convert UTC Date to local date string in the user's timezone (YYYY-MM-DD).
 */
export function prayerArchiveTimelineLocalDateString(
  date: Date,
  userTimezone: string
): string {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: userTimezone });
}

/**
 * Anchor a calendar day from the user's local YYYY-MM-DD so grouping and labels stay stable.
 * Uses noon UTC (not midnight UTC): midnight UTC is often the *previous* local calendar day in
 * Americas, which made "reminder sent" jump to yesterday after send while "reminder upcoming"
 * still used the real job run time (~10:00 UTC).
 */
export function prayerArchiveTimelineLocalDateAtMidnight(
  utcDate: Date,
  userTimezone: string
): Date {
  const localDateStr = prayerArchiveTimelineLocalDateString(utcDate, userTimezone);
  const [year, month, day] = localDateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function prayerArchiveTimelineNextDailyRunAfterUtc(
  base: Date,
  runHourUtc: number,
  runMinuteUtc: number
): Date {
  const candidate = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      runHourUtc,
      runMinuteUtc,
      0,
      0
    )
  );

  if (base.getTime() < candidate.getTime()) {
    return candidate;
  }

  const next = new Date(candidate);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function formatPrayerArchiveTimelineDayLabel(
  date: Date,
  userTimezone: string
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateFormatted = new Date(date);
  dateFormatted.setHours(0, 0, 0, 0);

  const dateLocalStr = prayerArchiveTimelineLocalDateString(dateFormatted, userTimezone);
  const todayLocalStr = prayerArchiveTimelineLocalDateString(today, userTimezone);

  if (dateLocalStr === todayLocalStr) {
    return 'Today';
  }

  return dateFormatted.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: userTimezone,
  });
}

export function prayerArchiveTimelineMonthKey(month: Date): string {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
}

export function prayerArchiveTimelineMonthDisplay(month: Date): string {
  return month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function canGoPreviousPrayerArchiveTimelineMonth(
  currentMonth: Date,
  minMonth: Date | null
): boolean {
  if (!minMonth) return false;
  const currentYear = currentMonth.getFullYear();
  const currentMonthValue = currentMonth.getMonth();
  const minYear = minMonth.getFullYear();
  const minMonthValue = minMonth.getMonth();

  return (
    currentYear > minYear ||
    (currentYear === minYear && currentMonthValue > minMonthValue)
  );
}

export function canGoNextPrayerArchiveTimelineMonth(
  currentMonth: Date,
  maxMonth: Date | null
): boolean {
  if (!maxMonth) return false;
  const currentYear = currentMonth.getFullYear();
  const currentMonthValue = currentMonth.getMonth();
  const maxYear = maxMonth.getFullYear();
  const maxMonthValue = maxMonth.getMonth();

  return (
    currentYear < maxYear ||
    (currentYear === maxYear && currentMonthValue < maxMonthValue)
  );
}
