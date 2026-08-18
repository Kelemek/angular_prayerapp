import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildPrayerTypesFacadeMutationCallbacks,
  runPrayerTypesFacadeFetch,
} from './admin-prayer-types-facade-run';

describe('runPrayerTypesFacadeFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('applies successful fetch results', async () => {
    const mockTypes = [{ id: '1', name: 'Healing' }] as never[];
    const host = {
      types: [] as never[],
      loading: false,
      error: null,
      sectionExpanded: false,
      markForCheck: vi.fn(),
    };
    const supabase = {
      directQuery: vi.fn().mockResolvedValue({ data: mockTypes, error: null }),
    };

    await runPrayerTypesFacadeFetch(host, supabase as never);

    expect(host.types).toEqual(mockTypes);
    expect(host.loading).toBe(false);
    expect(host.error).toBeNull();
    expect(host.markForCheck).toHaveBeenCalled();
  });

  it('sets error and expands section on failure', async () => {
    const host = {
      types: [] as never[],
      loading: false,
      error: null,
      sectionExpanded: false,
      markForCheck: vi.fn(),
    };
    const supabase = {
      directQuery: vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Fetch failed') }),
    };

    await runPrayerTypesFacadeFetch(host, supabase as never);

    expect(host.error).toBe('Fetch failed');
    expect(host.sectionExpanded).toBe(true);
    expect(host.types).toEqual([]);
  });
});

describe('buildPrayerTypesFacadeMutationCallbacks', () => {
  it('mutates host error and success fields', () => {
    const host = {
      error: 'old',
      success: 'old',
      markForCheck: vi.fn(),
      fetchTypes: vi.fn().mockResolvedValue(undefined),
      promptService: { loadPrompts: vi.fn() },
      toast: { error: vi.fn() },
    };

    const callbacks = buildPrayerTypesFacadeMutationCallbacks(host as never);

    callbacks.clearMessages();
    expect(host.error).toBeNull();
    expect(host.success).toBeNull();

    callbacks.setSuccess('ok');
    expect(host.success).toBe('ok');

    callbacks.setError('bad');
    expect(host.error).toBe('bad');
  });
});
