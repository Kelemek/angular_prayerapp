import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { BadgeReadStateService } from './badge-read-state.service';
import {
  BADGE_READ_PRAYERS_DATA_KEY,
  BADGE_READ_PROMPTS_DATA_KEY,
} from '../lib/badge-cache';

describe('BadgeReadStateService', () => {
  let service: BadgeReadStateService;
  let rpcMock: ReturnType<typeof vi.fn>;
  let maybeSingleMock: ReturnType<typeof vi.fn>;
  let selectMock: ReturnType<typeof vi.fn>;
  let fromMock: ReturnType<typeof vi.fn>;
  let cache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
  };
  let resolveUserEmail: ReturnType<typeof vi.fn>;
  let userSessionSubject: BehaviorSubject<{ email: string } | null>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    rpcMock = vi.fn().mockResolvedValue({ error: null });
    maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        prayers_data: { prayers: ['db-prayer'], updates: [] },
        prompts_data: { prompts: [], updates: [] },
      },
      error: null,
    });
    selectMock = vi.fn().mockReturnValue({
      ilike: vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock }),
    });
    fromMock = vi.fn().mockReturnValue({ select: selectMock });

    cache = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      invalidate: vi.fn(),
    };

    userSessionSubject = new BehaviorSubject<{ email: string } | null>({
      email: 'user@example.com',
    });
    resolveUserEmail = vi.fn().mockImplementation(async () => {
      return userSessionSubject.value?.email ?? null;
    });

    const supabase = {
      client: {
        from: fromMock,
        rpc: rpcMock,
      },
    };

    const userSessionService = {
      resolveUserEmail,
      getUserEmail: vi.fn(() => userSessionSubject.value?.email ?? null),
      userSession$: userSessionSubject.asObservable(),
    };

    service = new BadgeReadStateService(
      supabase as any,
      cache as any,
      userSessionService as any
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('hydrates local storage from DB when local is empty', async () => {
    await service.syncForCurrentUser();

    expect(fromMock).toHaveBeenCalledWith('user_badge_read_state');
    expect(JSON.parse(localStorage.getItem(BADGE_READ_PRAYERS_DATA_KEY) || '{}')).toEqual({
      prayers: ['db-prayer'],
      updates: [],
    });
    expect(service.isSyncedForEmail('user@example.com')).toBe(true);
  });

  it('upserts when local has IDs not in DB (upgrade migration)', async () => {
    service.invalidate();
    fromMock.mockClear();
    rpcMock.mockClear();
    maybeSingleMock.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    localStorage.setItem(
      BADGE_READ_PRAYERS_DATA_KEY,
      JSON.stringify({ prayers: ['local-prayer'], updates: [] })
    );
    localStorage.setItem(
      BADGE_READ_PROMPTS_DATA_KEY,
      JSON.stringify({ prompts: [], updates: [] })
    );

    await service.syncForCurrentUser();

    expect(rpcMock).toHaveBeenCalledWith('upsert_user_badge_read_state', {
      p_user_email: 'user@example.com',
      p_prayers_data: { prayers: ['local-prayer'], updates: [] },
      p_prompts_data: { prompts: [], updates: [] },
    });
  });

  it('skips DB when cache is warm for the current email', async () => {
    cache.get.mockReturnValue({
      email: 'user@example.com',
      prayersData: { prayers: ['cached'], updates: [] },
      promptsData: { prompts: [], updates: [] },
    });
    service.invalidate();
    localStorage.clear();
    fromMock.mockClear();

    await service.syncForCurrentUser();

    expect(fromMock).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(BADGE_READ_PRAYERS_DATA_KEY) || '{}')).toEqual({
      prayers: ['cached'],
      updates: [],
    });
  });

  it('flushBeforeLogout persists using explicit email when pending was cleared', async () => {
    service.invalidate();
    rpcMock.mockClear();
    localStorage.setItem(
      BADGE_READ_PRAYERS_DATA_KEY,
      JSON.stringify({ prayers: ['p1'], updates: [] })
    );
    localStorage.setItem(
      BADGE_READ_PROMPTS_DATA_KEY,
      JSON.stringify({ prompts: [], updates: [] })
    );

    await service.flushBeforeLogout('user@example.com');

    expect(rpcMock).toHaveBeenCalledWith('upsert_user_badge_read_state', {
      p_user_email: 'user@example.com',
      p_prayers_data: { prayers: ['p1'], updates: [] },
      p_prompts_data: { prompts: [], updates: [] },
    });
  });

  it('flushBeforeLogout drains debounced persist', async () => {
    localStorage.setItem(
      BADGE_READ_PRAYERS_DATA_KEY,
      JSON.stringify({ prayers: ['p1'], updates: [] })
    );
    localStorage.setItem(
      BADGE_READ_PROMPTS_DATA_KEY,
      JSON.stringify({ prompts: [], updates: [] })
    );

    service.schedulePersist();
    const flushPromise = service.flushBeforeLogout();
    await vi.runAllTimersAsync();
    await flushPromise;

    expect(rpcMock).toHaveBeenCalledWith('upsert_user_badge_read_state', {
      p_user_email: 'user@example.com',
      p_prayers_data: { prayers: ['p1'], updates: [] },
      p_prompts_data: { prompts: [], updates: [] },
    });
  });

  it('ignores stale sync result after email changes mid-flight', async () => {
    service.invalidate();
    localStorage.clear();
    fromMock.mockClear();

    maybeSingleMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: {
                prayers_data: { prayers: ['stale'], updates: [] },
                prompts_data: { prompts: [], updates: [] },
              },
              error: null,
            });
          }, 50);
        })
    );

    const syncPromise = service.syncForCurrentUser();
    userSessionSubject.next({ email: 'other@example.com' });
    resolveUserEmail.mockImplementation(async () => 'other@example.com');
    await vi.advanceTimersByTimeAsync(50);
    await syncPromise;

    const readPrayers = JSON.parse(
      localStorage.getItem(BADGE_READ_PRAYERS_DATA_KEY) || '{"prayers":[]}'
    );
    expect(readPrayers.prayers).not.toContain('stale');
  });

  it('isReadyForReads is false while logged in and not yet synced', () => {
    service.invalidate();
    expect(service.isReadyForReads()).toBe(false);
  });

  it('coalesces concurrent syncForCurrentUser calls into one DB fetch', async () => {
    await service.syncForCurrentUser();
    service.invalidate();
    localStorage.clear();
    fromMock.mockClear();

    const syncA = service.syncForCurrentUser();
    const syncB = service.syncForCurrentUser();
    await Promise.all([syncA, syncB]);

    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite local marks made during DB fetch', async () => {
    service.invalidate();
    localStorage.clear();
    fromMock.mockClear();

    maybeSingleMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: {
                prayers_data: { prayers: ['db-prayer'], updates: [] },
                prompts_data: { prompts: [], updates: [] },
              },
              error: null,
            });
          }, 50);
        })
    );

    const syncPromise = service.syncForCurrentUser();
    await vi.advanceTimersByTimeAsync(10);
    localStorage.setItem(
      BADGE_READ_PRAYERS_DATA_KEY,
      JSON.stringify({ prayers: ['local-during-sync'], updates: [] })
    );
    localStorage.setItem(
      BADGE_READ_PROMPTS_DATA_KEY,
      JSON.stringify({ prompts: [], updates: [] })
    );
    await vi.advanceTimersByTimeAsync(50);
    await syncPromise;

    const readPrayers = JSON.parse(
      localStorage.getItem(BADGE_READ_PRAYERS_DATA_KEY) || '{"prayers":[]}'
    );
    expect(readPrayers.prayers).toContain('local-during-sync');
    expect(readPrayers.prayers).toContain('db-prayer');
  });

  it('does not mark synced from persist alone before hydrate', async () => {
    service.invalidate();
    localStorage.setItem(
      BADGE_READ_PRAYERS_DATA_KEY,
      JSON.stringify({ prayers: ['p1'], updates: [] })
    );
    localStorage.setItem(
      BADGE_READ_PROMPTS_DATA_KEY,
      JSON.stringify({ prompts: [], updates: [] })
    );

    await service.flushBeforeLogout();

    expect(service.isReadyForReads()).toBe(false);

    await service.syncForCurrentUser();
    expect(service.isReadyForReads()).toBe(true);
  });

  it('flushBeforeLogout persists latest local snapshot after in-flight persist', async () => {
    let resolveFirstRpc: (() => void) | undefined;
    const firstRpcBlock = new Promise<{ error: null }>((resolve) => {
      resolveFirstRpc = () => resolve({ error: null });
    });
    rpcMock.mockImplementationOnce(() => firstRpcBlock);

    localStorage.setItem(
      BADGE_READ_PRAYERS_DATA_KEY,
      JSON.stringify({ prayers: ['old'], updates: [] })
    );
    localStorage.setItem(
      BADGE_READ_PROMPTS_DATA_KEY,
      JSON.stringify({ prompts: [], updates: [] })
    );

    service.schedulePersist();
    await vi.advanceTimersByTimeAsync(400);

    localStorage.setItem(
      BADGE_READ_PRAYERS_DATA_KEY,
      JSON.stringify({ prayers: ['new'], updates: [] })
    );

    const flushPromise = service.flushBeforeLogout('user@example.com');
    resolveFirstRpc?.();
    await flushPromise;

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenLastCalledWith('upsert_user_badge_read_state', {
      p_user_email: 'user@example.com',
      p_prayers_data: { prayers: ['new'], updates: [] },
      p_prompts_data: { prompts: [], updates: [] },
    });
  });

  it('does not hydrate on failed sync when session email changed', async () => {
    service.invalidate();
    localStorage.clear();
    fromMock.mockClear();

    maybeSingleMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => {
            reject(new Error('network'));
          }, 50);
        })
    );

    const syncPromise = service.syncForCurrentUser();
    await vi.advanceTimersByTimeAsync(10);
    userSessionSubject.next({ email: 'other@example.com' });
    resolveUserEmail.mockImplementation(async () => 'other@example.com');
    await vi.advanceTimersByTimeAsync(50);
    await syncPromise;

    expect(service.isSyncedForEmail('user@example.com')).toBe(false);
  });

  it('setReadPrayersData writes local storage and schedules persist', async () => {
    service.setReadPrayersData({ prayers: ['p1'], updates: [] });
    expect(JSON.parse(localStorage.getItem(BADGE_READ_PRAYERS_DATA_KEY) || '{}').prayers).toContain('p1');

    service.schedulePersist();
    await vi.runAllTimersAsync();

    expect(rpcMock).toHaveBeenCalled();
  });
});
