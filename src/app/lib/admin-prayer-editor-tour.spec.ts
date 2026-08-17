import { describe, it, expect } from 'vitest';
import {
  buildPrayerEditorEditFormFromPrayer,
  expandPrayerEditorSectionForTour,
  prayerEditorExpandedCardsForFirst,
  prayerEditorFirstDisplayPrayer,
  prayerEditorManageTourAddUpdatePrep,
} from './admin-prayer-editor-tour';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

describe('admin-prayer-editor-tour', () => {
  const prayer = (): PrayerEditorPrayer => ({
    id: 'p1',
    title: 'Pray',
    requester: 'John',
    email: 'j@example.com',
    status: 'current',
    created_at: '2024-01-01',
    description: 'Desc',
    prayer_for: 'Jane',
  });

  it('expands section and flags initial search', () => {
    expect(expandPrayerEditorSectionForTour(false, false)).toEqual({
      sectionExpanded: true,
      sectionInitialLoadDone: true,
      runInitialSearch: true,
    });
    expect(expandPrayerEditorSectionForTour(true, true)).toEqual({
      sectionExpanded: true,
      sectionInitialLoadDone: true,
      runInitialSearch: false,
    });
  });

  it('builds edit form and first-card helpers', () => {
    const p = prayer();
    expect(buildPrayerEditorEditFormFromPrayer(p).title).toBe('Pray');
    expect(prayerEditorFirstDisplayPrayer([p])?.id).toBe('p1');
    expect(prayerEditorExpandedCardsForFirst([p])).toEqual(new Set(['p1']));
    expect(prayerEditorExpandedCardsForFirst([])).toEqual(new Set());
  });

  it('prepares manage tour add-update state', () => {
    const p = prayer();
    expect(prayerEditorManageTourAddUpdatePrep([p])).toEqual({
      prayerId: 'p1',
      expandedCards: new Set(['p1']),
    });
    expect(prayerEditorManageTourAddUpdatePrep([])).toBeNull();
  });
});
