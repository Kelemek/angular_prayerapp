import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildPrayerItemReminderDateOptions,
  formatPrayerItemReminderLine,
  isPrayerItemReminderOnceInPast,
  validatePrayerItemReminderAddInput,
  prayerItemReminderAddErrorMessage,
} from './prayer-item-reminder-modal-ui';
import type { PrayerItemReminder } from '../types/prayer-item-reminder';

describe('buildPrayerItemReminderDateOptions', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('labels first two options Today and Tomorrow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T12:00:00'));

    const options = buildPrayerItemReminderDateOptions(3);
    expect(options[0].label).toMatch(/^Today ·/);
    expect(options[1].label).toMatch(/^Tomorrow ·/);
    expect(options[0].value).toBe('2026-08-18');
  });
});

describe('formatPrayerItemReminderLine', () => {
  it('formats daily reminders', () => {
    const line = formatPrayerItemReminderLine(
      {
        id: '1',
        mode: 'daily',
        local_hour: 9,
        local_minute: 0,
      } as PrayerItemReminder,
      []
    );
    expect(line).toMatch(/^Daily ·/);
  });
});

describe('validatePrayerItemReminderAddInput', () => {
  it('rejects past once reminders', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T15:00:00'));
    const err = validatePrayerItemReminderAddInput('once', '2026-08-18', '9:00');
    expect(err).toBe('That date and time is already in the past.');
    vi.useRealTimers();
  });

  it('accepts future once reminders', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-18T08:00:00'));
    const err = validatePrayerItemReminderAddInput('once', '2026-08-18', '9:00');
    expect(err).toBeNull();
    vi.useRealTimers();
  });
});

describe('isPrayerItemReminderOnceInPast', () => {
  it('returns true for invalid date parts', () => {
    expect(isPrayerItemReminderOnceInPast('bad-date', 9, 0)).toBe(true);
  });
});

describe('prayerItemReminderAddErrorMessage', () => {
  it('maps duplicate schedule errors', () => {
    expect(prayerItemReminderAddErrorMessage({ code: '23505' })).toBe(
      'You already have a reminder for that schedule.'
    );
  });
});
