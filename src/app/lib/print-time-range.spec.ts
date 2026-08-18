import { describe, it, expect } from 'vitest';
import {
  getPrintEmptyRangeUserMessage,
  getPrintRangeFileLabel,
  setPrintStartDateForTimeRange,
} from './print-time-range';

describe('print-time-range', () => {
  it('setPrintStartDateForTimeRange moves week back seven days', () => {
    const end = new Date('2026-06-15T12:00:00Z');
    const start = new Date(end);
    setPrintStartDateForTimeRange(start, end, 'week');
    expect(start.getDate()).toBe(end.getDate() - 7);
  });

  it('getPrintRangeFileLabel maps twomonths to 2months', () => {
    expect(getPrintRangeFileLabel('twomonths')).toBe('2months');
  });

  it('getPrintEmptyRangeUserMessage covers month', () => {
    expect(getPrintEmptyRangeUserMessage('month')).toContain('last month');
  });
});
