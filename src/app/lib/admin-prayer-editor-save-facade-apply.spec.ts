import { describe, it, expect, vi } from 'vitest';
import { finishPrayerEditorPrayerSaveApply } from './admin-prayer-editor-save-facade-apply';

describe('finishPrayerEditorPrayerSaveApply', () => {
  it('applies lists, toast, cancel, and notification', () => {
    const target = {
      searchResults: [] as never[],
      allPrayers: [] as never[],
    };
    const cancelEdit = vi.fn();
    const openSendNotificationForPrayer = vi.fn();
    const toastSuccess = vi.fn();
    const loadPageData = vi.fn();
    const refreshMainSite = vi.fn();

    finishPrayerEditorPrayerSaveApply(
      target,
      {
        searchResults: [{ id: '1' }] as never,
        allPrayers: [{ id: '1' }] as never,
        toastSuccess: 'saved',
        needsLoadPageData: true,
        refreshMainSite: true,
        notifyPrayer: { prayerId: '1', title: 'Title' },
      },
      {
        loadPageData,
        toastSuccess,
        refreshMainSite,
        cancelEdit,
        openSendNotificationForPrayer,
      },
    );

    expect(target.searchResults).toEqual([{ id: '1' }]);
    expect(target.allPrayers).toEqual([{ id: '1' }]);
    expect(loadPageData).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith('saved');
    expect(cancelEdit).toHaveBeenCalled();
    expect(openSendNotificationForPrayer).toHaveBeenCalledWith('1', 'Title');
    expect(refreshMainSite).toHaveBeenCalled();
  });
});
