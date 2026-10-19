import { describe, expect, it, vi } from 'vitest';
import { PrayerGroupService, prayerGroupSummariesForViewer } from './prayer-group.service';

describe('prayerGroupSummariesForViewer', () => {
  it('keeps one chip when the membership read includes every member', () => {
    const group = { id: 'group-1', name: 'Family' };
    const summaries = prayerGroupSummariesForViewer(
      [
        { user_email: 'owner@example.com', role: 'owner', prayer_groups: group },
        { user_email: 'member@example.com', role: 'member', prayer_groups: group },
      ],
      'owner@example.com',
    );

    expect(summaries).toEqual([
      { id: 'group-1', name: 'Family', role: 'owner' },
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
                  prayer_groups: { id: 'g1', name: 'Family' },
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
    const service = new PrayerGroupService({
      db: async () => ({ auth: { getUser, getSession }, from }),
    } as never);

    const groups = await Promise.race([
      service.listGroups(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('listGroups hung')), 200);
      }),
    ]);

    expect(getUser).not.toHaveBeenCalled();
    expect(groups).toEqual([
      { id: 'g1', name: 'Family', role: 'owner', memberCount: 1 },
    ]);
    expect(service.membersForGroup('g1')).toEqual([
      { user_email: 'markdlarson@me.com', role: 'owner', name: 'Mark' },
    ]);
  });
});
