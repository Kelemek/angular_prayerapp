import { GROUPS_WALKTHROUGH_GROUP_NAME } from './help-tour-ids';

/** Fields the walkthrough rule reads. A full group summary satisfies this. */
export interface GroupsWalkthroughCleanupGroup {
  id: string;
  name: string;
  role: 'owner' | 'member';
  memberCount: number;
}

/** The one rule for "the Groups help tour's sample group": tour anchors, settings, and cleanup all use it. */
export function isGroupsWalkthroughGroup(group: GroupsWalkthroughCleanupGroup): boolean {
  return (
    group.name === GROUPS_WALKTHROUGH_GROUP_NAME &&
    group.role === 'owner' &&
    group.memberCount <= 1
  );
}

export function groupsWalkthroughCleanupIds(
  groups: readonly GroupsWalkthroughCleanupGroup[],
): string[] {
  return groups.filter(isGroupsWalkthroughGroup).map((group) => group.id);
}
