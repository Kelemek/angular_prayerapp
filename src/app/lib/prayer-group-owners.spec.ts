import { describe, expect, it } from 'vitest';
import {
  canChangeOtherOwner,
  canGrantGroupOwnership,
  lastOwnerCannotLeave,
} from './prayer-group-owners';

describe('canGrantGroupOwnership', () => {
  it('refuses a member', () => {
    expect(canGrantGroupOwnership('member')).toBe(false);
  });

  it('allows an owner', () => {
    expect(canGrantGroupOwnership('owner')).toBe(true);
  });
});

describe('lastOwnerCannotLeave', () => {
  it('stops the last owner until another owner exists', () => {
    expect(lastOwnerCannotLeave('owner', 1)).toBe(true);
    expect(lastOwnerCannotLeave('owner', 0)).toBe(true);
  });

  it('lets a co-owner leave', () => {
    expect(lastOwnerCannotLeave('owner', 2)).toBe(false);
  });

  it('lets a member leave', () => {
    expect(lastOwnerCannotLeave('member', 1)).toBe(false);
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
