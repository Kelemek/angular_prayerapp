import { describe, it, expect } from 'vitest';
import {
  prayerEditorManageTourAddUpdateState,
  prayerEditorManageTourAfterSearch,
  prayerEditorManageTourEditTarget,
  prayerEditorTourExpandSection,
} from './admin-prayer-editor-tour-actions';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

describe('admin-prayer-editor-tour-actions', () => {
  const prayer = (): PrayerEditorPrayer => ({
    id: 'p1',
    title: 'Pray',
    requester: 'John',
    email: 'j@example.com',
    status: 'current',
    created_at: '2024-01-01',
    description: 'Desc',
  });

  it('expands section for tour', () => {
    expect(
      prayerEditorTourExpandSection({
        sectionExpanded: false,
        sectionInitialLoadDone: false,
      }),
    ).toEqual({
      sectionExpanded: true,
      sectionInitialLoadDone: true,
      runInitialSearch: true,
    });
  });

  it('returns manage tour helpers', () => {
    const p = prayer();
    expect(prayerEditorManageTourAfterSearch([p])).toEqual({
      expandedCards: new Set(['p1']),
      hasPrayers: true,
    });
    expect(prayerEditorManageTourEditTarget([p])?.id).toBe('p1');
    expect(prayerEditorManageTourAddUpdateState([p])).toEqual({
      prayerId: 'p1',
      expandedCards: new Set(['p1']),
    });
    expect(prayerEditorManageTourAddUpdateState([])).toBeNull();
  });
});
