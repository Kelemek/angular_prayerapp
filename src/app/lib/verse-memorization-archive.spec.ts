import { describe, expect, it } from 'vitest';

/** Mirrors send-prayer-reminders cutoff for verse memorization auto-archive. */
function verseMemorizationArchiveCutoffIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('verse memorization auto-archive cutoff', () => {
  const ARCHIVE_DAYS = 30;

  it('treats prayers approved 31 days ago as older than the cutoff', () => {
    const cutoff = verseMemorizationArchiveCutoffIso(ARCHIVE_DAYS);
    const approvedAt = new Date(
      Date.now() - 31 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(approvedAt < cutoff).toBe(true);
  });

  it('treats prayers approved 1 day ago as newer than the cutoff', () => {
    const cutoff = verseMemorizationArchiveCutoffIso(ARCHIVE_DAYS);
    const approvedAt = new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(approvedAt < cutoff).toBe(false);
  });
});
