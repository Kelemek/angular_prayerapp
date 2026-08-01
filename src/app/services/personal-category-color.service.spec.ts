import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { PersonalCategoryColorService } from '../../app/services/personal-category-color.service';

describe('PersonalCategoryColorService', () => {
  let service: PersonalCategoryColorService;
  let upsertMock: ReturnType<typeof vi.fn>;
  let eqMock: ReturnType<typeof vi.fn>;
  let selectMock: ReturnType<typeof vi.fn>;
  let fromMock: ReturnType<typeof vi.fn>;
  let cache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
  };
  let resolveUserEmail: ReturnType<typeof vi.fn>;
  let userSessionSubject: BehaviorSubject<{ email: string } | null>;
  let userSessionService: {
    resolveUserEmail: ReturnType<typeof vi.fn>;
    userSession$: ReturnType<BehaviorSubject<{ email: string } | null>['asObservable']>;
  };
  let toast: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    upsertMock = vi.fn().mockResolvedValue({ error: null });
    eqMock = vi.fn().mockReturnValue({
      data: [{ category: 'Health', color: '#DC2626' }],
      error: null,
    });
    const ilikeMock = vi.fn().mockReturnValue({
      data: [{ category: 'Health', color: '#DC2626' }],
      error: null,
    });
    selectMock = vi.fn().mockReturnValue({ eq: eqMock, ilike: ilikeMock });
    fromMock = vi.fn().mockReturnValue({
      select: selectMock,
      upsert: upsertMock,
    });

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

    userSessionService = {
      resolveUserEmail,
      userSession$: userSessionSubject.asObservable(),
    };

    toast = { error: vi.fn() };

    const supabase = {
      client: {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { email: 'user@example.com' } } },
          }),
        },
        from: fromMock,
      },
    };

    service = new PersonalCategoryColorService(
      supabase as any,
      cache as any,
      userSessionService as any,
      toast as any
    );
  });

  it('loads colors into cache and snapshot', async () => {
    const map = await service.loadColors(true);
    expect(map.Health).toBe('#DC2626');
    expect(cache.set).toHaveBeenCalledWith('personalCategoryColors', map);
    expect(service.getColorsSnapshot().Health).toBe('#DC2626');
  });

  it('setColor upserts and updates snapshot', async () => {
    await service.setColor('Family', '#2563EB');
    expect(upsertMock).toHaveBeenCalled();
    expect(service.getColorsSnapshot().Family).toBe('#2563EB');
  });

  it('ignores stale setColor cache updates after the session email changes', async () => {
    service.invalidate();
    cache.set.mockClear();

    let releaseUpsert: (() => void) | undefined;
    const upsertPromise = new Promise<{ error: null }>((resolve) => {
      releaseUpsert = () => resolve({ error: null });
    });
    upsertMock.mockReturnValue(upsertPromise);

    resolveUserEmail
      .mockResolvedValueOnce('user@example.com')
      .mockResolvedValueOnce('other@example.com');

    const setPromise = service.setColor('Family', '#2563EB');
    releaseUpsert?.();
    const result = await setPromise;

    expect(result).toBe(true);
    expect(cache.set).not.toHaveBeenCalled();
    expect(service.getColorsSnapshot().Family).toBeUndefined();
  });

  it('invalidate clears snapshot and cache', () => {
    service.invalidate();
    expect(service.getColorsSnapshot()).toEqual({});
    expect(cache.invalidate).toHaveBeenCalledWith('personalCategoryColors');
  });

  it('ignores stale loadColors results after the session email changes', async () => {
    service.invalidate();
    cache.set.mockClear();

    let releaseQuery: (() => void) | undefined;
    const queryPromise = new Promise<{ data: unknown[]; error: null }>((resolve) => {
      releaseQuery = () =>
        resolve({ data: [{ category: 'Health', color: '#DC2626' }], error: null });
    });
    const ilikeMock = vi.fn().mockReturnValue(queryPromise);
    selectMock.mockReturnValue({ eq: eqMock, ilike: ilikeMock });

    resolveUserEmail
      .mockResolvedValueOnce('user@example.com')
      .mockResolvedValueOnce('other@example.com');

    const loadPromise = service.loadColors(true);
    releaseQuery?.();
    await loadPromise;

    expect(cache.set).not.toHaveBeenCalled();
    expect(service.getColorsSnapshot()).toEqual({});
  });

  it('invalidates cached colors when userSession$ emits a new email', () => {
    cache.invalidate.mockClear();
    userSessionSubject.next({ email: 'other@example.com' });
    expect(cache.invalidate).toHaveBeenCalledWith('personalCategoryColors');
    expect(service.getColorsSnapshot()).toEqual({});
  });
});
