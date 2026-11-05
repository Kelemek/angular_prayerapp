import { describe, expect, it } from 'vitest';
import { groupMemberNeedsProfile } from './group-member-needs-profile';

describe('groupMemberNeedsProfile', () => {
  it('is false for church members and named group members', () => {
    expect(groupMemberNeedsProfile({ isChurchMember: true, fullName: '' })).toBe(
      false,
    );
    expect(
      groupMemberNeedsProfile({
        isChurchMember: false,
        fullName: 'Jane',
        email: 'j@example.com',
      }),
    ).toBe(false);
  });

  it('is true for group-only users without a name when signed in', () => {
    expect(
      groupMemberNeedsProfile({
        isChurchMember: false,
        fullName: '',
        email: 'g@example.com',
      }),
    ).toBe(true);
    expect(
      groupMemberNeedsProfile({
        isChurchMember: false,
        fullName: '  ',
        email: 'g@example.com',
      }),
    ).toBe(true);
  });

  it('is false without a session email', () => {
    expect(
      groupMemberNeedsProfile({
        isChurchMember: false,
        fullName: '',
      }),
    ).toBe(false);
  });
});
