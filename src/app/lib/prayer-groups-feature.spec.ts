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
  it('builds distinct catalog gate keys per email and feature flag', () => {
    expect(
      prayerGroupCatalogSessionGateKey({
        email: 'User@Example.com',
        prayerGroupsEnabled: true,
      }),
    ).toBe('user@example.com:true');
    expect(
      prayerGroupCatalogSessionGateKey({
        email: 'user@example.com',
        prayerGroupsEnabled: false,
      }),
    ).toBe('user@example.com:false');
    expect(prayerGroupCatalogSessionGateKey(null)).toBeNull();
  });

  it('treats prayer groups as off unless explicitly enabled', () => {
    expect(isPrayerGroupsFeatureEnabled(null)).toBe(false);
    expect(isPrayerGroupsFeatureEnabled({})).toBe(false);
    expect(isPrayerGroupsFeatureEnabled({ prayerGroupsEnabled: true })).toBe(
      true,
    );
  });

  it('redirects groups tab when the feature is disabled', () => {
    expect(
      sanitizeHomeAreaFilter('groups', { isChurchMember: true }),
    ).toBe('current');
    expect(
      sanitizeHomeAreaFilter('groups', { isChurchMember: false }),
    ).toBe('personal');
    expect(
      sanitizeHomeAreaFilter('groups', {
        isChurchMember: false,
        prayerGroupsEnabled: true,
      }),
    ).toBe('groups');
  });

  it('resolves group-only members to groups only when enabled', () => {
    expect(
      resolveHomeFilterFromSession('current', {
        isChurchMember: false,
        prayerGroupsEnabled: true,
      }),
    ).toBe('groups');
    expect(
      resolveHomeFilterFromSession('current', {
        isChurchMember: false,
        prayerGroupsEnabled: false,
      }),
    ).toBe('personal');
    expect(
      resolveHomeFilterFromSession('groups', {
        isChurchMember: true,
        prayerGroupsEnabled: false,
      }),
    ).toBe('current');
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
        session: { isChurchMember: false, prayerGroupsEnabled: true },
      }),
    ).toEqual({ kind: 'groups' });
    expect(
      churchPushTarget({
        event: 'prayer_reminder',
        prayerKind: null,
        prayerId: 'p-1',
        promptId: null,
        session: { isChurchMember: false, prayerGroupsEnabled: false },
      }),
    ).toEqual({ kind: 'personal' });
  });

  it('opens a group prayer and a church member church prayer', () => {
    expect(
      churchPushTarget({
        event: 'prayer_item_reminder',
        prayerKind: 'group',
        prayerId: 'g-prayer',
        promptId: null,
        session: { isChurchMember: false, prayerGroupsEnabled: true },
      }),
    ).toEqual({ kind: 'groups', prayerId: 'g-prayer' });
    expect(
      churchPushTarget({
        event: 'prayer_item_reminder',
        prayerKind: 'community',
        prayerId: 'c-1',
        promptId: null,
        session: { isChurchMember: true },
      }),
    ).toEqual({ kind: 'church_prayer', prayerId: 'c-1' });
    expect(
      churchPushTarget({
        event: 'prayer_item_reminder',
        prayerKind: 'prompt',
        prayerId: null,
        promptId: 'prompt-1',
        session: { isChurchMember: false, prayerGroupsEnabled: true },
      }).kind,
    ).not.toBe('prompt');
  });
});
