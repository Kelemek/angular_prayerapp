import type {
  PrayerEditorDeleteUpdateApplyResult,
  PrayerEditorEditUpdateApplyResult,
  PrayerEditorNewUpdateApplyResult,
  PrayerEditorPrayerSaveApplyResult,
} from './admin-prayer-editor-save-apply';
import type {
  PrayerEditorNewUpdate,
  PrayerEditorPrayer,
} from './admin-prayer-editor-types';

export interface PrayerEditorSaveOutcomeCallbacks {
  loadPageData: () => void;
  toastSuccess: (message: string) => void;
  refreshMainSite: () => void;
}

export function finishPrayerEditorPrayerSaveApply(
  target: {
    searchResults: PrayerEditorPrayer[];
    allPrayers: PrayerEditorPrayer[];
  },
  result: PrayerEditorPrayerSaveApplyResult,
  callbacks: PrayerEditorSaveOutcomeCallbacks & {
    cancelEdit: () => void;
    openSendNotificationForPrayer: (prayerId: string, title: string) => void;
  },
): void {
  target.searchResults = result.searchResults;
  target.allPrayers = result.allPrayers;
  if (result.needsLoadPageData) {
    callbacks.loadPageData();
  }
  callbacks.toastSuccess(result.toastSuccess);
  callbacks.cancelEdit();
  callbacks.openSendNotificationForPrayer(
    result.notifyPrayer.prayerId,
    result.notifyPrayer.title,
  );
  if (result.refreshMainSite) {
    callbacks.refreshMainSite();
  }
}

export function finishPrayerEditorNewUpdateSaveApply(
  target: {
    allPrayers: PrayerEditorPrayer[];
    newUpdate: PrayerEditorNewUpdate;
    addingUpdate: string | null;
  },
  result: PrayerEditorNewUpdateApplyResult,
  callbacks: PrayerEditorSaveOutcomeCallbacks & {
    resetAddUpdateSubscriberPick: () => void;
    openSendNotificationForUpdate: (
      prayerId: string,
      updateId: string,
      title: string,
    ) => void;
  },
): void {
  target.allPrayers = result.allPrayers;
  if (result.needsLoadPageData) {
    callbacks.loadPageData();
  }
  target.newUpdate = result.clearAddUpdate.newUpdate;
  target.addingUpdate = result.clearAddUpdate.addingUpdate;
  callbacks.resetAddUpdateSubscriberPick();
  callbacks.toastSuccess(result.toastSuccess);
  callbacks.openSendNotificationForUpdate(
    result.notifyUpdate.prayerId,
    result.notifyUpdate.updateId,
    result.notifyUpdate.title,
  );
  if (result.refreshMainSite) {
    callbacks.refreshMainSite();
  }
}

export function finishPrayerEditorEditUpdateSaveApply(
  target: {
    allPrayers: PrayerEditorPrayer[];
  },
  result: PrayerEditorEditUpdateApplyResult,
  callbacks: PrayerEditorSaveOutcomeCallbacks & {
    cancelEditUpdate: () => void;
    openSendNotificationForUpdate: (
      prayerId: string,
      updateId: string,
      title: string,
    ) => void;
  },
): void {
  target.allPrayers = result.allPrayers;
  if (result.needsLoadPageData) {
    callbacks.loadPageData();
  }
  callbacks.toastSuccess(result.toastSuccess);
  callbacks.cancelEditUpdate();
  callbacks.openSendNotificationForUpdate(
    result.notifyUpdate.prayerId,
    result.notifyUpdate.updateId,
    result.notifyUpdate.title,
  );
  if (result.refreshMainSite) {
    callbacks.refreshMainSite();
  }
}

export function finishPrayerEditorDeleteUpdateApply(
  target: {
    allPrayers: PrayerEditorPrayer[];
  },
  result: PrayerEditorDeleteUpdateApplyResult,
  callbacks: PrayerEditorSaveOutcomeCallbacks,
): void {
  target.allPrayers = result.allPrayers;
  if (result.needsLoadPageData) {
    callbacks.loadPageData();
  }
  callbacks.toastSuccess(result.toastSuccess);
  if (result.refreshMainSite) {
    callbacks.refreshMainSite();
  }
}
