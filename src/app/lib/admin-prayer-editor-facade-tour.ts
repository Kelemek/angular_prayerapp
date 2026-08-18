import type { PrayerEditorPrayer } from './admin-prayer-editor-types';
import {
  prayerEditorManageTourAddUpdateOpenPrep,
  prayerEditorManageTourEditTarget,
  prayerEditorManageTourInitialPrep,
  prayerEditorTourExpandSection,
} from './admin-prayer-editor-tour-actions';

export interface PrayerEditorTourSectionGateHost {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
}

export interface PrayerEditorOverviewTourHost extends PrayerEditorTourSectionGateHost {
  markForCheck: () => void;
  handleSearch: () => Promise<void>;
  cancelCreatePrayer: () => void;
}

export interface PrayerEditorManageTourHost extends PrayerEditorTourSectionGateHost {
  displayPrayers: PrayerEditorPrayer[];
  expandedCards: Set<string>;
  markForCheck: () => void;
  handleSearch: () => Promise<void>;
  cancelCreatePrayer: () => void;
  cancelEdit: () => void;
  cancelAddUpdate: () => void;
  cancelEditUpdate: () => void;
  startEditPrayer: (prayer: PrayerEditorPrayer) => void;
  startAddUpdate: (prayerId: string) => void;
  startCreatePrayer: () => void;
}

export function runPrayerEditorOverviewTourInitialState(
  host: PrayerEditorOverviewTourHost,
): void {
  const expand = prayerEditorTourExpandSection({
    sectionExpanded: host.sectionExpanded,
    sectionInitialLoadDone: host.sectionInitialLoadDone,
  });
  host.sectionExpanded = expand.sectionExpanded;
  host.sectionInitialLoadDone = expand.sectionInitialLoadDone;
  if (expand.runInitialSearch) {
    void host.handleSearch();
  }
  host.cancelCreatePrayer();
  host.markForCheck();
}

export async function runPrayerEditorManageTourInitialState(
  host: PrayerEditorManageTourHost,
): Promise<boolean> {
  const prep = await prayerEditorManageTourInitialPrep(
    {
      sectionExpanded: host.sectionExpanded,
      sectionInitialLoadDone: host.sectionInitialLoadDone,
    },
    host.displayPrayers,
    () => host.handleSearch(),
  );
  host.sectionExpanded = prep.gate.sectionExpanded;
  host.sectionInitialLoadDone = prep.gate.sectionInitialLoadDone;
  host.cancelCreatePrayer();
  host.cancelEdit();
  host.cancelAddUpdate();
  host.cancelEditUpdate();
  host.expandedCards = prep.expandedCards;
  host.markForCheck();
  return prep.hasPrayers;
}

export function runPrayerEditorManageTourOpenEdit(
  host: Pick<PrayerEditorManageTourHost, 'displayPrayers' | 'markForCheck' | 'startEditPrayer'>,
): void {
  const prayer = prayerEditorManageTourEditTarget(host.displayPrayers);
  if (prayer) {
    host.startEditPrayer(prayer);
  }
  host.markForCheck();
}

export function runPrayerEditorManageTourOpenAddUpdate(
  host: Pick<
    PrayerEditorManageTourHost,
    | 'displayPrayers'
    | 'expandedCards'
    | 'markForCheck'
    | 'cancelEdit'
    | 'cancelEditUpdate'
    | 'startAddUpdate'
  >,
): void {
  const open = prayerEditorManageTourAddUpdateOpenPrep(host.displayPrayers);
  if (!open.prep) {
    return;
  }
  if (open.shouldCancelEdit) {
    host.cancelEdit();
  }
  if (open.shouldCancelEditUpdate) {
    host.cancelEditUpdate();
  }
  host.expandedCards = open.prep.expandedCards;
  host.startAddUpdate(open.prep.prayerId);
  host.markForCheck();
}

export function runPrayerEditorManageTourResetUi(
  host: Pick<PrayerEditorManageTourHost, 'markForCheck' | 'cancelEdit' | 'cancelAddUpdate'>,
): void {
  host.cancelEdit();
  host.cancelAddUpdate();
  host.markForCheck();
}

export function runPrayerEditorCreateTourOpenForm(
  host: Pick<PrayerEditorManageTourHost, 'markForCheck' | 'startCreatePrayer'>,
): void {
  host.startCreatePrayer();
  host.markForCheck();
}

export function runPrayerEditorTourCancelEdit(
  host: Pick<PrayerEditorManageTourHost, 'markForCheck' | 'cancelEdit'>,
): void {
  host.cancelEdit();
  host.markForCheck();
}

export function runPrayerEditorTourCancelAddUpdate(
  host: Pick<PrayerEditorManageTourHost, 'markForCheck' | 'cancelAddUpdate'>,
): void {
  host.cancelAddUpdate();
  host.markForCheck();
}
