/** Shared update row model for home and presentation prayer cards. */
export interface PrayerUpdateRecord {
  id: string;
  content: string;
  author?: string;
  created_at: string;
  updated_at?: string;
  is_answered?: boolean;
  is_anonymous?: boolean;
}

const HEADER_LABEL_BASE =
  'block min-w-0 max-w-full truncate text-[14px] font-medium ';
const ANSWERED_LABEL_CLASSES = 'font-bold text-[#39704D] dark:text-[#5FB876]';
const DEFAULT_LABEL_CLASSES = 'text-gray-600 dark:text-gray-400';

export function getPrayerUpdateHeaderLabel(
  update: Pick<PrayerUpdateRecord, 'is_answered'>
): string {
  return update.is_answered ? 'Answered' : 'Update';
}

export function getPrayerUpdateHeaderLabelClasses(
  update: Pick<PrayerUpdateRecord, 'is_answered'>
): string {
  return update.is_answered
    ? `${HEADER_LABEL_BASE}${ANSWERED_LABEL_CLASSES}`
    : `${HEADER_LABEL_BASE}${DEFAULT_LABEL_CLASSES}`;
}

export function formatPrayerUpdateDisplayDate(
  update: Pick<PrayerUpdateRecord, 'created_at' | 'updated_at'>
): string {
  const dateToShow = update.updated_at || update.created_at;
  return formatPrayerCardShortDate(dateToShow);
}

/** Short date/time for prayer card meta headers (matches update row). */
export function formatPrayerCardShortDateParts(dateString: string): {
  date: string;
  time: string;
} {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

/** Short date/time for prayer card meta headers (matches update row). */
export function formatPrayerCardShortDate(dateString: string): string {
  const { date, time } = formatPrayerCardShortDateParts(dateString);
  return `${date}, ${time}`;
}

export function getPrayerUpdateAuthorDisplay(
  update: Pick<PrayerUpdateRecord, 'author' | 'is_anonymous'>
): string {
  return update.is_anonymous ? 'Anonymous' : (update.author ?? '');
}
