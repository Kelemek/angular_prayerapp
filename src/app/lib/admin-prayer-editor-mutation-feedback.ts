import type { PrayerService } from '../services/prayer.service';
import {
  applyPrayerEditorConfirmationResult,
  type PrayerEditorConfirmationApplyResult,
  type PrayerEditorConfirmationListState,
} from './admin-prayer-editor-confirmation-apply';
import { prayerEditorErrorMessage } from './admin-prayer-editor-errors';

export interface PrayerEditorMutationErrorState {
  error: string;
  sectionExpanded: true;
}

export function prayerEditorMutationErrorState(
  err: unknown,
  fallback: string,
): PrayerEditorMutationErrorState {
  return {
    error: prayerEditorErrorMessage(err, fallback),
    sectionExpanded: true,
  };
}

export function refreshPrayerEditorMainSitePrayers(
  prayerService: PrayerService,
): void {
  prayerService.loadPrayers().catch((err: unknown) => {
    console.debug('[PrayerSearch] Refresh after mutation failed:', err);
  });
}

export interface PrayerEditorConfirmationOutcomeCallbacks {
  loadPageData: () => void;
  markForCheck: () => void;
  toastSuccess: (message: string) => void;
  refreshMainSite: () => void;
}

export function finishPrayerEditorConfirmationApply(
  target: PrayerEditorConfirmationListState,
  result: PrayerEditorConfirmationApplyResult,
  callbacks: PrayerEditorConfirmationOutcomeCallbacks,
): void {
  applyPrayerEditorConfirmationResult(target, result);
  if (result.needsLoadPageData) {
    callbacks.loadPageData();
  }
  callbacks.markForCheck();
  if (result.refreshMainSite) {
    callbacks.refreshMainSite();
  }
  callbacks.toastSuccess(result.toastSuccess);
}
