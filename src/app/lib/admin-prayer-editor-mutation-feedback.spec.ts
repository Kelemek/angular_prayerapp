import { describe, it, expect, vi } from 'vitest';
import {
  finishPrayerEditorConfirmationApply,
  prayerEditorMutationErrorState,
} from './admin-prayer-editor-mutation-feedback';
import type { PrayerEditorConfirmationApplyResult } from './admin-prayer-editor-confirmation-apply';

describe('prayerEditorMutationErrorState', () => {
  it('normalizes Error messages', () => {
    expect(prayerEditorMutationErrorState(new Error('boom'), 'fallback')).toEqual({
      error: 'boom',
      sectionExpanded: true,
    });
  });

  it('uses fallback for non-Error values', () => {
    expect(prayerEditorMutationErrorState('x', 'fallback')).toEqual({
      error: 'fallback',
      sectionExpanded: true,
    });
  });
});

describe('finishPrayerEditorConfirmationApply', () => {
  it('applies list state and runs callbacks', () => {
    const target = {
      searchResults: [],
      allPrayers: [],
      selectedPrayers: new Set<string>(),
      bulkStatus: '',
      totalItems: 0,
      currentPage: 1,
    };
    const result: PrayerEditorConfirmationApplyResult = {
      searchResults: [{ id: '1' } as never],
      allPrayers: [{ id: '1' } as never],
      selectedPrayers: new Set(),
      bulkStatus: 'current',
      totalItems: 1,
      currentPage: 1,
      toastSuccess: 'done',
      needsLoadPageData: true,
      refreshMainSite: true,
    };
    const loadPageData = vi.fn();
    const markForCheck = vi.fn();
    const toastSuccess = vi.fn();
    const refreshMainSite = vi.fn();

    finishPrayerEditorConfirmationApply(target, result, {
      loadPageData,
      markForCheck,
      toastSuccess,
      refreshMainSite,
    });

    expect(target.totalItems).toBe(1);
    expect(loadPageData).toHaveBeenCalled();
    expect(markForCheck).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith('done');
    expect(refreshMainSite).toHaveBeenCalled();
  });
});
