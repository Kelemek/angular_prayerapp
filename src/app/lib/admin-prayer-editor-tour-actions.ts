import type { PrayerEditorPrayer } from './admin-prayer-editor-types';
import {
  expandPrayerEditorSectionForTour,
  prayerEditorExpandedCardsForFirst,
  prayerEditorFirstDisplayPrayer,
  prayerEditorManageTourAddUpdatePrep as buildManageTourAddUpdatePrep,
} from './admin-prayer-editor-tour';

export interface PrayerEditorSectionGate {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
}

export function prayerEditorTourExpandSection(
  gate: PrayerEditorSectionGate,
): PrayerEditorSectionGate & { runInitialSearch: boolean } {
  const expand = expandPrayerEditorSectionForTour(
    gate.sectionExpanded,
    gate.sectionInitialLoadDone,
  );
  return {
    sectionExpanded: expand.sectionExpanded,
    sectionInitialLoadDone: expand.sectionInitialLoadDone,
    runInitialSearch: expand.runInitialSearch,
  };
}

export function prayerEditorManageTourAfterSearch(
  displayPrayers: PrayerEditorPrayer[],
): {
  expandedCards: Set<string>;
  hasPrayers: boolean;
} {
  return {
    expandedCards: prayerEditorExpandedCardsForFirst(displayPrayers),
    hasPrayers: displayPrayers.length > 0,
  };
}

export function prayerEditorManageTourEditTarget(
  displayPrayers: PrayerEditorPrayer[],
): PrayerEditorPrayer | undefined {
  return prayerEditorFirstDisplayPrayer(displayPrayers);
}

export function prayerEditorManageTourAddUpdateState(
  displayPrayers: PrayerEditorPrayer[],
): { prayerId: string; expandedCards: Set<string> } | null {
  return buildManageTourAddUpdatePrep(displayPrayers);
}

export function prayerEditorManageTourSectionExpand(
  gate: PrayerEditorSectionGate,
): PrayerEditorSectionGate & { runInitialSearch: boolean } {
  return prayerEditorTourExpandSection(gate);
}

export interface PrayerEditorManageTourAddUpdateOpenPrep {
  prep: { prayerId: string; expandedCards: Set<string> } | null;
  shouldCancelEdit: boolean;
  shouldCancelEditUpdate: boolean;
}

export function prayerEditorManageTourAddUpdateOpenPrep(
  displayPrayers: PrayerEditorPrayer[],
): PrayerEditorManageTourAddUpdateOpenPrep {
  return {
    prep: prayerEditorManageTourAddUpdateState(displayPrayers),
    shouldCancelEdit: true,
    shouldCancelEditUpdate: true,
  };
}
