import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';
import { combineLatest, firstValueFrom } from 'rxjs';
import { PlanningCenterListService } from './planning-center-list.service';

vi.mock('../../lib/planning-center', () => ({
  fetchListMembers: vi.fn()
}));

import { fetchListMembers } from '../../lib/planning-center';

const CACHE_KEY = 'prayerapp_planning_center_list_user@example.com';

describe('PlanningCenterListService', () => {
  let service: PlanningCenterListService;
  let mockSupabase: any;
  let mockUserSession: any;
  let mockPlanningCenterRest: { fetchListMembers: ReturnType<typeof vi.fn> };
  let maybeSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    maybeSingle = vi.fn();
    mockSupabase = wireGatedSupabaseMock({
      client: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle
        }))
      }
    });

    mockUserSession = {
      getCurrentSession: vi.fn().mockReturnValue({ email: 'user@example.com' })
    };

    mockPlanningCenterRest = {
      fetchListMembers: vi.fn(),
    };

    service = new PlanningCenterListService(
      mockSupabase as any,
      mockUserSession as any,
      mockPlanningCenterRest as any
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  function writeCache(listId: string | null, members: Array<{ id: string; name: string }>) {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: {
          email: 'user@example.com',
          listId,
          members,
          listName: null
        },
        timestamp: Date.now(),
        ttl: 30 * 60 * 1000
      })
    );
  }

  it('hydrates list id and members from per-user cache before DB resolves', async () => {
    writeCache('list-1', [
      { id: 'm1', name: 'Alice' },
      { id: 'm2', name: 'Bob' }
    ]);

    let resolveDb: (value: unknown) => void = () => {};
    maybeSingle.mockReturnValue(new Promise(resolve => {
      resolveDb = resolve;
    }));

    const loadPromise = service.loadForUser('user@example.com');

    expect(service.getCurrentListId()).toBe('list-1');
    expect(service.getCurrentMembers()).toHaveLength(2);
    expect(await firstValueFrom(service.listId$)).toBe('list-1');

    resolveDb({ data: { planning_center_list_id: 'list-1' }, error: null });
    await loadPromise;

    expect(mockPlanningCenterRest.fetchListMembers).not.toHaveBeenCalled();
  });

  it('never pairs a new list id with members from the previous list', async () => {
    service['listIdSubject'].next('list-1');
    service['membersSubject'].next([{ id: 'old-member', name: 'Old' }]);

    const emissions: Array<{ listId: string | null; memberIds: string[] }> = [];
    const sub = combineLatest([service.listId$, service.members$]).subscribe(([listId, members]) => {
      emissions.push({ listId, memberIds: members.map(m => m.id) });
    });

    maybeSingle.mockResolvedValue({ data: { planning_center_list_id: 'list-2' }, error: null });
    vi.mocked(mockPlanningCenterRest.fetchListMembers).mockResolvedValue({
      members: [{ id: 'new-member', name: 'New' }]
    });

    await service.loadForUser('user@example.com');
    sub.unsubscribe();

    const stalePairing = emissions.some(
      e => e.listId === 'list-2' && e.memberIds.includes('old-member')
    );
    expect(stalePairing).toBe(false);
    expect(service.getCurrentListId()).toBe('list-2');
    expect(service.getCurrentMembers()).toEqual([{ id: 'new-member', name: 'New' }]);
  });

  it('clears members and cache roster when fetch fails after list id changes', async () => {
    writeCache('list-1', [{ id: 'old-member', name: 'Old' }]);
    service['listIdSubject'].next('list-1');
    service['membersSubject'].next([{ id: 'old-member', name: 'Old' }]);

    const emissions: Array<{ listId: string | null; memberIds: string[] }> = [];
    const sub = combineLatest([service.listId$, service.members$]).subscribe(([listId, members]) => {
      emissions.push({ listId, memberIds: members.map(m => m.id) });
    });

    maybeSingle.mockResolvedValue({ data: { planning_center_list_id: 'list-2' }, error: null });
    vi.mocked(mockPlanningCenterRest.fetchListMembers).mockResolvedValue({
      members: [],
      error: 'Planning Center unavailable'
    });

    await service.loadForUser('user@example.com');
    sub.unsubscribe();

    expect(emissions.some(e => e.listId === 'list-2' && e.memberIds.includes('old-member'))).toBe(false);
    expect(service.getCurrentListId()).toBe('list-2');
    expect(service.getCurrentMembers()).toEqual([]);

    const stored = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    expect(stored.data.listId).toBe('list-2');
    expect(stored.data.members).toEqual([]);
  });

  it('fetches members from API on cache miss when list id exists', async () => {
    maybeSingle.mockResolvedValue({ data: { planning_center_list_id: 'list-2' }, error: null });
    vi.mocked(mockPlanningCenterRest.fetchListMembers).mockResolvedValue({
      members: [{ id: 'x', name: 'Chris' }]
    });

    await service.loadForUser('user@example.com');

    expect(mockPlanningCenterRest.fetchListMembers).toHaveBeenCalledWith('list-2');
    expect(service.getCurrentMembers()).toEqual([{ id: 'x', name: 'Chris' }]);
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    expect(stored.data.listId).toBe('list-2');
  });

  it('clears members when subscriber has no list id', async () => {
    writeCache('old-list', [{ id: 'm1', name: 'Alice' }]);
    maybeSingle.mockResolvedValue({ data: { planning_center_list_id: null }, error: null });

    await service.loadForUser('user@example.com');

    expect(service.getCurrentListId()).toBeNull();
    expect(service.getCurrentMembers()).toEqual([]);
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    expect(stored.data.listId).toBeNull();
    expect(stored.data.members).toEqual([]);
  });

  it('ignores cache when email does not match', async () => {
    writeCache('list-1', [{ id: 'm1', name: 'Alice' }]);
    const raw = localStorage.getItem(CACHE_KEY)!;
    const parsed = JSON.parse(raw);
    parsed.data.email = 'other@example.com';
    localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));

    maybeSingle.mockResolvedValue({ data: { planning_center_list_id: null }, error: null });

    await service.loadForUser('user@example.com');

    expect(service.getCurrentListId()).toBeNull();
    expect(service.getCurrentMembers()).toEqual([]);
  });

  it('does not apply stale refresh results after a different user load starts', async () => {
    let resolveFirstDb: (value: unknown) => void = () => {};
    const firstDb = new Promise(resolve => {
      resolveFirstDb = resolve;
    });
    let call = 0;
    maybeSingle.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return firstDb;
      }
      return Promise.resolve({ data: { planning_center_list_id: 'list-b' }, error: null });
    });

    vi.mocked(mockPlanningCenterRest.fetchListMembers).mockImplementation(async (listId: string) => {
      if (listId === 'list-a') {
        return { members: [{ id: 'stale', name: 'Stale' }] };
      }
      return { members: [{ id: 'current', name: 'Current' }] };
    });

    const firstLoad = service.loadForUser('user-a@example.com');
    await service.loadForUser('user-b@example.com');

    expect(service.getCurrentListId()).toBe('list-b');
    expect(service.getCurrentMembers()).toEqual([{ id: 'current', name: 'Current' }]);

    resolveFirstDb({ data: { planning_center_list_id: 'list-a' }, error: null });
    await firstLoad;

    expect(service.getCurrentListId()).toBe('list-b');
    expect(service.getCurrentMembers()).toEqual([{ id: 'current', name: 'Current' }]);
  });

  it('invalidateForUser removes cache and clears in-memory state for that user', () => {
    writeCache('list-1', [{ id: 'm1', name: 'Alice' }]);
    service['listIdSubject'].next('list-1');
    service['membersSubject'].next([{ id: 'm1', name: 'Alice' }]);
    service['loadedEmail'] = 'user@example.com';

    service.invalidateForUser('user@example.com');

    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(service.getCurrentListId()).toBeNull();
    expect(service.getCurrentMembers()).toEqual([]);
  });

  it('getCurrentListName returns hydrated list name from cache', async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: {
          email: 'user@example.com',
          listId: 'list-1',
          listName: 'Prayer Team',
          members: []
        },
        timestamp: Date.now(),
        ttl: 30 * 60 * 1000
      })
    );
    maybeSingle.mockResolvedValue({ data: { planning_center_list_id: 'list-1' }, error: null });
    vi.mocked(mockPlanningCenterRest.fetchListMembers).mockResolvedValue({ members: [] });

    await service.loadForUser('user@example.com');

    expect(service.getCurrentListName()).toBe('Prayer Team');
  });

  it('loadForCurrentUser clears state when session email is missing', async () => {
    mockUserSession.getCurrentSession.mockReturnValue(null);
    const fresh = new PlanningCenterListService(
      mockSupabase as any,
      mockUserSession as any,
      mockPlanningCenterRest as any
    );
    vi.clearAllMocks();
    fresh['listIdSubject'].next('list-1');
    fresh['membersSubject'].next([{ id: 'm1', name: 'Alice' }]);
    fresh['listNameSubject'].next('Old List');

    await fresh.loadForCurrentUser();

    expect(fresh.getCurrentListId()).toBeNull();
    expect(fresh.getCurrentMembers()).toEqual([]);
    expect(fresh.getCurrentListName()).toBeNull();
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it('loadForCurrentUser delegates to loadForUser when session has email', async () => {
    maybeSingle.mockResolvedValue({ data: { planning_center_list_id: null }, error: null });

    await service.loadForCurrentUser();

    expect(maybeSingle).toHaveBeenCalled();
  });

  it('loadForUser clears state for blank email', async () => {
    mockUserSession.getCurrentSession.mockReturnValue(null);
    const fresh = new PlanningCenterListService(
      mockSupabase as any,
      mockUserSession as any,
      mockPlanningCenterRest as any
    );
    fresh['listIdSubject'].next('list-1');

    await fresh.loadForUser('   ');

    expect(fresh.getCurrentListId()).toBeNull();
  });

  it('loadForUser reuses in-flight load for the same user', async () => {
    mockUserSession.getCurrentSession.mockReturnValue(null);
    const fresh = new PlanningCenterListService(
      mockSupabase as any,
      mockUserSession as any,
      mockPlanningCenterRest as any
    );
    vi.clearAllMocks();
    wireGatedSupabaseMock(mockSupabase);
    mockSupabase.client.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle,
        }),
      }),
    });

    let resolveDb: (value: unknown) => void = () => {};
    maybeSingle.mockReturnValue(new Promise(resolve => {
      resolveDb = resolve;
    }));

    const first = fresh.loadForUser('user@example.com');
    const second = fresh.loadForUser('user@example.com');

    expect(mockSupabase.db).toHaveBeenCalledTimes(1);

    resolveDb({ data: { planning_center_list_id: null }, error: null });
    await Promise.all([first, second]);
  });

  it('invalidateForUser is a no-op for blank email', () => {
    writeCache('list-1', [{ id: 'm1', name: 'Alice' }]);
    service['loadedEmail'] = 'user@example.com';

    service.invalidateForUser('  ');

    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();
  });

  it('resolveEmail falls back to localStorage userSession when session service is empty', async () => {
    localStorage.setItem('userSession', JSON.stringify({ email: 'stored@example.com' }));
    mockUserSession.getCurrentSession.mockReturnValue(null);
    maybeSingle.mockResolvedValue({ data: { planning_center_list_id: null }, error: null });

    const fresh = new PlanningCenterListService(
      mockSupabase as any,
      mockUserSession as any,
      mockPlanningCenterRest as any
    );
    await fresh.loadForUser('stored@example.com');

    expect(maybeSingle).toHaveBeenCalled();
  });

  it('resolveEmail returns null when userSession JSON is invalid', () => {
    localStorage.setItem('userSession', 'not-json');
    mockUserSession.getCurrentSession.mockReturnValue(null);

    const fresh = new PlanningCenterListService(
      mockSupabase as any,
      mockUserSession as any,
      mockPlanningCenterRest as any
    );

    expect(fresh['resolveEmail']()).toBeNull();
  });

  it('readStoredCache drops expired entries and refetches members', async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: {
          email: 'user@example.com',
          listId: 'list-1',
          members: [{ id: 'm1', name: 'Alice' }],
          listName: null
        },
        timestamp: Date.now() - 60 * 60 * 1000,
        ttl: 1000
      })
    );
    maybeSingle.mockResolvedValue({ data: { planning_center_list_id: 'list-1' }, error: null });
    vi.mocked(mockPlanningCenterRest.fetchListMembers).mockResolvedValue({ members: [{ id: 'fresh', name: 'Fresh' }] });

    await service.loadForUser('user@example.com');

    expect(mockPlanningCenterRest.fetchListMembers).toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    expect(stored.data.members).toEqual([{ id: 'fresh', name: 'Fresh' }]);
  });

  it('hydrates members from legacy shared cache key before server refresh', async () => {
    localStorage.setItem(
      'planningCenterListData_cache',
      JSON.stringify({
        data: {
          members: [{ id: 'legacy', name: 'Legacy Member' }],
          listName: 'Legacy List'
        },
        timestamp: Date.now(),
        ttl: 30 * 60 * 1000
      })
    );
    let resolveDb: (value: unknown) => void = () => {};
    maybeSingle.mockReturnValue(new Promise(resolve => {
      resolveDb = resolve;
    }));
    vi.mocked(mockPlanningCenterRest.fetchListMembers).mockResolvedValue({ members: [{ id: 'new', name: 'New' }] });

    const loadPromise = service.loadForUser('user@example.com');

    expect(service.getCurrentMembers()).toEqual([{ id: 'legacy', name: 'Legacy Member' }]);
    expect(service.getCurrentListName()).toBe('Legacy List');

    resolveDb({ data: { planning_center_list_id: 'list-new' }, error: null });
    await loadPromise;

    expect(mockPlanningCenterRest.fetchListMembers).toHaveBeenCalled();
  });

  it('logs and stops when subscriber list id fetch fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    maybeSingle.mockResolvedValue({ data: null, error: new Error('db down') });

    await service.loadForUser('user@example.com');

    expect(consoleError).toHaveBeenCalledWith(
      '[PlanningCenterListService] Error fetching list id:',
      expect.any(Error)
    );
    consoleError.mockRestore();
  });

  it('ignores member fetch results after account switch mid-request', async () => {
    mockUserSession.getCurrentSession.mockReturnValue(null);
    const fresh = new PlanningCenterListService(
      mockSupabase as any,
      mockUserSession as any,
      mockPlanningCenterRest as any
    );
    vi.clearAllMocks();

    let resolveFirstDb: (value: unknown) => void = () => {};
    const firstDb = new Promise(resolve => {
      resolveFirstDb = resolve;
    });
    let call = 0;
    maybeSingle.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return firstDb;
      }
      return Promise.resolve({ data: { planning_center_list_id: 'list-b' }, error: null });
    });

    let resolveMembers: (value: unknown) => void = () => {};
    vi.mocked(mockPlanningCenterRest.fetchListMembers).mockImplementation((listId: string) => {
      if (listId === 'list-b') {
        return Promise.resolve({ members: [{ id: 'current', name: 'Current' }] });
      }
      return new Promise(resolve => {
        resolveMembers = resolve;
      });
    });

    const firstLoad = fresh.loadForUser('user-a@example.com');
    await fresh.loadForUser('user-b@example.com');

    resolveFirstDb({ data: { planning_center_list_id: 'list-a' }, error: null });
    resolveMembers({ members: [{ id: 'stale', name: 'Stale' }] });
    await firstLoad;

    expect(fresh.getCurrentListId()).toBe('list-b');
    expect(fresh.getCurrentMembers()).toEqual([{ id: 'current', name: 'Current' }]);
  });
});
