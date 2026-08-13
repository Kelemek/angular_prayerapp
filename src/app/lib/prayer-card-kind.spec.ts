import { describe, it, expect } from 'vitest';
import {
  isCommunityPrayerCard,
  isMemberPrayerId,
  isPersonalPrayerCard,
  getPrayerCardMutationKind,
} from './prayer-card-kind';

describe('prayer-card-kind', () => {
  it('isMemberPrayerId detects pc-member ids', () => {
    expect(isMemberPrayerId('pc-member-1')).toBe(true);
    expect(isMemberPrayerId('prayer-1')).toBe(false);
  });

  it('isPersonalPrayerCard respects flag or user_email', () => {
    expect(isPersonalPrayerCard({ id: 'p1', user_email: 'a@b.com' })).toBe(true);
    expect(isPersonalPrayerCard({ id: 'p1' }, true)).toBe(true);
    expect(isPersonalPrayerCard({ id: 'p1' })).toBe(false);
  });

  it('getPrayerCardMutationKind dispatches member, personal, and community', () => {
    expect(getPrayerCardMutationKind({ id: 'pc-member-1' })).toBe('member');
    expect(getPrayerCardMutationKind({ id: 'p1', user_email: 'a@b.com' })).toBe(
      'personal'
    );
    expect(getPrayerCardMutationKind({ id: 'p1' })).toBe('community');
  });
});
