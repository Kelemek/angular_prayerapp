import { describe, expect, it } from 'vitest';
import { parseInviteEmails } from './home-group-invite-emails';

describe('parseInviteEmails', () => {
  it('returns no addresses for blank or invalid tokens', () => {
    expect(parseInviteEmails('')).toEqual([]);
    expect(parseInviteEmails('   ')).toEqual([]);
    expect(parseInviteEmails('not-an-email')).toEqual([]);
    expect(parseInviteEmails('missing-dot@domain')).toEqual([]);
  });

  it('parses one or more valid addresses', () => {
    expect(parseInviteEmails('friend@example.com')).toEqual(['friend@example.com']);
    expect(parseInviteEmails('a@b.com, c@d.org')).toEqual(['a@b.com', 'c@d.org']);
  });
});
