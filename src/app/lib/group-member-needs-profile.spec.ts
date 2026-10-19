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

  it('is true for group-only users without a name', () => {
    expect(groupMemberNeedsProfile({ isChurchMember: false, fullName: '' })).toBe(
      true,
    );
    expect(groupMemberNeedsProfile({ isChurchMember: false, fullName: '  ' })).toBe(
      true,
    );
  });
});
