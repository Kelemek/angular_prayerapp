import { describe, expect, it } from 'vitest';
import {
  canChangeOtherOwner,
  canGrantGroupOwnership,
  mustTransferBeforeLeaving,
  prayerGroupOwnerInviteNotice,
  readPrayerGroupInvitePayload,
} from './prayer-group-owners';

describe('canGrantGroupOwnership', () => {
  it('refuses a member', () => {
    expect(canGrantGroupOwnership('member')).toBe(false);
  });

  it('allows an owner', () => {
    expect(canGrantGroupOwnership('owner')).toBe(true);
  });
});

describe('mustTransferBeforeLeaving', () => {
  it('stops the last owner', () => {
    expect(mustTransferBeforeLeaving('owner', 1)).toBe(true);
    expect(mustTransferBeforeLeaving('owner', 0)).toBe(true);
  });

  it('lets a co-owner leave', () => {
    expect(mustTransferBeforeLeaving('owner', 2)).toBe(false);
  });

  it('lets a member leave', () => {
    expect(mustTransferBeforeLeaving('member', 1)).toBe(false);
  });
});

describe('canChangeOtherOwner', () => {
  it('refuses a non-owner', () => {
    expect(
      canChangeOtherOwner({
        viewerRole: 'member',
        viewerEmail: 'member@example.com',
        memberEmail: 'owner@example.com',
        memberRole: 'owner',
        owners: 2,
      }),
    ).toBe(false);
  });

  it('refuses removing the last owner', () => {
    expect(
      canChangeOtherOwner({
        viewerRole: 'owner',
        viewerEmail: 'owner@example.com',
        memberEmail: 'other@example.com',
        memberRole: 'owner',
        owners: 1,
      }),
    ).toBe(false);
  });

  it('allows demoting another owner when one would remain', () => {
    expect(
      canChangeOtherOwner({
        viewerRole: 'owner',
        viewerEmail: 'owner@example.com',
        memberEmail: 'Other@example.com',
        memberRole: 'owner',
        owners: 2,
      }),
    ).toBe(true);
  });

  it('does not offer the control on yourself', () => {
    expect(
      canChangeOtherOwner({
        viewerRole: 'owner',
        viewerEmail: 'owner@example.com',
        memberEmail: 'owner@example.com',
        memberRole: 'owner',
        owners: 2,
      }),
    ).toBe(false);
  });
});

describe('prayerGroupOwnerInviteNotice', () => {
  it('tells the owner an unknown email becomes an owner after signup', () => {
    expect(
      prayerGroupOwnerInviteNotice(
        'new@example.com',
        { createdSubscriber: true, alreadyOwner: false, wasMember: false },
        true,
      ),
    ).toEqual({
      tone: 'success',
      text: 'No account for new@example.com yet. An invite was sent. They will be an owner when they sign up.',
    });
  });

  it('does not claim an invite was sent when the email failed', () => {
    expect(
      prayerGroupOwnerInviteNotice(
        'new@example.com',
        { createdSubscriber: true, alreadyOwner: false, wasMember: false },
        false,
      ).text,
    ).toBe('No account for new@example.com yet. They will be an owner when they sign up.');
  });

  it('names an existing account as an owner now', () => {
    expect(
      prayerGroupOwnerInviteNotice(
        'pat@example.com',
        { createdSubscriber: false, alreadyOwner: false, wasMember: true },
        false,
      ),
    ).toEqual({ tone: 'success', text: 'pat@example.com is now an owner.' });
  });

  it('reads the invite payload without treating missing fields as true', () => {
    expect(readPrayerGroupInvitePayload({ created_subscriber: true })).toEqual({
      createdSubscriber: true,
      alreadyOwner: false,
      wasMember: false,
    });
    expect(readPrayerGroupInvitePayload(null)).toEqual({
      createdSubscriber: false,
      alreadyOwner: false,
      wasMember: false,
    });
  });
});
