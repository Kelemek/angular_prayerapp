import { describe, expect, it } from 'vitest';
import {
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
});
