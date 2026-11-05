import { describe, expect, it } from 'vitest';
import {
  churchContentVisible,
  churchPushTarget,
  isPrayerGroupsFeatureEnabled,
  prayerGroupCatalogSessionGateKey,
  resolveHomeFilterFromSession,
  sanitizeHomeAreaFilter,
} from './prayer-groups-feature';

describe('prayer-groups-feature', () => {
  it('builds catalog gate keys from normalized email only', () => {
    expect(
      prayerGroupCatalogSessionGateKey({
        email: 'User@Example.com',
      }),
    ).toBe('user@example.com');
    expect(prayerGroupCatalogSessionGateKey(null)).toBeNull();
    expect(prayerGroupCatalogSessionGateKey({ email: '  ' })).toBeNull();
  });

  it('treats prayer groups as on when the session has an email', () => {
    expect(isPrayerGroupsFeatureEnabled(null)).toBe(false);
    expect(isPrayerGroupsFeatureEnabled({})).toBe(false);
    expect(
      isPrayerGroupsFeatureEnabled({ email: 'member@example.com' }),
    ).toBe(true);
  });

  it('does not redirect the groups tab after rollout', () => {
    expect(
      sanitizeHomeAreaFilter('groups', { isChurchMember: true }),
    ).toBe('groups');
    expect(
      sanitizeHomeAreaFilter('groups', { isChurchMember: false }),
    ).toBe('groups');
  });

  it('resolves group-only members to groups for church filters', () => {
    expect(
      resolveHomeFilterFromSession('current', {
        isChurchMember: false,
        email: 'g@example.com',
      }),
    ).toBe('groups');
    expect(
      resolveHomeFilterFromSession('groups', {
        isChurchMember: true,
        email: 'c@example.com',
      }),
    ).toBe('groups');
  });

  it('hides church content until the session is a settled church member', () => {
    expect(
      churchContentVisible({
        sessionInitialized: false,
        isChurchMember: true,
      }),
    ).toBe(false);
    expect(
      churchContentVisible({
        sessionInitialized: true,
        isChurchMember: false,
      }),
    ).toBe(false);
    expect(
      churchContentVisible({
        sessionInitialized: true,
        isChurchMember: true,
      }),
    ).toBe(true);
  });

  it('sends a group-only hourly reminder away from church prayers', () => {
    expect(
      churchPushTarget({
        event: 'prayer_reminder',
        prayerKind: null,
        prayerId: 'p-1',
        promptId: null,
        session: { isChurchMember: false, email: 'g@example.com' },
      }),
    ).toEqual({ kind: 'groups' });
  });

  it('opens a group prayer and a church member church prayer', () => {
    expect(
      churchPushTarget({
        event: 'prayer_item_reminder',
        prayerKind: 'group',
        prayerId: 'g-prayer',
        promptId: null,
        session: { isChurchMember: false, email: 'g@example.com' },
      }),
    ).toEqual({ kind: 'groups', prayerId: 'g-prayer' });
    expect(
      churchPushTarget({
        event: 'prayer_item_reminder',
        prayerKind: 'community',
        prayerId: 'c-1',
        promptId: null,
        session: { isChurchMember: true, email: 'c@example.com' },
      }),
    ).toEqual({ kind: 'church_prayer', prayerId: 'c-1' });
    expect(
      churchPushTarget({
        event: 'prayer_item_reminder',
        prayerKind: 'prompt',
        prayerId: null,
        promptId: 'prompt-1',
        session: { isChurchMember: false, email: 'g@example.com' },
      }).kind,
    ).not.toBe('prompt');
  });
});
