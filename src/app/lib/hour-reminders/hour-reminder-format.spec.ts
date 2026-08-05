import { describe, it, expect } from 'vitest';
import {
  buildReminderTimeOptions,
  formatTime12,
  nextReminderQuarterSlot,
  parseReminderTimeOptionValue,
  reminderTimeOptionValue,
} from './hour-reminder-format';

describe('hour-reminder-format', () => {
  it('buildReminderTimeOptions returns 96 quarter-hour slots', () => {
    const opts = buildReminderTimeOptions();
    expect(opts).toHaveLength(96);
    expect(opts[0]).toEqual(
      expect.objectContaining({ hour: 0, minute: 0, value: '0:0' })
    );
    expect(opts.some((o) => o.hour === 9 && o.minute === 15)).toBe(true);
  });

  it('parseReminderTimeOptionValue accepts quarters only', () => {
    expect(parseReminderTimeOptionValue('9:15')).toEqual({ hour: 9, minute: 15 });
    expect(parseReminderTimeOptionValue('9:07')).toBeNull();
    expect(parseReminderTimeOptionValue('bad')).toBeNull();
  });

  it('formatTime12 includes minutes', () => {
    expect(formatTime12(9, 15)).toMatch(/9:15/);
    expect(reminderTimeOptionValue(9, 30)).toBe('9:30');
  });

  it('nextReminderQuarterSlot returns the next quarter after now', () => {
    expect(nextReminderQuarterSlot(new Date(2026, 7, 3, 9, 0, 0))).toEqual({
      hour: 9,
      minute: 15,
      value: '9:15',
    });
    expect(nextReminderQuarterSlot(new Date(2026, 7, 3, 9, 7, 0))).toEqual({
      hour: 9,
      minute: 15,
      value: '9:15',
    });
    expect(nextReminderQuarterSlot(new Date(2026, 7, 3, 23, 50, 0))).toEqual({
      hour: 0,
      minute: 0,
      value: '0:0',
    });
  });
});
