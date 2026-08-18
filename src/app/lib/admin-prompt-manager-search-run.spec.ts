import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminErrorMessage } from './admin-error-message';
import { runPromptManagerSearch } from './admin-prompt-manager-search-run';

vi.mock('./admin-prompt-manager-fetch', () => ({
  searchPrayerPrompts: vi.fn(),
}));

import { searchPrayerPrompts } from './admin-prompt-manager-fetch';

describe('adminErrorMessage', () => {
  it('reads Error.message', () => {
    expect(adminErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back for non-error values', () => {
    expect(adminErrorMessage('x')).toBe('Unknown error');
  });
});

describe('runPromptManagerSearch', () => {
  const supabase = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns prompts on success', async () => {
    const prompts = [{ id: '1' }] as never;
    vi.mocked(searchPrayerPrompts).mockResolvedValueOnce(prompts);

    const outcome = await runPromptManagerSearch(supabase, 'query');

    expect(outcome).toEqual({ ok: true, prompts });
  });
});
