import { describe, it, expect } from 'vitest';
import {
  prayerEditorAllDisplaySelected,
  prayerEditorCancelAddUpdateState,
  prayerEditorStartEditState,
  prayerEditorToggleSetMember,
} from './admin-prayer-editor-ui-state';

describe('admin-prayer-editor-ui-state', () => {
  it('toggles set members and select-all', () => {
    expect(prayerEditorToggleSetMember(new Set(['a']), 'b')).toEqual(
      new Set(['a', 'b']),
    );
    expect(
      prayerEditorAllDisplaySelected(
        [{ id: '1', title: 't', requester: 'r', email: null, status: 'current', created_at: 'x' }],
        new Set(['1']),
      ),
    ).toBe(true);
  });

  it('builds edit and add-update state', () => {
    const prayer = {
      id: 'p1',
      title: 'T',
      requester: 'R',
      email: null,
      status: 'current',
      created_at: '2024-01-01',
    };
    const edit = prayerEditorStartEditState(prayer, new Set());
    expect(edit.editingPrayer).toBe('p1');
    expect(prayerEditorCancelAddUpdateState().addingUpdate).toBeNull();
  });
});
