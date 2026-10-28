import { describe, it, expect } from 'vitest';
import { GROUPS_WALKTHROUGH_GROUP_NAME } from './help-tour-ids';
import {
  groupsWalkthroughCleanupIds,
  type GroupsWalkthroughCleanupGroup,
} from './groups-walkthrough-cleanup';

function group(
  id: string,
  overrides: Partial<GroupsWalkthroughCleanupGroup> = {},
): GroupsWalkthroughCleanupGroup {
  return {
    id,
    name: overrides.name ?? 'Family',
    role: overrides.role ?? 'owner',
    memberCount: overrides.memberCount ?? 3,
  };
}

describe('groupsWalkthroughCleanupIds', () => {
  const groups = [
    group('sample', {
      name: GROUPS_WALKTHROUGH_GROUP_NAME,
      role: 'owner',
      memberCount: 1,
    }),
    group('sample-empty', {
      name: GROUPS_WALKTHROUGH_GROUP_NAME,
      role: 'owner',
      memberCount: 0,
    }),
    group('family', { name: 'Family', role: 'owner', memberCount: 1 }),
    group('shared-name', {
      name: GROUPS_WALKTHROUGH_GROUP_NAME,
      role: 'owner',
      memberCount: 2,
    }),
    group('member-sample', {
      name: GROUPS_WALKTHROUGH_GROUP_NAME,
      role: 'member',
      memberCount: 1,
    }),
  ];

  it('selects only a solo owner group with the walkthrough name', () => {
    expect(groupsWalkthroughCleanupIds(groups)).toEqual(['sample', 'sample-empty']);
  });

  it('selects nothing on a second pass after those groups are gone', () => {
    const remaining = groups.filter(
      (item) => !groupsWalkthroughCleanupIds(groups).includes(item.id),
    );
    expect(groupsWalkthroughCleanupIds(remaining)).toEqual([]);
  });
});
