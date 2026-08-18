import { describe, it, expect, vi } from 'vitest';
import { runPrayerEditorConfirmationAction } from './admin-prayer-editor-confirmation-runner';

describe('runPrayerEditorConfirmationAction', () => {
  it('delegates deleteUpdate to executeDeleteUpdate', async () => {
    const executeDeleteUpdate = vi.fn().mockResolvedValue(undefined);
    const setDeleting = vi.fn();
    const clearError = vi.fn();

    await runPrayerEditorConfirmationAction(
      { kind: 'deleteUpdate', prayerId: 'p1', updateId: 'u1' },
      {
        getClient: () => ({}) as never,
        getState: () => ({
          searchResults: [],
          allPrayers: [],
          selectedPrayers: new Set(),
          bulkStatus: '',
          totalItems: 0,
          currentPage: 1,
        }),
        applyConfirmationResult: vi.fn(),
        applyMutationError: vi.fn(),
        clearError,
        setDeleting,
        setUpdatingStatus: vi.fn(),
        executeDeleteUpdate,
      },
    );

    expect(clearError).toHaveBeenCalled();
    expect(setDeleting).toHaveBeenCalledWith(true);
    expect(executeDeleteUpdate).toHaveBeenCalledWith('p1', 'u1');
    expect(setDeleting).toHaveBeenCalledWith(false);
  });

  it('applies mutation error when confirmation dispatch fails', async () => {
    const applyMutationError = vi.fn();
    const executeDeleteUpdate = vi.fn().mockRejectedValue(new Error('delete failed'));

    await runPrayerEditorConfirmationAction(
      { kind: 'deleteUpdate', prayerId: 'p1', updateId: 'u1' },
      {
        getClient: () => ({}) as never,
        getState: () => ({
          searchResults: [],
          allPrayers: [],
          selectedPrayers: new Set(),
          bulkStatus: '',
          totalItems: 0,
          currentPage: 1,
        }),
        applyConfirmationResult: vi.fn(),
        applyMutationError,
        clearError: vi.fn(),
        setDeleting: vi.fn(),
        setUpdatingStatus: vi.fn(),
        executeDeleteUpdate,
      },
    );

    expect(applyMutationError).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to apply confirmation',
    );
  });
});
