import { describe, expect, it } from 'vitest';
import { shouldSkipChurchQueueRow } from './church-email-queue';

describe('shouldSkipChurchQueueRow', () => {
  it('sends church templates to church members', () => {
    expect(
      shouldSkipChurchQueueRow({
        templateKey: 'approved_prayer',
        recipientIsChurchMember: true,
        appLink: 'https://cpprayer.cp-church.org/?filter=current',
      })
    ).toBe(false);
  });

  it('skips church blasts to group-only recipients', () => {
    expect(
      shouldSkipChurchQueueRow({
        templateKey: 'approved_prayer',
        recipientIsChurchMember: false,
        appLink: 'https://cpprayer.cp-church.org/?filter=current',
      })
    ).toBe(true);
    expect(
      shouldSkipChurchQueueRow({
        templateKey: 'verse_memorization_prayer',
        recipientIsChurchMember: false,
      })
    ).toBe(true);
    expect(
      shouldSkipChurchQueueRow({
        templateKey: 'admin_subscriber_manual_broadcast',
        recipientIsChurchMember: false,
      })
    ).toBe(true);
  });

  it('keeps group activity mail for group-only recipients', () => {
    expect(
      shouldSkipChurchQueueRow({
        templateKey: 'approved_prayer',
        recipientIsChurchMember: false,
        appLink: 'https://cpprayer.cp-church.org/?filter=groups&groupId=1',
      })
    ).toBe(false);
  });

  it('does not skip unrelated templates', () => {
    expect(
      shouldSkipChurchQueueRow({
        templateKey: 'group_welcome',
        recipientIsChurchMember: false,
      })
    ).toBe(false);
  });
});
