import { describe, expect, it, vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import {
  PrayerGroupService,
  type PrayerGroupSummary,
  prayerGroupSummariesForViewer,
} from './prayer-group.service';

describe('prayerGroupSummariesForViewer', () => {
  it('keeps one chip when the membership read includes every member', () => {
    const group = { id: 'group-1', name: 'Family', color: '#2563EB' };
    const summaries = prayerGroupSummariesForViewer(
      [
        { user_email: 'owner@example.com', role: 'owner', prayer_groups: group },
        { user_email: 'member@example.com', role: 'member', prayer_groups: group },
      ],
      'owner@example.com',
    );

    expect(summaries).toEqual([
      { id: 'group-1', name: 'Family', color: '#2563EB', role: 'owner' },
    ]);
  });
});

describe('PrayerGroupService.listGroups', () => {
  it('reads the local session and does not wait on auth.getUser', async () => {
    const getUser = vi.fn(() => new Promise(() => {}));
    const getSession = vi.fn(async () => ({
      data: { session: { user: { email: 'Markdlarson@me.com' } } },
      error: null,
    }));
    let reads = 0;
    const from = vi.fn(() => {
      reads += 1;
      const payload =
        reads === 1
          ? {
              data: [
                {
                  user_email: 'markdlarson@me.com',
                  role: 'owner',
                  prayer_groups: { id: 'g1', name: 'Family', color: '#2563EB' },
                },
              ],
              error: null,
            }
          : {
              data: [
                {
                  group_id: 'g1',
                  user_email: 'markdlarson@me.com',
                  role: 'owner',
                  name: 'Mark',
                },
              ],
              error: null,
            };
      const builder: {
        select: () => typeof builder;
        eq: () => typeof builder;
        order: () => typeof builder;
        in: () => typeof builder;
        then: (resolve: (value: typeof payload) => void) => void;
      } = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        in: () => builder,
        then: (resolve) => resolve(payload),
      };
      return builder;
    });
    const service = new PrayerGroupService(
      {
        db: async () => ({ auth: { getUser, getSession }, from }),
      } as never,
      {
        get: vi.fn(),
        set: vi.fn(),
        invalidate: vi.fn(),
      } as never,
      {
        userSession$: new BehaviorSubject(null),
      } as never,
    );

    const groups = await Promise.race([
      service.listGroups(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('listGroups hung')), 200);
      }),
    ]);

    expect(getUser).not.toHaveBeenCalled();
    expect(groups).toEqual([
      {
        id: 'g1',
        name: 'Family',
        color: '#2563EB',
        role: 'owner',
        memberCount: 1,
      },
    ]);
    expect(service.membersForGroup('g1')).toEqual([
      { user_email: 'markdlarson@me.com', role: 'owner', name: 'Mark' },
    ]);
  });
});

describe('PrayerGroupService.createGroup', () => {
  it('returns after RPC without waiting for catalog reload', async () => {
    let resolveCatalog: () => void = () => undefined;
    const catalogGate = new Promise<void>((resolve) => {
      resolveCatalog = resolve;
    });
    const rpc = vi.fn().mockResolvedValue({ data: 'new-group-id', error: null });
    const invalidate = vi.fn();
    const loadCatalog = vi.fn().mockReturnValue(catalogGate);
    const service = new PrayerGroupService(
      {
        db: async () => ({ rpc }),
      } as never,
      { invalidate } as never,
      {
        userSession$: new BehaviorSubject(null),
        getCurrentSession: vi.fn().mockReturnValue({ prayer_groups_enabled: true }),
      } as never,
    );
    vi.spyOn(service, 'loadCatalog').mockImplementation(loadCatalog);

    const id = await Promise.race([
      service.createGroup('Test', '#DC2626'),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('createGroup hung')), 200);
      }),
    ]);

    expect(id).toBe('new-group-id');
    expect(rpc).toHaveBeenCalledWith('create_prayer_group', {
      p_name: 'Test',
      p_color: '#DC2626',
    });
    expect(invalidate).toHaveBeenCalled();
    expect(loadCatalog).toHaveBeenCalledWith(true);
    resolveCatalog();
  });
});

describe('PrayerGroupService.updateGroupColor', () => {
  function serviceWithCatalogGroups(
    groups: PrayerGroupSummary[],
    rpc: ReturnType<typeof vi.fn>,
  ): PrayerGroupService {
    const service = new PrayerGroupService(
      { db: async () => ({ rpc }) } as never,
      {
        invalidate: vi.fn(),
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
      } as never,
      {
        userSession$: new BehaviorSubject(null),
        getCurrentSession: vi.fn().mockReturnValue({ email: 'a@b.com' }),
      } as never,
    );
    (
      service as unknown as {
        groupsSubject: BehaviorSubject<PrayerGroupSummary[]>;
      }
    ).groupsSubject.next(groups);
    return service;
  }

  it('calls update_prayer_group_color RPC and reloads catalog in the background', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const loadCatalog = vi.fn().mockResolvedValue(undefined);
    const service = serviceWithCatalogGroups(
      [
        {
          id: 'g1',
          name: 'Catalog name',
          color: '#2563EB',
          role: 'owner',
          memberCount: 1,
        },
      ],
      rpc,
    );
    vi.spyOn(service, 'loadCatalog').mockImplementation(loadCatalog);

    await service.updateGroupColor('g1', '#DC2626');

    expect(rpc).toHaveBeenCalledWith('update_prayer_group_color', {
      p_group_id: 'g1',
      p_color: '#DC2626',
    });
    expect(loadCatalog).toHaveBeenCalledWith(true);
  });
});
