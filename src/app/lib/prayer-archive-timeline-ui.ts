import type { PrayerArchiveTimelineEventType } from './prayer-archive-timeline-types';

export function prayerArchiveTimelineEventDotClass(
  eventType: PrayerArchiveTimelineEventType
): string {
  switch (eventType) {
    case 'reminder-upcoming':
      return 'bg-blue-500 border-blue-600 dark:bg-blue-600 dark:border-blue-700';
    case 'reminder-sent':
      return 'bg-purple-500 border-purple-600 dark:bg-purple-600 dark:border-purple-700';
    case 'reminder-missed':
      return 'bg-orange-500 border-orange-600 dark:bg-orange-600 dark:border-orange-700';
    case 'archive-upcoming':
      return 'bg-red-500 border-red-600 dark:bg-red-600 dark:border-red-700';
    case 'archive-missed':
      return 'bg-red-700 border-red-800 dark:bg-red-700 dark:border-red-800';
    case 'answered':
      return 'bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-700';
    case 'archived':
      return 'bg-gray-500 border-gray-600 dark:bg-gray-600 dark:border-gray-700';
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}

export function prayerArchiveTimelineEventBorderClass(
  eventType: PrayerArchiveTimelineEventType
): string {
  switch (eventType) {
    case 'reminder-upcoming':
      return 'border-blue-200 dark:border-blue-600';
    case 'reminder-sent':
      return 'border-purple-200 dark:border-purple-600';
    case 'reminder-missed':
      return 'border-orange-200 dark:border-orange-600';
    case 'archive-upcoming':
      return 'border-red-200 dark:border-red-600';
    case 'archive-missed':
      return 'border-red-400 dark:border-red-800';
    case 'answered':
      return 'border-green-200 dark:border-green-600';
    case 'archived':
      return 'border-gray-300 dark:border-gray-600';
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}

export function prayerArchiveTimelineEventLabelClass(
  eventType: PrayerArchiveTimelineEventType
): string {
  switch (eventType) {
    case 'reminder-upcoming':
      return 'text-blue-700 dark:text-blue-300';
    case 'reminder-sent':
      return 'text-purple-700 dark:text-purple-300';
    case 'reminder-missed':
      return 'text-orange-700 dark:text-orange-300';
    case 'archive-upcoming':
      return 'text-red-800 dark:text-red-200';
    case 'archive-missed':
      return 'text-red-900 dark:text-red-400';
    case 'answered':
      return 'text-green-700 dark:text-green-300';
    case 'archived':
      return 'text-gray-800 dark:text-gray-300';
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}

export function prayerArchiveTimelineMonthNavButtonClass(enabled: boolean): string {
  return enabled
    ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50';
}
