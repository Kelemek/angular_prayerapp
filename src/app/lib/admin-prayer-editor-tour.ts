import {
  EMPTY_PRAYER_EDITOR_EDIT_FORM,
  type PrayerEditorEditForm,
  type PrayerEditorPrayer,
} from './admin-prayer-editor-types';

export interface PrayerEditorSectionExpandResult {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
  runInitialSearch: boolean;
}

/** Expand the Prayer Editor panel for a tour when it is collapsed. */
export function expandPrayerEditorSectionForTour(
  sectionExpanded: boolean,
  sectionInitialLoadDone: boolean,
): PrayerEditorSectionExpandResult {
  if (sectionExpanded) {
    return {
      sectionExpanded: true,
      sectionInitialLoadDone,
      runInitialSearch: false,
    };
  }
  return {
    sectionExpanded: true,
    sectionInitialLoadDone: true,
    runInitialSearch: !sectionInitialLoadDone,
  };
}

export function buildPrayerEditorEditFormFromPrayer(
  prayer: PrayerEditorPrayer,
): PrayerEditorEditForm {
  return {
    title: prayer.title,
    description: prayer.description || '',
    requester: prayer.requester,
    email: prayer.email || '',
    prayer_for: prayer.prayer_for || '',
    status: prayer.status,
  };
}

export function prayerEditorExpandedCardsForFirst(
  displayPrayers: PrayerEditorPrayer[],
): Set<string> {
  const first = displayPrayers[0];
  return first ? new Set([first.id]) : new Set<string>();
}

export function prayerEditorFirstDisplayPrayer(
  displayPrayers: PrayerEditorPrayer[],
): PrayerEditorPrayer | undefined {
  return displayPrayers[0];
}

export function emptyPrayerEditorEditForm(): PrayerEditorEditForm {
  return { ...EMPTY_PRAYER_EDITOR_EDIT_FORM };
}

/** Prepare expanded cards + prayer id before the manage tour opens add-update. */
export function prayerEditorManageTourAddUpdatePrep(
  displayPrayers: PrayerEditorPrayer[],
): { prayerId: string; expandedCards: Set<string> } | null {
  const prayer = prayerEditorFirstDisplayPrayer(displayPrayers);
  if (!prayer) {
    return null;
  }
  return { prayerId: prayer.id, expandedCards: new Set([prayer.id]) };
}
