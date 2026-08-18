import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runPrayerTypeConfirmationAction,
  runPrayerTypeDeleteMutation,
} from './admin-prayer-types-confirmation-runner';

vi.mock('./admin-prayer-types-commands', () => ({
  deletePrayerType: vi.fn().mockResolvedValue(undefined),
  reorderPrayerTypes: vi.fn().mockResolvedValue(undefined),
  togglePrayerTypeActive: vi.fn().mockResolvedValue(undefined),
  togglePrayerTypeBooklet: vi.fn().mockResolvedValue(undefined),
}));

import { deletePrayerType } from './admin-prayer-types-commands';

describe('runPrayerTypeConfirmationAction', () => {
  const supabase = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs delete mutation for delete actions', async () => {
    const callbacks = {
      clearMessages: vi.fn(),
      markForCheck: vi.fn(),
      refreshTypes: vi.fn().mockResolvedValue(undefined),
      refreshPrompts: vi.fn().mockResolvedValue(undefined),
      setSuccess: vi.fn(),
      setError: vi.fn(),
    };

    await runPrayerTypeConfirmationAction(
      supabase,
      { kind: 'delete', deleteId: 'type-1' },
      callbacks,
    );

    expect(deletePrayerType).toHaveBeenCalledWith(supabase, 'type-1');
    expect(callbacks.setSuccess).toHaveBeenCalledWith(
      'Prayer type deleted successfully!',
    );
  });

  it('skips delete when deleteId is missing', async () => {
    await runPrayerTypeConfirmationAction(
      supabase,
      { kind: 'delete' },
      {
        clearMessages: vi.fn(),
        markForCheck: vi.fn(),
        refreshTypes: vi.fn(),
        refreshPrompts: vi.fn(),
        setSuccess: vi.fn(),
        setError: vi.fn(),
      },
    );

    expect(deletePrayerType).not.toHaveBeenCalled();
  });
});

describe('runPrayerTypeDeleteMutation', () => {
  const supabase = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes types and prompts after delete', async () => {
    const refreshTypes = vi.fn().mockResolvedValue(undefined);
    const refreshPrompts = vi.fn().mockResolvedValue(undefined);
    const setSuccess = vi.fn();

    await runPrayerTypeDeleteMutation(supabase, 'type-1', {
      clearMessages: vi.fn(),
      markForCheck: vi.fn(),
      refreshTypes,
      refreshPrompts,
      setSuccess,
      setError: vi.fn(),
    });

    expect(deletePrayerType).toHaveBeenCalledWith(supabase, 'type-1');
    expect(setSuccess).toHaveBeenCalledWith('Prayer type deleted successfully!');
    expect(refreshTypes).toHaveBeenCalled();
    expect(refreshPrompts).toHaveBeenCalled();
  });

  it('sets error when delete fails', async () => {
    vi.mocked(deletePrayerType).mockRejectedValueOnce(new Error('denied'));
    const setError = vi.fn();

    await runPrayerTypeDeleteMutation(supabase, 'type-1', {
      clearMessages: vi.fn(),
      markForCheck: vi.fn(),
      refreshTypes: vi.fn(),
      refreshPrompts: vi.fn(),
      setSuccess: vi.fn(),
      setError,
    });

    expect(setError).toHaveBeenCalledWith('denied');
  });
});
