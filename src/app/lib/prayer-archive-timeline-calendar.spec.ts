import { describe, it, expect } from 'vitest';
import {
  prayerArchiveTimelineLocalDateAtMidnight,
  prayerArchiveTimelineLocalDateString,
  prayerArchiveTimelineNextDailyRunAfterUtc,
} from './prayer-archive-timeline-calendar';

describe('prayerArchiveTimelineLocalDateAtMidnight', () => {
  it('keeps same YYYY-MM-DD as source instant for America/New_York', () => {
    const sentAt = new Date('2026-03-24T10:00:00.000Z');
    expect(prayerArchiveTimelineLocalDateString(sentAt, 'America/New_York')).toBe(
      '2026-03-24'
    );
    const anchor = prayerArchiveTimelineLocalDateAtMidnight(sentAt, 'America/New_York');
    expect(prayerArchiveTimelineLocalDateString(anchor, 'America/New_York')).toBe(
      '2026-03-24'
    );
  });
});

describe('prayerArchiveTimelineNextDailyRunAfterUtc', () => {
  it('returns same-day run when base is before job time', () => {
    const base = new Date('2026-03-24T08:00:00.000Z');
    const run = prayerArchiveTimelineNextDailyRunAfterUtc(base, 10, 0);
    expect(run.toISOString()).toBe('2026-03-24T10:00:00.000Z');
  });

  it('returns next-day run when base is after job time', () => {
    const base = new Date('2026-03-24T11:00:00.000Z');
    const run = prayerArchiveTimelineNextDailyRunAfterUtc(base, 10, 0);
    expect(run.toISOString()).toBe('2026-03-25T10:00:00.000Z');
  });
});
