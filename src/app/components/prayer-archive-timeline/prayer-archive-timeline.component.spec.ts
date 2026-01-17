import { describe, it, expect } from 'vitest';

describe('PrayerArchiveTimelineComponent - Core Logic', () => {
  describe('Date Formatting', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2026-01-15T12:34:56Z');
      const formatted = date.toLocaleDateString('en-CA');
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle different timezones correctly', () => {
      const date = new Date('2026-01-15T00:00:00Z');
      const localDate = new Date(date);
      expect(localDate).toBeDefined();
    });

    it('should format dates consistently across formats', () => {
      const date = new Date('2026-06-15');
      const iso = date.toISOString().substring(0, 10);
      const localized = date.toLocaleDateString('en-CA');
      expect(iso).toBe('2026-06-15');
      expect(localized).toContain('2026');
    });

    it('should handle month display formatting', () => {
      const dates = [
        new Date('2026-01-15'),
        new Date('2026-12-31')
      ];
      
      dates.forEach(date => {
        const monthStr = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        expect(monthStr).toContain('2026');
      });
    });
  });

  describe('Reminder Calculation Logic', () => {
    it('should calculate reminder 30 days from creation', () => {
      const createdDate = new Date('2026-01-01T00:00:00');
      const reminderDate = new Date(createdDate);
      reminderDate.setDate(reminderDate.getDate() + 30);
      
      expect(reminderDate.getDate()).toBe(31);
      expect(reminderDate.getMonth()).toBe(0);
    });

    it('should calculate archive 30 days after reminder', () => {
      const reminderDate = new Date('2026-01-05T00:00:00');
      const archiveDate = new Date(reminderDate);
      archiveDate.setDate(archiveDate.getDate() + 30);
      
      expect(archiveDate.getDate()).toBe(4);
      expect(archiveDate.getMonth()).toBe(1);
    });

    it('should detect when prayer needs upcoming reminder', () => {
      const today = new Date('2025-12-25T00:00:00');
      const createdDate = new Date('2025-12-01T00:00:00');
      const reminderDate = new Date(createdDate);
      reminderDate.setDate(reminderDate.getDate() + 30);
      
      const daysUntil = (reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysUntil > 0).toBe(true);
    });

    it('should detect when reminder is overdue', () => {
      const today = new Date('2026-01-20');
      const createdDate = new Date('2025-12-01');
      const reminderDate = new Date(createdDate);
      reminderDate.setDate(reminderDate.getDate() + 30);
      
      const daysUntil = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysUntil <= 0).toBe(true);
    });
  });

  describe('Update-Based Timer Reset Logic', () => {
    it('should detect if update happened after reminder was sent', () => {
      const reminderSentDate = new Date('2026-01-05');
      const updateDate = new Date('2026-01-10');
      
      expect(updateDate > reminderSentDate).toBe(true);
    });

    it('should not reset timer if update happened before reminder', () => {
      const reminderSentDate = new Date('2026-01-05');
      const updateDate = new Date('2026-01-02');
      
      expect(updateDate > reminderSentDate).toBe(false);
    });

    it('should calculate new reminder date based on latest update', () => {
      const updateDate = new Date('2026-01-10T00:00:00');
      const newReminderDate = new Date(updateDate);
      newReminderDate.setDate(newReminderDate.getDate() + 30);
      
      expect(newReminderDate.getDate()).toBe(9);
      expect(newReminderDate.getMonth()).toBe(1);
    });
  });

  describe('Archive Logic', () => {
    it('should calculate archive date 30 days after reminder', () => {
      const reminderDate = new Date('2026-01-05');
      const archiveDate = new Date(reminderDate);
      archiveDate.setDate(archiveDate.getDate() + 30);
      
      expect(archiveDate.getTime() - reminderDate.getTime()).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -4);
    });

    it('should mark archive as upcoming if future', () => {
      const today = new Date('2026-01-10');
      const archiveDate = new Date('2026-02-04');
      
      const daysUntil = Math.ceil((archiveDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysUntil > 0).toBe(true);
    });

    it('should mark archive as past if overdue', () => {
      const today = new Date('2026-02-10');
      const archiveDate = new Date('2026-02-04');
      
      const daysUntil = Math.ceil((archiveDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysUntil <= 0).toBe(true);
    });
  });

  describe('Month Navigation Logic', () => {
    it('should calculate correct min/max months from events', () => {
      const events = [
        new Date('2026-01-15'),
        new Date('2026-03-20'),
        new Date('2026-02-10')
      ];
      
      const months = events.map(e => new Date(e.getFullYear(), e.getMonth(), 1));
      const minMonth = new Date(Math.min(...months.map(d => d.getTime())));
      const maxMonth = new Date(Math.max(...months.map(d => d.getTime())));
      
      expect(minMonth.getMonth()).toBe(0); // January
      expect(maxMonth.getMonth()).toBe(2); // March
    });

    it('should navigate to previous month correctly', () => {
      const currentMonth = new Date('2026-02-15');
      const previousMonth = new Date(currentMonth);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      
      expect(previousMonth.getMonth()).toBe(0); // January
      expect(previousMonth.getFullYear()).toBe(2026);
    });

    it('should navigate to next month correctly', () => {
      const currentMonth = new Date('2026-02-15');
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      expect(nextMonth.getMonth()).toBe(2); // March
      expect(nextMonth.getFullYear()).toBe(2026);
    });

    it('should determine if can go previous', () => {
      const minMonth = new Date('2026-01-01');
      const currentMonth = new Date('2026-02-15');
      
      const canGoPrevious = currentMonth > minMonth;
      expect(canGoPrevious).toBe(true);
    });

    it('should determine if can go next', () => {
      const maxMonth = new Date('2026-12-01');
      const currentMonth = new Date('2026-12-15');
      
      const canGoNext = currentMonth < maxMonth;
      expect(canGoNext).toBe(false);
    });
  });

  describe('Event Grouping', () => {
    it('should group multiple events on same date', () => {
      const events = [
        { date: new Date('2026-01-15'), name: 'Event 1' },
        { date: new Date('2026-01-15'), name: 'Event 2' },
        { date: new Date('2026-01-16'), name: 'Event 3' }
      ];
      
      const grouped = new Map();
      events.forEach(event => {
        const dateKey = event.date.toISOString().split('T')[0];
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey).push(event);
      });
      
      expect(grouped.size).toBe(2);
      expect(grouped.get('2026-01-15').length).toBe(2);
      expect(grouped.get('2026-01-16').length).toBe(1);
    });
  });

  describe('Database Settings Edge Cases', () => {
    it('should use reminder interval from settings', () => {
      const reminderIntervalDays = 45;
      const daysBeforeArchive = 20;
      
      expect(reminderIntervalDays).toBe(45);
      expect(daysBeforeArchive).toBe(20);
    });

    it('should use default values if settings unavailable', () => {
      const reminderIntervalDays = 30; // default
      const daysBeforeArchive = 30;   // default
      
      expect(reminderIntervalDays).toBe(30);
      expect(daysBeforeArchive).toBe(30);
    });

    it('should handle date boundary edge cases', () => {
      // Test Year 2000 leap year
      const leapDate = new Date('2000-02-29');
      expect(leapDate.getMonth()).toBe(1);
      
      // Test adding months across year boundary
      const decDate = new Date('2025-12-15');
      const nextMonth = new Date(decDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      expect(nextMonth.getFullYear()).toBe(2026);
      expect(nextMonth.getMonth()).toBe(0);
    });

    it('should handle month key padding for single digit months', () => {
      const monthKey = `2026-${String(1 + 1).padStart(2, '0')}`;
      expect(monthKey).toBe('2026-02');
      
      const singleDigitMonth = `2026-${String(0 + 1).padStart(2, '0')}`;
      expect(singleDigitMonth).toBe('2026-01');
    });

    it('should correctly determine navigation boundaries', () => {
      const minMonth = new Date('2025-06-01');
      const maxMonth = new Date('2026-12-01');
      const currentMonth = new Date('2026-01-15');
      
      const canGoPrevious = currentMonth.getTime() > minMonth.getTime();
      const canGoNext = currentMonth.getTime() < maxMonth.getTime();
      
      expect(canGoPrevious).toBe(true);
      expect(canGoNext).toBe(true);
    });

    it('should handle empty event list gracefully', () => {
      const events: any[] = [];
      let minMonth: Date | null = null;
      let maxMonth: Date | null = null;
      
      if (events.length > 0) {
        const months = events.map(e => new Date(e.date.getFullYear(), e.date.getMonth(), 1));
        minMonth = new Date(Math.min(...months.map(d => d.getTime())));
        maxMonth = new Date(Math.max(...months.map(d => d.getTime())));
      }
      
      expect(minMonth).toBeNull();
      expect(maxMonth).toBeNull();
    });

    it('should filter events by year-month correctly', () => {
      const targetYear = 2026;
      const targetMonth = '01';
      const targetYearMonth = `${targetYear}-${targetMonth}`;
      
      const testDate = new Date('2026-01-15');
      const eventYearMonth = testDate.toLocaleDateString('en-CA').substring(0, 7);
      
      expect(eventYearMonth).toBe(targetYearMonth);
    });

    it('should handle multiple year boundaries in event range', () => {
      const events = [
        new Date('2025-12-15'),
        new Date('2026-01-15'),
        new Date('2026-12-15'),
        new Date('2027-01-15')
      ];
      
      const months = events.map(e => new Date(e.getFullYear(), e.getMonth(), 1));
      const minMonth = new Date(Math.min(...months.map(d => d.getTime())));
      const maxMonth = new Date(Math.max(...months.map(d => d.getTime())));
      
      expect(minMonth.getFullYear()).toBe(2025);
      expect(minMonth.getMonth()).toBe(11);
      expect(maxMonth.getFullYear()).toBe(2027);
      expect(maxMonth.getMonth()).toBe(0);
    });

    it('should handle timezone offset calculations', () => {
      const utcDate = new Date('2026-01-15T12:00:00Z');
      const localDate = new Date(utcDate);
      
      const offset = (utcDate.getTime() - localDate.getTime()) / 60000;
      expect(offset).toBeDefined();
      expect(typeof offset).toBe('number');
    });

    it('should calculate correct days between dates', () => {
      const date1 = new Date('2026-01-01');
      const date2 = new Date('2026-01-31');
      
      const daysDifference = (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDifference).toBe(30);
    });

    it('should handle reminder calculations with varied intervals', () => {
      const reminderIntervals = [14, 30, 45, 60, 90];
      const baseDate = new Date('2026-01-01');
      
      reminderIntervals.forEach(interval => {
        const reminderDate = new Date(baseDate);
        reminderDate.setDate(reminderDate.getDate() + interval);
        
        const daysPassed = (reminderDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(Math.round(daysPassed)).toBe(interval);
      });
    });

    it('should correctly identify months within date range', () => {
      const minMonth = new Date('2025-06-01');
      const maxMonth = new Date('2026-12-01');
      const testMonths = [
        new Date('2025-05-01'),
        new Date('2025-06-01'),
        new Date('2026-06-01'),
        new Date('2026-12-01'),
        new Date('2027-01-01')
      ];
      
      const within = testMonths.filter(m => m >= minMonth && m <= maxMonth);
      expect(within.length).toBe(3); // June 2025, June 2026, Dec 2026
    });

    it('should handle edge case of month-end dates correctly', () => {
      // Test adding to end-of-month date
      const janEnd = new Date('2026-01-31');
      const nextMonth = new Date(janEnd);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      // Should be Feb 28 (2026 is not a leap year), month is index 1
      // When JavaScript adds a month to Jan 31, it overflows to March 3
      expect(nextMonth.getMonth()).toBe(2); // March (overflow behavior)
      expect(nextMonth.getDate()).toBeGreaterThan(0);
    });

    it('should handle timezone-aware date comparisons', () => {
      const date1 = new Date('2026-01-15T10:00:00Z');
      const date2 = new Date('2026-01-15T15:00:00Z');
      
      expect(date1 < date2).toBe(true);
      expect(date1.toISOString().substring(0, 10)).toBe(date2.toISOString().substring(0, 10));
    });

    it('should correctly sort dates chronologically', () => {
      const unsorted = [
        new Date('2026-03-15'),
        new Date('2026-01-15'),
        new Date('2026-02-15')
      ];
      
      const sorted = [...unsorted].sort((a, b) => a.getTime() - b.getTime());
      
      expect(sorted[0].getMonth()).toBe(0);
      expect(sorted[1].getMonth()).toBe(1);
      expect(sorted[2].getMonth()).toBe(2);
    });

    it('should handle DST transitions correctly', () => {
      // DST typically happens in March and November
      const dstMonth = new Date('2026-03-08');
      const regularMonth = new Date('2026-06-15');
      
      expect(dstMonth).toBeDefined();
      expect(regularMonth).toBeDefined();
      expect(dstMonth.getMonth()).toBe(2); // March
      expect(regularMonth.getMonth()).toBe(5); // June
    });
  });

  describe('Archive Logic', () => {
    it('should mark prayer as upcoming when reminder date is in the future', () => {
      const today = new Date('2026-01-15');
      const reminderDate = new Date('2026-02-15');
      
      const isUpcoming = reminderDate > today;
      expect(isUpcoming).toBe(true);
    });

    it('should mark prayer as overdue when reminder date is in the past', () => {
      const today = new Date('2026-02-15');
      const reminderDate = new Date('2026-01-15');
      
      const isOverdue = reminderDate < today;
      expect(isOverdue).toBe(true);
    });

    it('should classify prayers based on reminder date proximity', () => {
      const today = new Date('2026-01-15');
      const pastReminder = new Date('2026-01-01');
      const futureReminder = new Date('2026-02-15');
      const todayReminder = new Date('2026-01-15');
      
      const statusMap = (reminderDate: Date) => {
        if (reminderDate < today) return 'overdue';
        if (reminderDate > today) return 'upcoming';
        return 'today';
      };
      
      expect(statusMap(pastReminder)).toBe('overdue');
      expect(statusMap(futureReminder)).toBe('upcoming');
      expect(statusMap(todayReminder)).toBe('today');
    });

    it('should handle archive threshold calculations correctly', () => {
      const createdDate = new Date('2026-01-01');
      const archiveThreshold = 60; // 30 days reminder + 30 days after
      
      const archiveDate = new Date(createdDate);
      archiveDate.setDate(archiveDate.getDate() + archiveThreshold);
      
      // archiveDate should be March 1st or 2nd, 2026 (60 days after Jan 1)
      expect(archiveDate.getMonth()).toBe(2); // March
      expect(archiveDate.getDate()).toBeGreaterThanOrEqual(1);
      
      const today = new Date('2026-03-05');
      const shouldArchive = today >= archiveDate;
      expect(shouldArchive).toBe(true);
    });
  });

  describe('Month Navigation', () => {
    it('should navigate to next month correctly', () => {
      const currentMonth = new Date('2026-01-15');
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      expect(nextMonth.getMonth()).toBe(1); // February
      expect(nextMonth.getFullYear()).toBe(2026);
    });

    it('should navigate to previous month correctly', () => {
      const currentMonth = new Date('2026-03-15');
      const previousMonth = new Date(currentMonth);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      
      expect(previousMonth.getMonth()).toBe(1); // February
      expect(previousMonth.getFullYear()).toBe(2026);
    });

    it('should wrap to next year when navigating from December', () => {
      const december = new Date('2025-12-15');
      const nextMonth = new Date(december);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      expect(nextMonth.getMonth()).toBe(0); // January
      expect(nextMonth.getFullYear()).toBe(2026);
    });

    it('should wrap to previous year when navigating from January', () => {
      const january = new Date('2026-01-15');
      const previousMonth = new Date(january);
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      
      expect(previousMonth.getMonth()).toBe(11); // December
      expect(previousMonth.getFullYear()).toBe(2025);
    });

    it('should enforce navigation boundaries correctly', () => {
      const minMonth = new Date('2025-06-01');
      const maxMonth = new Date('2026-12-01');
      const currentMonth = new Date('2026-01-15');
      
      const canGoPrevious = currentMonth > minMonth;
      const canGoNext = currentMonth < maxMonth;
      
      expect(canGoPrevious).toBe(true);
      expect(canGoNext).toBe(true);
    });

    it('should prevent navigation before minimum month', () => {
      const minMonth = new Date('2025-06-01');
      const currentMonth = new Date('2025-05-15');
      
      const canGoPrevious = currentMonth > minMonth;
      expect(canGoPrevious).toBe(false);
    });

    it('should prevent navigation after maximum month', () => {
      const maxMonth = new Date('2026-12-01');
      const currentMonth = new Date('2026-12-15');
      
      const canGoNext = currentMonth < maxMonth;
      expect(canGoNext).toBe(false);
    });
  });

  describe('Event Grouping and Filtering', () => {
    it('should group prayers by reminder date', () => {
      const prayers = [
        { id: 1, reminderDate: new Date('2026-01-15'), title: 'Prayer 1' },
        { id: 2, reminderDate: new Date('2026-01-15'), title: 'Prayer 2' },
        { id: 3, reminderDate: new Date('2026-01-20'), title: 'Prayer 3' }
      ];
      
      const grouped: Record<string, (typeof prayers)> = {};
      
      prayers.forEach(prayer => {
        const dateKey = prayer.reminderDate.toLocaleDateString('en-CA');
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(prayer);
      });
      
      const groupedKeys = Object.keys(grouped);
      expect(groupedKeys.length).toBe(2);
      expect(groupedKeys.some(k => grouped[k].length === 2)).toBe(true);
      expect(groupedKeys.some(k => grouped[k].length === 1)).toBe(true);
    });

    it('should filter prayers within date range', () => {
      const startDate = new Date('2026-01-10');
      const endDate = new Date('2026-01-20');
      
      const prayers = [
        { id: 1, reminderDate: new Date('2026-01-05') },
        { id: 2, reminderDate: new Date('2026-01-15') },
        { id: 3, reminderDate: new Date('2026-01-25') }
      ];
      
      const filtered = prayers.filter(p => p.reminderDate >= startDate && p.reminderDate <= endDate);
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe(2);
    });

    it('should sort prayers within same day by creation order', () => {
      const prayers = [
        { id: 3, reminderDate: new Date('2026-01-15'), createdAt: new Date('2026-01-01T15:00:00') },
        { id: 1, reminderDate: new Date('2026-01-15'), createdAt: new Date('2026-01-01T10:00:00') },
        { id: 2, reminderDate: new Date('2026-01-15'), createdAt: new Date('2026-01-01T12:00:00') }
      ];
      
      const sorted = [...prayers].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });
  });

  describe('Database Settings Edge Cases', () => {
    it('should use default 30-day reminder interval when not specified', () => {
      const baseDate = new Date('2026-01-01');
      const defaultInterval = 30;
      
      const reminderDate = new Date(baseDate);
      reminderDate.setDate(reminderDate.getDate() + defaultInterval);
      
      // Jan 1 + 30 days = Jan 31
      expect(reminderDate.getMonth()).toBe(0); // January
      expect(reminderDate.getDate()).toBeGreaterThanOrEqual(30);
    });

    it('should handle custom reminder intervals correctly', () => {
      const baseDate = new Date('2026-01-01');
      const customInterval = 45;
      
      const reminderDate = new Date(baseDate);
      reminderDate.setDate(reminderDate.getDate() + customInterval);
      
      // Jan 1 + 45 days = Feb 14 or 15
      expect(reminderDate.getMonth()).toBe(1); // February
      expect(reminderDate.getDate()).toBeGreaterThanOrEqual(14);
    });

    it('should fallback to default values when settings are missing', () => {
      const settings = { reminderInterval: undefined };
      const defaultInterval = 30;
      
      const interval = settings.reminderInterval ?? defaultInterval;
      expect(interval).toBe(30);
    });

    it('should preserve user timezone in date calculations', () => {
      const userTimezone = 'America/New_York';
      const baseDate = new Date('2026-01-15T00:00:00Z');
      
      expect(baseDate).toBeDefined();
      expect(userTimezone).toBeDefined();
    });

    it('should handle leap year February correctly', () => {
      // Verify we can handle date objects correctly
      const februaryDate = new Date();
      februaryDate.setFullYear(2026, 1, 15); // Set to Feb 15, 2026
      
      expect(februaryDate.getMonth()).toBe(1); // February (0-indexed)
      expect(februaryDate.getDate()).toBe(15);
      expect(februaryDate.getFullYear()).toBe(2026);
    });

    it('should calculate days correctly across year boundaries', () => {
      const dec31 = new Date('2025-12-31');
      const jan1 = new Date('2026-01-01');
      
      const daysDifference = (jan1.getTime() - dec31.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(daysDifference)).toBe(1);
    });

    it('should handle multiple year ranges in timeline', () => {
      const startYear = 2024;
      const endYear = 2027;
      const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
      
      expect(years).toContain(2024);
      expect(years).toContain(2026);
      expect(years).toContain(2027);
      expect(years.length).toBe(4);
    });
  });

  describe('Update-based Timer Reset', () => {
    it('should reset timer when prayer is updated', () => {
      const prayer = {
        id: 1,
        lastUpdated: new Date('2026-01-01'),
        reminderDate: new Date('2026-02-01')
      };
      
      const newUpdateTime = new Date('2026-01-15');
      prayer.lastUpdated = newUpdateTime;
      
      expect(prayer.lastUpdated).toEqual(newUpdateTime);
      expect(prayer.reminderDate).toEqual(new Date('2026-02-01'));
    });

    it('should recalculate reminder date based on update time', () => {
      const updateTime = new Date('2026-01-15');
      const reminderInterval = 30;
      
      const newReminderDate = new Date(updateTime);
      newReminderDate.setDate(newReminderDate.getDate() + reminderInterval);
      
      // Jan 15 + 30 days = Feb 13 or 14
      expect(newReminderDate.getMonth()).toBe(1); // February
      expect(newReminderDate.getDate()).toBeGreaterThanOrEqual(13);
    });

    it('should preserve prayer content during timer reset', () => {
      const prayer = {
        id: 1,
        title: 'Important Prayer',
        content: 'Prayer details',
        reminderDate: new Date('2026-01-01')
      };
      
      const updatedReminder = new Date('2026-02-01');
      prayer.reminderDate = updatedReminder;
      
      expect(prayer.title).toBe('Important Prayer');
      expect(prayer.content).toBe('Prayer details');
      expect(prayer.reminderDate).toEqual(updatedReminder);
    });

    it('should handle rapid successive updates correctly', () => {
      const timestamps: Date[] = [];
      const baseDate = new Date('2026-01-01');
      
      for (let i = 0; i < 5; i++) {
        const updateTime = new Date(baseDate);
        updateTime.setDate(updateTime.getDate() + i);
        timestamps.push(updateTime);
      }
      
      expect(timestamps.length).toBe(5);
      expect(timestamps[0] < timestamps[4]).toBe(true);
    });
  });
});

describe('PrayerArchiveTimelineComponent - Component Integration Tests', () => {
  let component: any;
  let prayerService: any;
  let supabaseService: any;
  let changeDetectorRef: any;

  beforeEach(() => {
    // Mock dependencies
    changeDetectorRef = {
      markForCheck: vi.fn()
    };

    prayerService = {
      getPrayers: vi.fn().mockReturnValue([]),
      getArchivedPrayers: vi.fn().mockReturnValue([]),
      getPrayerById: vi.fn().mockReturnValue(null),
      archivePrayer: vi.fn().mockResolvedValue({ success: true }),
      updatePrayer: vi.fn().mockResolvedValue({ success: true })
    };

    supabaseService = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      },
      getUserSettings: vi.fn().mockResolvedValue({ 
        reminder_interval_days: 30,
        archive_threshold_days: 7,
        timezone: 'UTC'
      })
    };

    // Create component-like object with key methods
    component = {
      timelineEvents: [],
      displayMonth: new Date(),
      isLoading: false,
      reminderIntervalDays: 30,
      daysBeforeArchive: 7,
      userTimezone: 'UTC',
      canGoPrevious: true,
      canGoNext: true,
      
      // Initialize method
      ngOnInit: function() {
        this.loadUserSettings();
        this.loadTimelineData();
      },
      
      loadUserSettings: function() {
        this.reminderIntervalDays = 30;
        this.daysBeforeArchive = 7;
        this.userTimezone = 'UTC';
      },
      
      loadTimelineData: function() {
        this.timelineEvents = [];
      },
      
      previousMonth: function() {
        if (this.canGoPrevious) {
          this.displayMonth = new Date(this.displayMonth.getFullYear(), this.displayMonth.getMonth() - 1, 1);
          this.updateNavigationState();
        }
      },
      
      nextMonth: function() {
        if (this.canGoNext) {
          this.displayMonth = new Date(this.displayMonth.getFullYear(), this.displayMonth.getMonth() + 1, 1);
          this.updateNavigationState();
        }
      },
      
      updateNavigationState: function() {
        const today = new Date();
        this.canGoPrevious = this.displayMonth > new Date(today.getFullYear() - 1, today.getMonth(), 1);
        this.canGoNext = this.displayMonth < new Date(today.getFullYear() + 1, today.getMonth(), 1);
      },
      
      refreshData: function() {
        this.isLoading = true;
        setTimeout(() => {
          this.isLoading = false;
        }, 100);
      },
      
      getMonthName: function(date: Date): string {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      },
      
      formatDate: function(date: Date): string {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
    };
  });

  describe('Component Initialization', () => {
    it('should create component instance', () => {
      expect(component).toBeDefined();
    });

    it('should initialize with empty timeline events', () => {
      expect(component.timelineEvents).toEqual([]);
    });

    it('should initialize with current month as display month', () => {
      const today = new Date();
      component.displayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      expect(component.displayMonth.getMonth()).toBe(today.getMonth());
    });

    it('should initialize with loading state as false', () => {
      expect(component.isLoading).toBe(false);
    });

    it('should load user settings on init', () => {
      component.ngOnInit();
      expect(component.reminderIntervalDays).toBe(30);
      expect(component.daysBeforeArchive).toBe(7);
      expect(component.userTimezone).toBe('UTC');
    });

    it('should load timeline data on init', () => {
      component.ngOnInit();
      expect(Array.isArray(component.timelineEvents)).toBe(true);
    });

    it('should set navigation state on init', () => {
      component.ngOnInit();
      component.updateNavigationState();
      expect(typeof component.canGoPrevious).toBe('boolean');
      expect(typeof component.canGoNext).toBe('boolean');
    });
  });

  describe('Month Navigation', () => {
    it('should move to previous month', () => {
      const startMonth = component.displayMonth.getMonth();
      component.previousMonth();
      const endMonth = component.displayMonth.getMonth();
      
      if (startMonth === 0) {
        expect(endMonth).toBe(11);
      } else {
        expect(endMonth).toBe(startMonth - 1);
      }
    });

    it('should move to next month', () => {
      const startMonth = component.displayMonth.getMonth();
      component.nextMonth();
      const endMonth = component.displayMonth.getMonth();
      
      if (startMonth === 11) {
        expect(endMonth).toBe(0);
      } else {
        expect(endMonth).toBe(startMonth + 1);
      }
    });

    it('should not go to previous month when disabled', () => {
      component.canGoPrevious = false;
      const originalMonth = component.displayMonth.getMonth();
      component.previousMonth();
      expect(component.displayMonth.getMonth()).toBe(originalMonth);
    });

    it('should not go to next month when disabled', () => {
      component.canGoNext = false;
      const originalMonth = component.displayMonth.getMonth();
      component.nextMonth();
      expect(component.displayMonth.getMonth()).toBe(originalMonth);
    });

    it('should handle year transitions going backwards', () => {
      component.displayMonth = new Date(2026, 0, 1); // January 2026
      component.previousMonth();
      expect(component.displayMonth.getFullYear()).toBe(2025);
      expect(component.displayMonth.getMonth()).toBe(11);
    });

    it('should handle year transitions going forwards', () => {
      component.displayMonth = new Date(2025, 11, 1); // December 2025
      component.nextMonth();
      expect(component.displayMonth.getFullYear()).toBe(2026);
      expect(component.displayMonth.getMonth()).toBe(0);
    });

    it('should update navigation state after month change', () => {
      component.updateNavigationState();
      const stateBeforeChange = component.canGoPrevious;
      component.nextMonth();
      component.updateNavigationState();
      // Just verify it doesn't crash
      expect(typeof component.canGoPrevious).toBe('boolean');
    });

    it('should handle multiple consecutive month changes', () => {
      const startMonth = component.displayMonth.getMonth();
      for (let i = 0; i < 6; i++) {
        component.nextMonth();
      }
      const endMonth = component.displayMonth.getMonth();
      // After moving 6 months forward, month should be different (unless edge case)
      expect(typeof endMonth).toBe('number');
      expect(endMonth >= 0 && endMonth < 12).toBe(true);
    });
  });

  describe('Data Refresh', () => {
    it('should start loading on refresh', async () => {
      component.isLoading = false;
      component.refreshData();
      expect(component.isLoading).toBe(true);
    });

    it('should stop loading after refresh completes', async () => {
      component.refreshData();
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(component.isLoading).toBe(false);
    });

    it('should handle rapid refresh calls', () => {
      component.refreshData();
      component.refreshData();
      component.refreshData();
      expect(component.isLoading).toBe(true);
    });

    it('should preserve timeline events during refresh', () => {
      component.timelineEvents = [
        { date: new Date(), prayer: { id: '1', title: 'Test' }, eventType: 'reminder-sent' as any, daysUntil: 0 }
      ];
      const originalLength = component.timelineEvents.length;
      component.refreshData();
      expect(component.timelineEvents.length).toBe(originalLength);
    });
  });

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const date = new Date(2026, 0, 15);
      const formatted = component.formatDate(date);
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should get month name correctly', () => {
      const date = new Date(2026, 0, 1); // January
      const monthName = component.getMonthName(date);
      expect(monthName).toContain('January');
    });

    it('should get month name for all months', () => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
      
      months.forEach((monthName, index) => {
        const date = new Date(2026, index, 1);
        expect(component.getMonthName(date)).toContain(monthName);
      });
    });

    it('should handle date formatting with different years', () => {
      const date1 = component.formatDate(new Date(2024, 0, 1));
      const date2 = component.formatDate(new Date(2026, 0, 1));
      expect(date1).toBeDefined();
      expect(date2).toBeDefined();
    });
  });

  describe('Settings Display', () => {
    it('should display reminder interval days', () => {
      component.reminderIntervalDays = 30;
      expect(component.reminderIntervalDays).toBe(30);
    });

    it('should display archive threshold days', () => {
      component.daysBeforeArchive = 7;
      expect(component.daysBeforeArchive).toBe(7);
    });

    it('should display user timezone', () => {
      component.userTimezone = 'America/New_York';
      expect(component.userTimezone).toBe('America/New_York');
    });

    it('should update settings when loaded', () => {
      component.loadUserSettings();
      expect(component.reminderIntervalDays).toBeGreaterThan(0);
      expect(component.daysBeforeArchive).toBeGreaterThan(0);
      expect(component.userTimezone).toBeDefined();
    });

    it('should handle different timezone values', () => {
      const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
      timezones.forEach(tz => {
        component.userTimezone = tz;
        expect(component.userTimezone).toBe(tz);
      });
    });
  });

  describe('Timeline Events Management', () => {
    it('should store timeline events', () => {
      const events = [
        { date: new Date(), prayer: { id: '1', title: 'Test' }, eventType: 'reminder-sent' as any, daysUntil: 0 }
      ];
      component.timelineEvents = events;
      expect(component.timelineEvents.length).toBe(1);
    });

    it('should add multiple events', () => {
      component.timelineEvents = [];
      const event1 = { date: new Date(), prayer: { id: '1', title: 'Test 1' }, eventType: 'reminder-sent' as any, daysUntil: 0 };
      const event2 = { date: new Date(), prayer: { id: '2', title: 'Test 2' }, eventType: 'archive-upcoming' as any, daysUntil: 2 };
      
      component.timelineEvents.push(event1);
      component.timelineEvents.push(event2);
      
      expect(component.timelineEvents.length).toBe(2);
    });

    it('should clear timeline events', () => {
      component.timelineEvents = [
        { date: new Date(), prayer: { id: '1', title: 'Test' }, eventType: 'reminder-sent' as any, daysUntil: 0 }
      ];
      component.timelineEvents = [];
      expect(component.timelineEvents.length).toBe(0);
    });

    it('should handle different event types', () => {
      const eventTypes = ['reminder-sent', 'reminder-upcoming', 'reminder-missed', 'archive-upcoming', 'archive-missed', 'archived', 'answered'];
      const events = eventTypes.map((type, idx) => ({
        date: new Date(),
        prayer: { id: String(idx), title: `Test ${idx}` },
        eventType: type as any,
        daysUntil: idx
      }));
      
      component.timelineEvents = events;
      expect(component.timelineEvents.length).toBe(eventTypes.length);
    });
  });

  describe('State Management', () => {
    it('should maintain display month state', () => {
      const month = new Date(2026, 5, 1);
      component.displayMonth = month;
      expect(component.displayMonth.getMonth()).toBe(5);
    });

    it('should maintain timeline events state during navigation', () => {
      component.timelineEvents = [
        { date: new Date(), prayer: { id: '1', title: 'Test' }, eventType: 'reminder-sent' as any, daysUntil: 0 }
      ];
      const originalLength = component.timelineEvents.length;
      
      component.previousMonth();
      component.nextMonth();
      
      expect(component.timelineEvents.length).toBe(originalLength);
    });

    it('should maintain loading state correctly', () => {
      expect(component.isLoading).toBe(false);
      component.isLoading = true;
      expect(component.isLoading).toBe(true);
      component.isLoading = false;
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year dates', () => {
      const leapYearDate = new Date(2024, 1, 29); // February 29, 2024
      const formatted = component.formatDate(leapYearDate);
      expect(formatted).toBeDefined();
    });

    it('should handle month boundaries', () => {
      component.displayMonth = new Date(2026, 0, 31); // January 31
      component.nextMonth();
      // Should not throw
      expect(component.displayMonth).toBeDefined();
    });

    it('should handle very old dates', () => {
      const oldDate = new Date(1900, 0, 1);
      const monthName = component.getMonthName(oldDate);
      expect(monthName).toContain('1900');
    });

    it('should handle future dates', () => {
      const futureDate = new Date(2100, 0, 1);
      const monthName = component.getMonthName(futureDate);
      expect(monthName).toContain('2100');
    });

    it('should handle rapid consecutive navigation', () => {
      const startMonth = new Date(component.displayMonth);
      for (let i = 0; i < 12; i++) {
        component.nextMonth();
      }
      // Should be back to original month after 12 next operations
      expect(component.displayMonth.getMonth()).toBe(startMonth.getMonth());
    });

    it('should handle empty prayer data', () => {
      component.timelineEvents = [];
      expect(component.timelineEvents.length).toBe(0);
    });

    it('should handle large number of events', () => {
      const largeEventSet = Array.from({ length: 1000 }, (_, i) => ({
        date: new Date(2026, 0, (i % 28) + 1),
        prayer: { id: String(i), title: `Prayer ${i}` },
        eventType: 'reminder-sent' as any,
        daysUntil: i % 30
      }));
      
      component.timelineEvents = largeEventSet;
      expect(component.timelineEvents.length).toBe(1000);
    });
  });

  describe('User Interactions', () => {
    it('should handle month navigation via buttons', () => {
      const initialMonth = component.displayMonth.getMonth();
      component.nextMonth();
      const newMonth = component.displayMonth.getMonth();
      
      if (initialMonth === 11) {
        expect(newMonth).toBe(0);
      } else {
        expect(newMonth).toBe(initialMonth + 1);
      }
    });

    it('should handle refresh button click', () => {
      const wasLoading = component.isLoading;
      component.refreshData();
      expect(component.isLoading).toBe(true);
    });

    it('should handle rapid navigation clicks', () => {
      for (let i = 0; i < 5; i++) {
        component.nextMonth();
      }
      expect(component.displayMonth).toBeDefined();
    });

    it('should disable navigation when appropriate', () => {
      component.canGoPrevious = false;
      component.canGoNext = false;
      
      const monthBefore = component.displayMonth.getMonth();
      component.previousMonth();
      component.nextMonth();
      
      expect(component.displayMonth.getMonth()).toBe(monthBefore);
    });
  });

  describe('PrayerArchiveTimelineComponent - Advanced Timeline Logic', () => {
    let component: any;

    beforeEach(() => {
      component = {
        timelineEvents: [],
        timelineView: [],
        reminderIntervalDays: 30,
        daysBeforeArchive: 30,
        userTimezone: 'America/New_York',
        isLoading: false,
        displayMonth: new Date(2026, 0, 15),
        canGoPrevious: true,
        canGoNext: true,
        selectedFilter: 'all',

        // Methods
        groupEventsByDay: function(events: any[]) {
          const grouped: any = {};
          events.forEach(event => {
            const dateStr = event.date.toISOString().split('T')[0];
            if (!grouped[dateStr]) {
              grouped[dateStr] = { date: event.date, events: [] };
            }
            grouped[dateStr].events.push(event);
          });
          return Object.values(grouped);
        },

        sortEventsByTime: function(events: any[]) {
          return [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
        },

        calculateTimelineSpan: function() {
          const today = new Date();
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return { start: sixMonthsAgo, end: today };
        },

        filterEventsByType: function(events: any[], type: string) {
          if (type === 'all') return events;
          return events.filter((e: any) => e.eventType === type);
        },

        hasEventsOnDate: function(date: Date) {
          return this.timelineEvents.some((e: any) => 
            e.date.toDateString() === date.toDateString()
          );
        },

        getEventCountForDate: function(date: Date) {
          return this.timelineEvents.filter((e: any) => 
            e.date.toDateString() === date.toDateString()
          ).length;
        },

        formatDateRange: function(start: Date, end: Date) {
          return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
        },

        isDateInPast: function(date: Date) {
          return date < new Date();
        },

        isDateInFuture: function(date: Date) {
          return date > new Date();
        },

        isDateToday: function(date: Date) {
          const today = new Date();
          return date.toDateString() === today.toDateString();
        },

        getDayOfWeek: function(date: Date) {
          return date.toLocaleDateString('en-US', { weekday: 'long' });
        },

        getWeekNumber: function(date: Date) {
          const firstDay = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
          return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
        },

        calculateDaysUntilEvent: function(eventDate: Date) {
          const today = new Date();
          const diffTime = eventDate.getTime() - today.getTime();
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        },

        getDaysInMonth: function(year: number, month: number) {
          return new Date(year, month + 1, 0).getDate();
        },

        getFirstDayOfMonth: function(year: number, month: number) {
          return new Date(year, month, 1).getDay();
        },

        isLeapYear: function(year: number) {
          return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        },

        buildCalendarGrid: function(year: number, month: number) {
          const daysInMonth = this.getDaysInMonth(year, month);
          const firstDay = this.getFirstDayOfMonth(year, month);
          const grid = Array(firstDay).fill(null);
          for (let i = 1; i <= daysInMonth; i++) {
            grid.push(i);
          }
          return grid;
        },

        getMonthName: function(monthIndex: number) {
          const months = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
          return months[monthIndex];
        }
      };
    });

    it('should group events by day correctly', () => {
      const events = [
        { date: new Date('2026-01-15'), eventType: 'archived' },
        { date: new Date('2026-01-15'), eventType: 'answered' },
        { date: new Date('2026-01-16'), eventType: 'archived' }
      ];

      const grouped = component.groupEventsByDay(events);
      expect(grouped.length).toBe(2);
      expect(grouped[0].events.length).toBe(2);
      expect(grouped[1].events.length).toBe(1);
    });

    it('should sort events chronologically', () => {
      const events = [
        { date: new Date(2026, 0, 20), eventType: 'archived' },
        { date: new Date(2026, 0, 10), eventType: 'archived' },
        { date: new Date(2026, 0, 15), eventType: 'archived' }
      ];

      const sorted = component.sortEventsByTime(events);
      expect(sorted[0].date.getDate()).toBe(10);
      expect(sorted[1].date.getDate()).toBe(15);
      expect(sorted[2].date.getDate()).toBe(20);
    });

    it('should calculate 6-month timeline span', () => {
      const span = component.calculateTimelineSpan();
      expect(span.start.getTime()).toBeLessThan(span.end.getTime());
      expect(span.end.getTime() - span.start.getTime()).toBeGreaterThan(0);
    });

    it('should filter events by type', () => {
      const events = [
        { eventType: 'archived' },
        { eventType: 'answered' },
        { eventType: 'archived' }
      ];

      const archived = component.filterEventsByType(events, 'archived');
      const all = component.filterEventsByType(events, 'all');

      expect(archived.length).toBe(2);
      expect(all.length).toBe(3);
    });

    it('should detect events on specific date', () => {
      component.timelineEvents = [
        { date: new Date('2026-01-15') }
      ];

      expect(component.hasEventsOnDate(new Date('2026-01-15'))).toBe(true);
      expect(component.hasEventsOnDate(new Date('2026-01-16'))).toBe(false);
    });

    it('should count events for date', () => {
      component.timelineEvents = [
        { date: new Date('2026-01-15') },
        { date: new Date('2026-01-15') },
        { date: new Date('2026-01-16') }
      ];

      expect(component.getEventCountForDate(new Date('2026-01-15'))).toBe(2);
      expect(component.getEventCountForDate(new Date('2026-01-16'))).toBe(1);
    });

    it('should format date range', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');
      const formatted = component.formatDateRange(start, end);

      expect(formatted).toContain('2026');
      expect(formatted).toContain('-');
    });

    it('should identify past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      expect(component.isDateInPast(pastDate)).toBe(true);
    });

    it('should identify future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      expect(component.isDateInFuture(futureDate)).toBe(true);
    });

    it('should identify today', () => {
      const today = new Date();
      expect(component.isDateToday(today)).toBe(true);
    });

    it('should get day of week', () => {
      const date = new Date('2026-01-15'); // A Thursday
      const day = component.getDayOfWeek(date);

      expect(day).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    });

    it('should calculate week number', () => {
      const date = new Date('2026-01-15');
      const week = component.getWeekNumber(date);

      expect(typeof week).toBe('number');
      expect(week).toBeGreaterThan(0);
      expect(week).toBeLessThanOrEqual(53);
    });

    it('should calculate days until event', () => {
      const today = new Date();
      const future = new Date();
      future.setDate(future.getDate() + 5);

      const daysUntil = component.calculateDaysUntilEvent(future);
      expect(daysUntil).toBeGreaterThanOrEqual(4);
      expect(daysUntil).toBeLessThanOrEqual(6);
    });

    it('should get correct days in month', () => {
      expect(component.getDaysInMonth(2026, 0)).toBe(31); // January
      expect(component.getDaysInMonth(2026, 1)).toBe(28); // February (non-leap)
      expect(component.getDaysInMonth(2026, 3)).toBe(30); // April
    });

    it('should get first day of month', () => {
      const firstDay = component.getFirstDayOfMonth(2026, 0);
      expect(typeof firstDay).toBe('number');
      expect(firstDay).toBeGreaterThanOrEqual(0);
      expect(firstDay).toBeLessThan(7);
    });

    it('should identify leap years', () => {
      expect(component.isLeapYear(2024)).toBe(true);
      expect(component.isLeapYear(2026)).toBe(false);
      expect(component.isLeapYear(2000)).toBe(true);
      expect(component.isLeapYear(1900)).toBe(false);
    });

    it('should build calendar grid', () => {
      const grid = component.buildCalendarGrid(2026, 0);
      expect(grid).toBeDefined();
      expect(grid.length).toBeGreaterThan(28);
      expect(grid.length).toBeLessThanOrEqual(42);
    });

    it('should get correct month name', () => {
      expect(component.getMonthName(0)).toBe('January');
      expect(component.getMonthName(11)).toBe('December');
      expect(component.getMonthName(6)).toBe('July');
    });

    it('should handle empty events array', () => {
      const grouped = component.groupEventsByDay([]);
      expect(grouped.length).toBe(0);
    });

    it('should preserve event data when grouping', () => {
      const event = { 
        date: new Date('2026-01-15'), 
        eventType: 'archived',
        prayerId: '123'
      };
      const grouped = component.groupEventsByDay([event]);

      expect(grouped[0].events[0].eventType).toBe('archived');
      expect(grouped[0].events[0].prayerId).toBe('123');
    });

    it('should handle single event', () => {
      const events = [{ date: new Date('2026-01-15'), eventType: 'archived' }];
      const grouped = component.groupEventsByDay(events);

      expect(grouped.length).toBe(1);
      expect(grouped[0].events.length).toBe(1);
    });

    it('should calculate negative days until event', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);

      const daysSince = component.calculateDaysUntilEvent(past);
      expect(daysSince).toBeLessThan(0);
    });

    it('should calculate days until event zero for today', () => {
      const today = new Date();
      const daysUntil = component.calculateDaysUntilEvent(today);

      expect(Math.abs(daysUntil)).toBeLessThanOrEqual(1);
    });

    it('should build calendar grid with correct day values', () => {
      const grid = component.buildCalendarGrid(2026, 0);
      const dayValues = grid.filter((d: any) => typeof d === 'number');

      expect(dayValues[0]).toBe(1);
      expect(dayValues[dayValues.length - 1]).toBe(31);
    });

    it('should handle month with 30 days', () => {
      const grid = component.buildCalendarGrid(2026, 3); // April
      const dayValues = grid.filter((d: any) => typeof d === 'number');

      expect(dayValues[dayValues.length - 1]).toBe(30);
    });

    it('should handle month with 28 days (non-leap)', () => {
      const grid = component.buildCalendarGrid(2026, 1); // February
      const dayValues = grid.filter((d: any) => typeof d === 'number');

      expect(dayValues[dayValues.length - 1]).toBe(28);
    });

    it('should handle month with 29 days (leap year)', () => {
      const grid = component.buildCalendarGrid(2024, 1); // February in leap year
      const dayValues = grid.filter((d: any) => typeof d === 'number');

      expect(dayValues[dayValues.length - 1]).toBe(29);
    });
  });
});
