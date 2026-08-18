import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  bootstrapPromptManagerSection,
  runPromptManagerFacadeSearch,
  runPromptManagerFetchPrayerTypes,
} from './admin-prompt-manager-facade-run';

describe('runPromptManagerFacadeSearch', () => {
  it('applies prompts on success', async () => {
    const mockPrompts = [
      { id: '1', title: 'Test', type: 'Prayer', description: 'd', created_at: '2024' },
    ];
    const supabase = {
      directQuery: vi.fn().mockResolvedValue({ data: mockPrompts, error: null }),
    };
    const markForCheck = vi.fn();
    const host = {
      searching: false,
      error: null,
      success: 'old',
      hasSearched: false,
      sectionExpanded: false,
      prompts: [] as never[],
      markForCheck,
    };

    await runPromptManagerFacadeSearch(host, supabase as never, 'test');

    expect(host.prompts).toEqual(mockPrompts);
    expect(host.hasSearched).toBe(true);
    expect(host.error).toBeNull();
    expect(host.success).toBeNull();
    expect(host.searching).toBe(false);
  });

  it('sets error and expands section on failure', async () => {
    const supabase = {
      directQuery: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Search failed'),
      }),
    };
    const host = {
      searching: false,
      error: null,
      success: null,
      hasSearched: false,
      sectionExpanded: false,
      prompts: [] as never[],
      markForCheck: vi.fn(),
    };

    await runPromptManagerFacadeSearch(host, supabase as never, '');

    expect(host.error).toContain('Failed to search prompts');
    expect(host.sectionExpanded).toBe(true);
  });
});

describe('bootstrapPromptManagerSection', () => {
  it('fetches types then searches', async () => {
    const fetchPrayerTypes = vi.fn().mockResolvedValue(undefined);
    const handleSearch = vi.fn().mockResolvedValue(undefined);

    await bootstrapPromptManagerSection(fetchPrayerTypes, handleSearch);

    expect(fetchPrayerTypes).toHaveBeenCalledBefore(handleSearch);
  });
});

describe('runPromptManagerFetchPrayerTypes', () => {
  it('returns types and sets default on panel host', async () => {
    const mockTypes = [
      { name: 'Prayer', display_order: 1, is_active: true },
    ];
    const setDefaultType = vi.fn();
    const supabase = {
      directQuery: vi.fn().mockResolvedValue({ data: mockTypes, error: null }),
    };

    const types = await runPromptManagerFetchPrayerTypes(
      supabase as never,
      setDefaultType,
    );

    expect(types).toEqual(mockTypes);
    expect(setDefaultType).toHaveBeenCalledWith('Prayer');
  });
});
