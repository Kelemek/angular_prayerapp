import { describe, it, expect } from 'vitest';
import { adminNavTileCount, ADMIN_NAV_TILES } from './admin-nav-tiles';
import type { AdminData } from '../services/admin-data.service';

function stubAdminData(overrides: Partial<AdminData> = {}): AdminData {
  return {
    pendingPrayers: [],
    pendingUpdates: [],
    pendingDeletionRequests: [],
    pendingUpdateDeletionRequests: [],
    pendingAccountRequests: [],
    approvedPrayers: [],
    approvedUpdates: [],
    deniedPrayers: [],
    deniedUpdates: [],
    deniedDeletionRequests: [],
    deniedUpdateDeletionRequests: [],
    approvedPrayersCount: 0,
    approvedUpdatesCount: 0,
    deniedPrayersCount: 0,
    deniedUpdatesCount: 0,
    loading: false,
    error: null,
    ...overrides,
  };
}

describe('admin-nav-tiles', () => {
  it('defines four nav tiles including settings', () => {
    expect(ADMIN_NAV_TILES.map((t) => t.tab)).toEqual(['prayers', 'deletions', 'accounts', 'settings']);
    expect(ADMIN_NAV_TILES.find((t) => t.tab === 'settings')?.kind).toBe('settings');
  });

  it('counts consolidated approvals and deletion queues', () => {
    const data = stubAdminData({
      pendingDeletionRequests: [{ id: 'd1' } as never],
      pendingUpdateDeletionRequests: [{ id: 'u1' } as never],
      pendingAccountRequests: [{ id: 'a1' } as never],
    });
    expect(adminNavTileCount('prayers', data, 3)).toBe(3);
    expect(adminNavTileCount('deletions', data, 0)).toBe(2);
    expect(adminNavTileCount('accounts', data, 0)).toBe(1);
    expect(adminNavTileCount('settings', data, 0)).toBe(0);
  });
});
