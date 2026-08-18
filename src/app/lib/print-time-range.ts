import type { TimeRange } from './print-types';

export function setPrintStartDateForTimeRange(
  startDate: Date,
  endDate: Date,
  timeRange: TimeRange,
): void {
  switch (timeRange) {
    case 'week':
      startDate.setTime(endDate.getTime());
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'twoweeks':
      startDate.setTime(endDate.getTime());
      startDate.setDate(endDate.getDate() - 14);
      break;
    case 'month':
      startDate.setTime(endDate.getTime());
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'twomonths':
      startDate.setTime(endDate.getTime());
      startDate.setMonth(endDate.getMonth() - 2);
      break;
    case 'year':
      startDate.setTime(endDate.getTime());
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(2000, 0, 1);
      break;
    default: {
      const neverTimeRange: never = timeRange;
      throw new Error(`Unknown print time range: ${neverTimeRange}`);
    }
  }
}

export function getPrintRangeFileLabel(timeRange: TimeRange): string {
  switch (timeRange) {
    case 'week':
      return 'week';
    case 'twoweeks':
      return '2weeks';
    case 'month':
      return 'month';
    case 'twomonths':
      return '2months';
    case 'year':
      return 'year';
    case 'all':
      return 'all';
    default: {
      const neverTimeRange: never = timeRange;
      throw new Error(`Unknown print time range: ${neverTimeRange}`);
    }
  }
}

export function getPrintEmptyRangeUserMessage(timeRange: TimeRange): string {
  switch (timeRange) {
    case 'week':
      return 'No prayers found in the last week.';
    case 'twoweeks':
      return 'No prayers found in the last 2 weeks.';
    case 'month':
      return 'No prayers found in the last month.';
    case 'twomonths':
      return 'No prayers found in the last 2 months.';
    case 'year':
      return 'No prayers found in the last year.';
    case 'all':
      return 'No prayers found in the database.';
    default: {
      const neverTimeRange: never = timeRange;
      throw new Error(`Unknown print time range: ${neverTimeRange}`);
    }
  }
}
