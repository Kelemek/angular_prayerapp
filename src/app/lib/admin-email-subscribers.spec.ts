import { describe, it, expect } from 'vitest';
import {
  emailSubscriberMembershipStatusLabel,
  escapeEmailSubscriberIlikePattern,
} from './admin-email-subscribers';

describe('admin-email-subscribers', () => {
  it('emailSubscriberMembershipStatusLabel maps is_church_member', () => {
    expect(
      emailSubscriberMembershipStatusLabel({ is_church_member: false }),
    ).toBe('Group');
    expect(
      emailSubscriberMembershipStatusLabel({ is_church_member: true }),
    ).toBe('Member');
    expect(emailSubscriberMembershipStatusLabel({})).toBe('Member');
  });

  it('escapeEmailSubscriberIlikePattern escapes ilike metacharacters', () => {
    expect(escapeEmailSubscriberIlikePattern('100%')).toBe('100\\%');
    expect(escapeEmailSubscriberIlikePattern('a_b')).toBe('a\\_b');
    expect(escapeEmailSubscriberIlikePattern('a\\b')).toBe('a\\\\b');
  });
});
