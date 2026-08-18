import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPrayerTypesTourInitialState } from './admin-prayer-types-facade-tour';

describe('runPrayerTypesTourInitialState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes form and fetches when section was collapsed', async () => {
    const host = {
      sectionExpanded: false,
      sectionInitialLoadDone: false,
      markForCheck: vi.fn(),
      closeTypeForm: vi.fn(),
      fetchTypes: vi.fn().mockResolvedValue(undefined),
    };

    await runPrayerTypesTourInitialState(host);

    expect(host.closeTypeForm).toHaveBeenCalled();
    expect(host.sectionExpanded).toBe(true);
    expect(host.sectionInitialLoadDone).toBe(true);
    expect(host.fetchTypes).toHaveBeenCalled();
    expect(host.markForCheck).toHaveBeenCalled();
  });

  it('skips fetch when section already loaded', async () => {
    const host = {
      sectionExpanded: true,
      sectionInitialLoadDone: true,
      markForCheck: vi.fn(),
      closeTypeForm: vi.fn(),
      fetchTypes: vi.fn().mockResolvedValue(undefined),
    };

    await runPrayerTypesTourInitialState(host);

    expect(host.fetchTypes).not.toHaveBeenCalled();
    expect(host.markForCheck).toHaveBeenCalled();
  });
});
