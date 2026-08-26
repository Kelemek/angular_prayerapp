import { describe, it, expect, vi } from 'vitest';
import { remindersForPrayerCard } from './prayer-card-reminders';
import type { PrayerItemReminderService } from '../services/prayer-item-reminder.service';
import type { UserSessionService } from '../services/user-session.service';
import type { PrayerItemReminder } from '../types/prayer-item-reminder';

function makeReminder(
  overrides: Partial<PrayerItemReminder> = {}
): PrayerItemReminder {
  return {
    id: 'rem-1',
    user_email: 'user@example.com',
    prayer_kind: 'prompt',
    prayer_id: 'prompt-abc',
    title_snapshot: 'Title',
    prayer_for_snapshot: 'Family',
    mode: 'daily',
    iana_timezone: 'America/Chicago',
    local_hour: 9,
    local_minute: 0,
    local_date: null,
    local_weekday: null,
    last_sent_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('remindersForPrayerCard', () => {
  const reminderService = {
    remindersForPrayer: vi.fn(
      (
        all: PrayerItemReminder[],
        prayerId: string,
        prayerKind: PrayerItemReminder['prayer_kind']
      ) =>
        all.filter(
          (r) => r.prayer_id === prayerId && r.prayer_kind === prayerKind
        )
    ),
  } as unknown as PrayerItemReminderService;

  const userSessionService = {
    getCurrentSession: vi.fn(() => ({
      email: 'user@example.com',
      prayerItemReminders: [makeReminder()],
    })),
  } as unknown as UserSessionService;

  it('uses prayer_kind prompt for prompt cards', () => {
    const rows = remindersForPrayerCard(
      reminderService,
      userSessionService,
      [],
      'prompt-abc',
      false,
      true
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.prayer_kind).toBe('prompt');
  });

  it('does not show prompt reminders when isPrompt is false', () => {
    const rows = remindersForPrayerCard(
      reminderService,
      userSessionService,
      [],
      'prompt-abc',
      false,
      false
    );

    expect(rows).toHaveLength(0);
  });
});
