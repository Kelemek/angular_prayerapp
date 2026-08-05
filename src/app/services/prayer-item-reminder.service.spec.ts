import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrayerItemReminderService } from './prayer-item-reminder.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

describe('PrayerItemReminderService', () => {
  let service: PrayerItemReminderService;
  let mockSupabase: { client: { from: ReturnType<typeof vi.fn> } };
  let mockUserSession: {
    getCurrentSession: ReturnType<typeof vi.fn>;
    updateUserSession: ReturnType<typeof vi.fn>;
  };
  let orderMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    orderMock = vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: '1',
            user_email: 'user@example.com',
            prayer_kind: 'community',
            prayer_id: 'p1',
            title_snapshot: 'Title',
            prayer_for_snapshot: 'Alice',
            mode: 'daily',
            iana_timezone: 'UTC',
            local_hour: 9,
            local_minute: 15,
            local_date: null,
            local_weekday: null,
            last_sent_at: null,
            created_at: '2026-08-03T00:00:00Z',
          },
        ],
        error: null,
      })
    );
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
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          })),
        })),
      },
    };
    mockUserSession = {
      getCurrentSession: vi.fn(() => ({ email: 'user@example.com' })),
      updateUserSession: vi.fn(() => Promise.resolve()),
    };
    service = new PrayerItemReminderService(
      mockSupabase as unknown as SupabaseService,
      mockUserSession as unknown as UserSessionService
    );
  });

  it('ensureLoaded returns [] without session', async () => {
    mockUserSession.getCurrentSession.mockReturnValue(null);
    await expect(service.ensureLoaded()).resolves.toEqual([]);
  });

  it('ensureLoaded fetches and caches', async () => {
    const rows = await service.ensureLoaded(true);
    expect(rows).toHaveLength(1);
    expect(mockUserSession.updateUserSession).toHaveBeenCalled();
  });

  it('ensureLoaded dedupes parallel cold-cache loads', async () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerItemReminders: undefined,
    });
    let resolveFetch!: (v: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    orderMock.mockReturnValueOnce(fetchPromise);
    const first = service.ensureLoaded(false);
    const second = service.ensureLoaded(false);
    resolveFetch({
      data: [{ id: '1', prayer_id: 'p1', local_minute: 0 }],
      error: null,
    });
    await Promise.all([first, second]);
    expect(mockSupabase.client.from).toHaveBeenCalledTimes(1);
  });

  it('ensureLoaded returns fresh cache without refetch', async () => {
    const cached = [{ id: 'cached', prayer_id: 'p1' }];
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerItemReminders: cached,
      prayerItemRemindersFetchedAt: Date.now(),
    });
    const rows = await service.ensureLoaded(false);
    expect(rows).toEqual(cached);
    expect(mockSupabase.client.from).not.toHaveBeenCalled();
  });

  it('ensureLoaded refetches when cache is stale instead of returning stale rows', async () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerItemReminders: [{ id: 'stale', prayer_id: 'p-old' }],
      prayerItemRemindersFetchedAt: Date.now() - 11 * 60 * 1000,
    });
    const rows = await service.ensureLoaded(false);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('1');
    expect(mockSupabase.client.from).toHaveBeenCalled();
    expect(mockUserSession.updateUserSession).toHaveBeenCalled();
  });

  it('remindersForPrayer filters by id and kind', () => {
    const all = [
      { prayer_id: 'p1', prayer_kind: 'community' },
      { prayer_id: 'p1', prayer_kind: 'personal' },
      { prayer_id: 'p2', prayer_kind: 'community' },
    ] as any;
    expect(service.remindersForPrayer(all, 'p1', 'community')).toHaveLength(1);
  });

  it('dropRemindersForPrayer removes matching rows from session cache', () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerItemReminders: [
        { id: '1', prayer_id: 'p1', prayer_kind: 'community' },
        { id: '2', prayer_id: 'p2', prayer_kind: 'community' },
        { id: '3', prayer_id: 'p1', prayer_kind: 'personal' },
      ],
    });
    service.dropRemindersForPrayer('p1', 'community');
    expect(mockUserSession.updateUserSession).toHaveBeenCalledWith({
      prayerItemReminders: [
        { id: '2', prayer_id: 'p2', prayer_kind: 'community' },
        { id: '3', prayer_id: 'p1', prayer_kind: 'personal' },
      ],
    });
  });

  it('dropRemindersForPrayer no-ops when no matching reminders', () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerItemReminders: [{ id: '1', prayer_id: 'p2', prayer_kind: 'community' }],
    });
    service.dropRemindersForPrayer('p1', 'community');
    expect(mockUserSession.updateUserSession).not.toHaveBeenCalled();
  });

  it('dropRemindersForPrayer no-ops when no matching reminders', () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerItemReminders: [{ id: '1', prayer_id: 'p2', prayer_kind: 'community' }],
    });
    service.dropRemindersForPrayer('p1', 'community');
    expect(mockUserSession.updateUserSession).not.toHaveBeenCalled();
  });

  it('fetchAndUpdateSession returns session cache when generation is stale', async () => {
    let session: {
      email: string;
      prayerItemReminders: Array<{ id: string; prayer_id: string; prayer_kind: string }>;
    } = {
      email: 'user@example.com',
      prayerItemReminders: [
        { id: '1', prayer_id: 'p1', prayer_kind: 'community' },
        { id: '2', prayer_id: 'p2', prayer_kind: 'community' },
      ],
    };
    mockUserSession.getCurrentSession.mockImplementation(() => session);
    mockUserSession.updateUserSession.mockImplementation(async (patch: Partial<typeof session>) => {
      session = { ...session, ...patch };
    });
    let resolveFetch!: (v: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    orderMock.mockReturnValueOnce(fetchPromise);
    const loadPromise = service.ensureLoaded(true);
    service.dropRemindersForPrayer('p1', 'community');
    resolveFetch({
      data: [
        {
          id: '1',
          prayer_id: 'p1',
          prayer_kind: 'community',
          local_minute: 0,
        },
      ],
      error: null,
    });
    await expect(loadPromise).resolves.toEqual([
      { id: '2', prayer_id: 'p2', prayer_kind: 'community' },
    ]);
  });

  it('dropRemindersForPrayer ignores stale fetch that completes after purge', async () => {
    let session: {
      email: string;
      prayerItemReminders?: Array<{ id: string; prayer_id: string; prayer_kind: string }>;
    } = {
      email: 'user@example.com',
      prayerItemReminders: [{ id: '1', prayer_id: 'p1', prayer_kind: 'community' }],
    };
    mockUserSession.getCurrentSession.mockImplementation(() => session);
    mockUserSession.updateUserSession.mockImplementation(async (patch: Partial<typeof session>) => {
      session = { ...session, ...patch };
    });
    let resolveFetch!: (v: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    orderMock.mockReturnValueOnce(fetchPromise);
    const loadPromise = service.ensureLoaded(true);
    service.dropRemindersForPrayer('p1', 'community');
    resolveFetch({
      data: [
        {
          id: '1',
          prayer_id: 'p1',
          prayer_kind: 'community',
          local_minute: 0,
        },
      ],
      error: null,
    });
    await loadPromise;
    const restored = mockUserSession.updateUserSession.mock.calls.some(
      ([arg]) =>
        Array.isArray(arg?.prayerItemReminders) &&
        arg.prayerItemReminders.some(
          (r: { prayer_id?: string }) => r.prayer_id === 'p1'
        )
    );
    expect(restored).toBe(false);
  });

  it('addReminder rejects duplicate schedule in cache', async () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerItemReminders: [
        {
          id: '1',
          prayer_kind: 'community',
          prayer_id: 'p1',
          mode: 'daily',
          local_hour: 9,
          local_minute: 15,
          local_date: null,
          local_weekday: null,
        },
      ],
    });
    await expect(
      service.addReminder('user@example.com', {
        prayer_kind: 'community',
        prayer_id: 'p1',
        title_snapshot: 'T',
        prayer_for_snapshot: 'Alice',
        mode: 'daily',
        iana_timezone: 'UTC',
        local_hour: 9,
        local_minute: 15,
      })
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('addReminder inserts then refreshes', async () => {
    const rows = await service.addReminder('user@example.com', {
      prayer_kind: 'community',
      prayer_id: 'p1',
      title_snapshot: 'T',
      prayer_for_snapshot: 'Alice',
      mode: 'once',
      iana_timezone: 'UTC',
      local_hour: 10,
      local_minute: 0,
      local_date: '2026-08-04',
    });
    expect(rows).toHaveLength(1);
    expect(mockSupabase.client.from).toHaveBeenCalledWith('user_prayer_item_reminders');
  });

  it('ignores stale fetch after account switch', async () => {
    mockUserSession.getCurrentSession.mockReturnValue({
      email: 'user@example.com',
      prayerItemReminders: undefined,
    });
    let resolveFetch!: (v: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    orderMock.mockReturnValueOnce(fetchPromise);
    const loadPromise = service.ensureLoaded(true);
    mockUserSession.getCurrentSession.mockReturnValue({ email: 'other@example.com' });
    resolveFetch({
      data: [{ id: 'stale', prayer_id: 'p1', local_minute: 0 }],
      error: null,
    });
    await loadPromise;
    expect(mockUserSession.updateUserSession).not.toHaveBeenCalled();
  });
});
