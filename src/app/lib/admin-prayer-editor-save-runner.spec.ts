import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPrayerEditorPrayerSaveAction } from './admin-prayer-editor-save-runner';

vi.mock('./admin-prayer-editor-save-apply', () => ({
  applyPrayerEditorPrayerSave: vi.fn().mockResolvedValue({
    searchResults: [{ id: '1' }],
    allPrayers: [{ id: '1' }],
    toastSuccess: 'Prayer updated successfully',
    needsLoadPageData: true,
    refreshMainSite: true,
    notifyPrayer: { prayerId: '1', title: 'Title' },
  }),
}));

vi.mock('./admin-prayer-editor-commands', () => ({
  validatePrayerEditorEditForm: vi.fn().mockReturnValue(null),
}));

import { applyPrayerEditorPrayerSave } from './admin-prayer-editor-save-apply';
import { validatePrayerEditorEditForm } from './admin-prayer-editor-commands';

describe('runPrayerEditorPrayerSaveAction', () => {
  const client = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips mutation when validation fails', async () => {
    vi.mocked(validatePrayerEditorEditForm).mockReturnValue('Missing title');
    const onValidationError = vi.fn();

    await runPrayerEditorPrayerSaveAction(
      '1',
      {
        searchResults: [],
        allPrayers: [],
        editForm: {
          title: '',
          requester: '',
          email: '',
          description: '',
          prayer_for: '',
          status: 'current',
        },
      },
      {
        getClient: () => client,
        clearError: vi.fn(),
        onValidationError,
        onMutationError: vi.fn(),
        markForCheck: vi.fn(),
        setSaving: vi.fn(),
        applyResult: vi.fn(),
      },
    );

    expect(onValidationError).toHaveBeenCalledWith('Missing title');
    expect(applyPrayerEditorPrayerSave).not.toHaveBeenCalled();
  });

  it('applies save result on success', async () => {
    vi.mocked(validatePrayerEditorEditForm).mockReturnValue(null);
    const applyResult = vi.fn();
    const setSaving = vi.fn();

    await runPrayerEditorPrayerSaveAction(
      '1',
      {
        searchResults: [],
        allPrayers: [],
        editForm: {
          title: 'Title',
          requester: 'A',
          email: 'a@b.com',
          description: 'd',
          prayer_for: 'B',
          status: 'current',
        },
      },
      {
        getClient: () => client,
        clearError: vi.fn(),
        onValidationError: vi.fn(),
        onMutationError: vi.fn(),
        markForCheck: vi.fn(),
        setSaving,
        applyResult,
      },
    );

    expect(applyPrayerEditorPrayerSave).toHaveBeenCalled();
    expect(applyResult).toHaveBeenCalled();
    expect(setSaving).toHaveBeenCalledWith(true);
    expect(setSaving).toHaveBeenCalledWith(false);
  });
});
