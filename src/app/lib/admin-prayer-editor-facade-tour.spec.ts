import { describe, it, expect, vi } from 'vitest';
import {
  runPrayerEditorOverviewTourInitialState,
  runPrayerEditorManageTourOpenEdit,
} from './admin-prayer-editor-facade-tour';

describe('runPrayerEditorOverviewTourInitialState', () => {
  it('expands section and runs initial search when needed', () => {
    const handleSearch = vi.fn().mockResolvedValue(undefined);
    const cancelCreatePrayer = vi.fn();
    const markForCheck = vi.fn();
    const host = {
      sectionExpanded: false,
      sectionInitialLoadDone: false,
      markForCheck,
      handleSearch,
      cancelCreatePrayer,
    };

    runPrayerEditorOverviewTourInitialState(host);

    expect(host.sectionExpanded).toBe(true);
    expect(host.sectionInitialLoadDone).toBe(true);
    expect(handleSearch).toHaveBeenCalled();
    expect(cancelCreatePrayer).toHaveBeenCalled();
    expect(markForCheck).toHaveBeenCalled();
  });
});

describe('runPrayerEditorManageTourOpenEdit', () => {
  it('starts edit for first display prayer', () => {
    const prayer = { id: 'p-1', title: 'Title' } as never;
    const startEditPrayer = vi.fn();
    const markForCheck = vi.fn();

    runPrayerEditorManageTourOpenEdit({
      displayPrayers: [prayer],
      startEditPrayer,
      markForCheck,
    });

    expect(startEditPrayer).toHaveBeenCalledWith(prayer);
    expect(markForCheck).toHaveBeenCalled();
  });
});
