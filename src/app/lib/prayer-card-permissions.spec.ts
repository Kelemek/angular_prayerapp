import { describe, it, expect } from 'vitest';
import {
  canManageMemberPrayerUpdate,
  prayerUpdateDeleteAction,
  showPrayerCardAddUpdateButton,
  showPrayerCardDeleteButton,
  showPrayerCardUpdateDeleteButton,
  type PrayerCardPermissionContext,
} from './prayer-card-permissions';

function baseContext(
  overrides: Partial<PrayerCardPermissionContext> = {}
): PrayerCardPermissionContext {
  return {
    prayerId: 'prayer-1',
    prayerEmail: 'user@example.com',
    isAdmin: false,
    isPersonal: false,
    deletionsAllowed: 'everyone',
    updatesAllowed: 'everyone',
    currentUserEmail: 'user@example.com',
    ...overrides,
  };
}

describe('showPrayerCardDeleteButton', () => {
  it('hides delete for member cards', () => {
    expect(
      showPrayerCardDeleteButton(
        baseContext({ prayerId: 'pc-member-abc', isPersonal: false })
      )
    ).toBe(false);
  });

  it('allows personal and admin deletes', () => {
    expect(showPrayerCardDeleteButton(baseContext({ isPersonal: true }))).toBe(
      true
    );
    expect(showPrayerCardDeleteButton(baseContext({ isAdmin: true }))).toBe(
      true
    );
  });

  it('respects admin-only deletion policy', () => {
    expect(
      showPrayerCardDeleteButton(
        baseContext({ deletionsAllowed: 'admin-only' })
      )
    ).toBe(false);
  });

  it('respects original-requestor deletion policy', () => {
    expect(
      showPrayerCardDeleteButton(
        baseContext({
          deletionsAllowed: 'original-requestor',
          currentUserEmail: 'other@example.com',
        })
      )
    ).toBe(false);
    expect(
      showPrayerCardDeleteButton(
        baseContext({ deletionsAllowed: 'original-requestor' })
      )
    ).toBe(true);
  });
});

describe('showPrayerCardAddUpdateButton', () => {
  it('allows member cards regardless of policy', () => {
    expect(
      showPrayerCardAddUpdateButton(
        baseContext({
          prayerId: 'pc-member-abc',
          updatesAllowed: 'admin-only',
        })
      )
    ).toBe(true);
  });
});

describe('canManageMemberPrayerUpdate', () => {
  it('allows the author and any admin', () => {
    expect(
      canManageMemberPrayerUpdate({
        isAdmin: false,
        currentUserEmail: 'Author@Example.com',
        authorEmail: 'author@example.com',
      })
    ).toBe(true);
    expect(
      canManageMemberPrayerUpdate({
        isAdmin: true,
        currentUserEmail: 'admin@example.com',
        authorEmail: 'author@example.com',
      })
    ).toBe(true);
  });

  it('hides another members note and notes with no author', () => {
    expect(
      canManageMemberPrayerUpdate({
        isAdmin: false,
        currentUserEmail: 'reader@example.com',
        authorEmail: 'author@example.com',
      })
    ).toBe(false);
    expect(
      canManageMemberPrayerUpdate({
        isAdmin: false,
        currentUserEmail: 'reader@example.com',
        authorEmail: null,
      })
    ).toBe(false);
  });
});

describe('prayerUpdateDeleteAction', () => {
  it('confirms for an admin, the author, or a personal prayer', () => {
    expect(
      prayerUpdateDeleteAction({
        isMember: true,
        isAdmin: true,
        isPersonal: false,
        currentUserEmail: 'admin@example.com',
        authorEmail: 'author@example.com',
      })
    ).toBe('confirm');
    expect(
      prayerUpdateDeleteAction({
        isMember: true,
        isAdmin: false,
        isPersonal: false,
        currentUserEmail: 'Author@Example.com',
        authorEmail: 'author@example.com',
      })
    ).toBe('confirm');
    expect(
      prayerUpdateDeleteAction({
        isMember: false,
        isAdmin: false,
        isPersonal: true,
        currentUserEmail: 'user@example.com',
        authorEmail: null,
      })
    ).toBe('confirm');
  });

  it('hides another members note and asks for a community delete', () => {
    expect(
      prayerUpdateDeleteAction({
        isMember: true,
        isAdmin: false,
        isPersonal: false,
        currentUserEmail: 'reader@example.com',
        authorEmail: 'author@example.com',
      })
    ).toBe('none');
    expect(
      prayerUpdateDeleteAction({
        isMember: false,
        isAdmin: false,
        isPersonal: false,
        currentUserEmail: 'reader@example.com',
        authorEmail: 'author@example.com',
      })
    ).toBe('request');
  });
});

describe('showPrayerCardUpdateDeleteButton', () => {
  it('mirrors deletion policy for non-admin users', () => {
    expect(
      showPrayerCardUpdateDeleteButton(
        baseContext({ deletionsAllowed: 'original-requestor' })
      )
    ).toBe(true);
    expect(
      showPrayerCardUpdateDeleteButton(
        baseContext({
          deletionsAllowed: 'original-requestor',
          currentUserEmail: 'other@example.com',
        })
      )
    ).toBe(false);
  });
});
