import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyPrayerEditorDeleteUpdate,
  applyPrayerEditorEditUpdateSave,
  applyPrayerEditorNewUpdateSave,
  applyPrayerEditorPrayerSave,
} from './admin-prayer-editor-save-apply';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';
import { EMPTY_PRAYER_EDITOR_NEW_UPDATE } from './admin-prayer-editor-types';

vi.mock('./admin-prayer-editor-mutations', () => ({
  mutatePrayerEditorPrayerSave: vi.fn().mockResolvedValue({
    searchResults: [{ id: '1' }],
    allPrayers: [{ id: '1' }],
  }),
  mutatePrayerEditorInsertUpdate: vi.fn().mockResolvedValue({
    allPrayers: [{ id: '1' }],
    inserted: { id: 'upd-1' },
    prayerTitle: 'Prayer title',
  }),
  mutatePrayerEditorEditUpdateSave: vi.fn().mockResolvedValue({
    allPrayers: [{ id: '1' }],
    prayerTitle: 'Updated title',
  }),
  mutatePrayerEditorDeleteUpdate: vi.fn().mockResolvedValue([{ id: '1' }]),
}));

const prayer = { id: '1' } as PrayerEditorPrayer;

describe('admin-prayer-editor-save-apply', () => {
  const client = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applyPrayerEditorPrayerSave returns toast and notify payload', async () => {
    const result = await applyPrayerEditorPrayerSave(
      client,
      [prayer],
      [prayer],
      '1',
      {
        title: 'Title',
        requester: 'A',
        email: 'a@b.com',
        description: 'd',
        prayer_for: 'B',
        status: 'current',
      },
    );

    expect(result.toastSuccess).toBe('Prayer updated successfully');
    expect(result.notifyPrayer).toEqual({ prayerId: '1', title: 'Title' });
    expect(result.refreshMainSite).toBe(true);
  });

  it('applyPrayerEditorNewUpdateSave clears add-update state', async () => {
    const result = await applyPrayerEditorNewUpdateSave(
      client,
      [prayer],
      '1',
      EMPTY_PRAYER_EDITOR_NEW_UPDATE,
    );

    expect(result.toastSuccess).toBe('Update added successfully');
    expect(result.clearAddUpdate.addingUpdate).toBeNull();
    expect(result.notifyUpdate.updateId).toBe('upd-1');
  });

  it('applyPrayerEditorEditUpdateSave returns notify payload', async () => {
    const result = await applyPrayerEditorEditUpdateSave(
      client,
      [prayer],
      '1',
      'upd-1',
      {
        title: 'T',
        description: 'D',
        prayer_for: 'P',
        status: 'current',
      },
    );

    expect(result.toastSuccess).toBe('Update saved successfully');
    expect(result.notifyUpdate).toEqual({
      prayerId: '1',
      updateId: 'upd-1',
      title: 'Updated title',
    });
  });

  it('applyPrayerEditorDeleteUpdate returns toast message', async () => {
    const result = await applyPrayerEditorDeleteUpdate(
      client,
      [prayer],
      '1',
      'upd-1',
    );

    expect(result.toastSuccess).toBe('Update deleted successfully');
    expect(result.allPrayers).toEqual([{ id: '1' }]);
  });
});
