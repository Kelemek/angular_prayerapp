import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPromptManagerDeleteMutation } from './admin-prompt-manager-delete-runner';

vi.mock('./admin-prompt-manager-commands', () => ({
  deletePrayerPrompt: vi.fn().mockResolvedValue(undefined),
}));

import { deletePrayerPrompt } from './admin-prompt-manager-commands';

describe('runPromptManagerDeleteMutation', () => {
  const supabase = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears editing state and refreshes after delete', async () => {
    const refreshAfterDelete = vi.fn().mockResolvedValue(undefined);
    const clearEditingIfMatches = vi.fn();
    const notifySaved = vi.fn();
    const toastSuccess = vi.fn();

    await runPromptManagerDeleteMutation(supabase, 'prompt-1', 'Title', {
      clearMessages: vi.fn(),
      markForCheck: vi.fn(),
      setSuccess: vi.fn(),
      setError: vi.fn(),
      toastSuccess,
      toastError: vi.fn(),
      clearEditingIfMatches,
      refreshAfterDelete,
      notifySaved,
    });

    expect(deletePrayerPrompt).toHaveBeenCalledWith(supabase, 'prompt-1');
    expect(clearEditingIfMatches).toHaveBeenCalledWith('prompt-1');
    expect(refreshAfterDelete).toHaveBeenCalled();
    expect(notifySaved).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith('Prompt deleted.');
  });

  it('surfaces errors via setError and toast', async () => {
    vi.mocked(deletePrayerPrompt).mockRejectedValueOnce(new Error('denied'));
    const setError = vi.fn();
    const toastError = vi.fn();

    await runPromptManagerDeleteMutation(supabase, 'prompt-1', 'Title', {
      clearMessages: vi.fn(),
      markForCheck: vi.fn(),
      setSuccess: vi.fn(),
      setError,
      toastSuccess: vi.fn(),
      toastError,
      clearEditingIfMatches: vi.fn(),
      refreshAfterDelete: vi.fn(),
      notifySaved: vi.fn(),
    });

    expect(setError).toHaveBeenCalledWith(
      'Failed to delete prayer prompt: denied',
    );
    expect(toastError).toHaveBeenCalledWith('Could not delete prompt: denied');
  });
});
