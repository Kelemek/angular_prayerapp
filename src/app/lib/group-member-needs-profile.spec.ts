import { describe, expect, it } from 'vitest';
import { groupMemberNeedsProfile } from './group-member-needs-profile';

describe('groupMemberNeedsProfile', () => {
  it('is false for church members and named group members', () => {
    expect(groupMemberNeedsProfile({ isChurchMember: true, fullName: '' })).toBe(
      false,
    );
    expect(
      groupMemberNeedsProfile({ isChurchMember: false, fullName: 'Jane' }),
    ).toBe(false);
  });

  it('is true for group-only users without a name when groups are enabled', () => {
    expect(
      groupMemberNeedsProfile({
        isChurchMember: false,
        fullName: '',
        prayerGroupsEnabled: true,
      }),
    ).toBe(true);
    expect(
      groupMemberNeedsProfile({
        isChurchMember: false,
        fullName: '  ',
        prayerGroupsEnabled: true,
      }),
    ).toBe(true);
  });

  it('is false when prayer groups are disabled for the account', () => {
    expect(
      groupMemberNeedsProfile({
        isChurchMember: false,
        fullName: '',
        prayerGroupsEnabled: false,
      }),
    ).toBe(false);
  });
});
