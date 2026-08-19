import { describe, expect, it, vi } from 'vitest';
import { buildPrayerCatalogRealtimeHandlers } from './prayer-service-realtime-handlers';

describe('prayer-service-realtime-handlers', () => {
  it('reloads community prayers on prayer table change', async () => {
    const reloadCommunityPrayers = vi.fn().mockResolvedValue(undefined);
    const handlers = buildPrayerCatalogRealtimeHandlers({
      reloadCommunityPrayers,
      reloadPersonalPrayers: vi.fn(),
    });

    handlers.onPrayersChange({
      eventType: 'INSERT',
      old: {},
      new: { id: 'p1', status: 'current' },
    });

    await Promise.resolve();
    expect(reloadCommunityPrayers).toHaveBeenCalled();
  });

  it('skips personal reload for display-order-only updates', () => {
    const reloadPersonalPrayers = vi.fn().mockResolvedValue(undefined);
    const handlers = buildPrayerCatalogRealtimeHandlers({
      reloadCommunityPrayers: vi.fn(),
      reloadPersonalPrayers,
    });

    handlers.onPersonalPrayersChange({
      eventType: 'UPDATE',
      old: { id: 'p1', display_order: 1, title: 't' },
      new: { id: 'p1', display_order: 2, title: 't' },
    });

    expect(reloadPersonalPrayers).not.toHaveBeenCalled();
  });
});
