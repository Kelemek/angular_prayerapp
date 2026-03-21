import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserPrayerReminderService } from './user-prayer-reminder.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

describe('UserPrayerReminderService', () => {
  let service: UserPrayerReminderService;
  let mockSupabase: { client: { from: ReturnType<typeof vi.fn> } };
  let mockUserSession: { getCurrentSession: ReturnType<typeof vi.fn>; updateUserSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const orderMock = vi.fn(() => Promise.resolve({ data: [{ id: '1', iana_timezone: 'UTC', local_hour: 9 }], error: null }));
    mockSupabase = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: orderMock,
            })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      },
    };
    mockUserSession = {
      getCurrentSession: vi.fn(() => ({
        email: 'user@example.com',
      })),
      updateUserSession: vi.fn(() => Promise.resolve()),
    };
    service = new UserPrayerReminderService(
      mockSupabase as unknown as SupabaseService,
      mockUserSession as unknown as UserSessionService
    );
  });

  it('ensureLoaded fetches when cache undefined', async () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerHourReminders: undefined,
    });
    const slots = await service.ensureLoaded(true);
    expect(slots).toHaveLength(1);
    expect(mockUserSession.updateUserSession).toHaveBeenCalled();
  });

  it('ensureLoaded returns cache when fresh', async () => {
    const cached = [{ id: 'x', iana_timezone: 'UTC', local_hour: 8 }];
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerHourReminders: cached,
      prayerHourRemindersFetchedAt: Date.now(),
    });
    const slots = await service.ensureLoaded(false);
    expect(slots).toEqual(cached);
    expect(mockSupabase.client.from).not.toHaveBeenCalled();
  });
});
