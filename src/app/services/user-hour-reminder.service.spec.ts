import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserHourReminderService } from './user-hour-reminder.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';
import type { UserHourReminderKind } from '../types/user-hour-reminder';

/** Must match STALE_MS in user-hour-reminder.service.ts */
const STALE_MS = 10 * 60 * 1000;

function flushMicrotasks(): Promise<void> {
  return Promise.resolve().then(() => Promise.resolve());
}

function sessionKeys(kind: UserHourReminderKind) {
  return kind === 'prayer'
    ? {
        slotsKey: 'prayerHourReminders' as const,
        fetchedAtKey: 'prayerHourRemindersFetchedAt' as const,
        table: 'user_prayer_hour_reminders',
      }
    : {
        slotsKey: 'memorizationHourReminders' as const,
        fetchedAtKey: 'memorizationHourRemindersFetchedAt' as const,
        table: 'user_memorization_hour_reminders',
      };
}

describe('UserHourReminderService', () => {
  let service: UserHourReminderService;
  let mockSupabase: { client: { from: ReturnType<typeof vi.fn> } };
  let mockUserSession: {
    getCurrentSession: ReturnType<typeof vi.fn>;
    updateUserSession: ReturnType<typeof vi.fn>;
  };
  let selectOrderMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    selectOrderMock = vi.fn(() =>
      Promise.resolve({
        data: [{ id: '1', iana_timezone: 'UTC', local_hour: 9, local_minute: 0 }],
        error: null,
      })
    );
    mockSupabase = {
      client: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                order: selectOrderMock,
              })),
            })),
          })),
          insert: vi.fn(() => Promise.resolve({ error: null })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
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
    service = new UserHourReminderService(
      mockSupabase as unknown as SupabaseService,
      mockUserSession as unknown as UserSessionService
    );
  });

  for (const kind of ['prayer', 'memorization'] as const) {
    const { slotsKey, fetchedAtKey, table } = sessionKeys(kind);

    it(`${kind}: ensureLoaded returns [] when there is no session`, async () => {
      mockUserSession.getCurrentSession.mockReturnValue(null);
      await expect(service.ensureLoaded(kind)).resolves.toEqual([]);
    });

    it(`${kind}: ensureLoaded fetches when cache undefined`, async () => {
      mockUserSession.getCurrentSession.mockReturnValue({
        email: 'user@example.com',
        [slotsKey]: undefined,
      });
      const slots = await service.ensureLoaded(kind, true);
      expect(slots).toHaveLength(1);
      expect(mockUserSession.updateUserSession).toHaveBeenCalled();
    });

    it(`${kind}: ensureLoaded returns cache when fresh`, async () => {
      const cached = [{ id: 'x', iana_timezone: 'UTC', local_hour: 8 }];
      mockUserSession.getCurrentSession.mockReturnValue({
        email: 'user@example.com',
        [slotsKey]: cached,
        [fetchedAtKey]: Date.now(),
      });
      const slots = await service.ensureLoaded(kind, false);
      expect(slots).toEqual(cached);
      expect(mockSupabase.client.from).not.toHaveBeenCalled();
    });

    it(`${kind}: ensureLoaded returns stale cache and triggers background refresh`, async () => {
      const cached = [{ id: 'x', iana_timezone: 'UTC', local_hour: 8 }];
      mockUserSession.getCurrentSession.mockReturnValue({
        email: 'user@example.com',
        [slotsKey]: cached,
        [fetchedAtKey]: Date.now() - STALE_MS - 1,
      });
      const slots = await service.ensureLoaded(kind, false);
      expect(slots).toEqual(cached);
      expect(mockSupabase.client.from).toHaveBeenCalled();
      await flushMicrotasks();
      expect(mockUserSession.updateUserSession).toHaveBeenCalled();
    });

    it(`${kind}: addSlot inserts and returns updated slots`, async () => {
      const slots = await service.addSlot(kind, ' user@example.com ', 'America/Chicago', 7);
      expect(slots).toHaveLength(1);
      expect(mockSupabase.client.from).toHaveBeenCalledWith(table);
    });

    it(`${kind}: removeSlot deletes and returns updated slots`, async () => {
      const slots = await service.removeSlot(kind, ' user@example.com ', 'slot-id-1');
      expect(slots).toHaveLength(1);
      expect(mockUserSession.updateUserSession).toHaveBeenCalled();
    });
  }

  it('ensureLoaded returns [] when email is missing or blank', async () => {
    mockUserSession.getCurrentSession.mockReturnValue({ email: undefined });
    await expect(service.ensureLoaded('prayer')).resolves.toEqual([]);

    mockUserSession.getCurrentSession.mockReturnValue({ email: '   ' });
    await expect(service.ensureLoaded('prayer')).resolves.toEqual([]);
  });

  it('does not update session when logged-in user changed before fetch completes', async () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerHourReminders: undefined,
    });

    let resolveFetch!: (value: {
      data: { id: string; iana_timezone: string; local_hour: number }[];
      error: null;
    }) => void;
    const fetchPromise = new Promise<{
      data: { id: string; iana_timezone: string; local_hour: number }[];
      error: null;
    }>((resolve) => {
      resolveFetch = resolve;
    });
    selectOrderMock.mockReturnValueOnce(fetchPromise);

    const loadPromise = service.ensureLoaded('prayer', true);
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'other@example.com',
    });
    resolveFetch({
      data: [{ id: '1', iana_timezone: 'UTC', local_hour: 9 }],
      error: null,
    });

    const slots = await loadPromise;
    expect(slots).toHaveLength(1);
    expect(mockUserSession.updateUserSession).not.toHaveBeenCalled();
  });

  it('does not apply stale background fetch after addSlot invalidates generation', async () => {
    const cached = [{ id: 'old', iana_timezone: 'UTC', local_hour: 8 }];
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      memorizationHourReminders: cached,
      memorizationHourRemindersFetchedAt: Date.now() - STALE_MS - 1,
    });

    let resolveBackground!: (value: {
      data: { id: string; iana_timezone: string; local_hour: number }[];
      error: null;
    }) => void;
    const backgroundPromise = new Promise<{
      data: { id: string; iana_timezone: string; local_hour: number }[];
      error: null;
    }>((resolve) => {
      resolveBackground = resolve;
    });
    selectOrderMock.mockReturnValueOnce(backgroundPromise);

    void service.ensureLoaded('memorization', false);

    selectOrderMock.mockResolvedValueOnce({
      data: [{ id: 'new', iana_timezone: 'UTC', local_hour: 9, local_minute: 0 }],
      error: null,
    });
    await service.addSlot('memorization', 'user@example.com', 'UTC', 9);
    expect(mockUserSession.updateUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        memorizationHourReminders: [
          { id: 'new', iana_timezone: 'UTC', local_hour: 9, local_minute: 0 },
        ],
      })
    );
    mockUserSession.updateUserSession.mockClear();

    resolveBackground({
      data: [{ id: 'stale', iana_timezone: 'UTC', local_hour: 1 }],
      error: null,
    });
    await backgroundPromise;
    await flushMicrotasks();

    expect(mockUserSession.updateUserSession).not.toHaveBeenCalled();
  });

  it('ensureLoaded swallows background refresh errors when cache is stale', async () => {
    const cached = [{ id: 'x', iana_timezone: 'UTC', local_hour: 8 }];
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerHourReminders: cached,
      prayerHourRemindersFetchedAt: Date.now() - STALE_MS - 1,
    });
    selectOrderMock.mockResolvedValueOnce({ data: null, error: { message: 'db error' } });

    const slots = await service.ensureLoaded('prayer', false);
    expect(slots).toEqual(cached);
    await flushMicrotasks();
  });

  it('ensureLoaded throws when fetch returns error (initial load)', async () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerHourReminders: undefined,
    });
    selectOrderMock.mockResolvedValueOnce({ data: null, error: { message: 'select failed' } });

    await expect(service.ensureLoaded('prayer', true)).rejects.toEqual({ message: 'select failed' });
  });

  it('addSlot throws when insert fails', async () => {
    mockSupabase.client.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: selectOrderMock,
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: { message: 'dup' } })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    }));

    await expect(service.addSlot('prayer', 'user@example.com', 'UTC', 0)).rejects.toEqual({
      message: 'dup',
    });
  });
});
