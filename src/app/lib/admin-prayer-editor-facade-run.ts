import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { PrayerService } from '../services/prayer.service';
import type { PrayerEditorConfirmationAction } from './admin-prayer-editor-confirmations';
import type { PrayerEditorConfirmationApplyResult } from './admin-prayer-editor-confirmation-apply';
import type {
  PrayerEditorEditForm,
  PrayerEditorEditUpdateForm,
  PrayerEditorNewUpdate,
  PrayerEditorPrayer,
} from './admin-prayer-editor-types';
import {
  finishPrayerEditorDeleteUpdateApply,
  finishPrayerEditorEditUpdateSaveApply,
  finishPrayerEditorNewUpdateSaveApply,
  finishPrayerEditorPrayerSaveApply,
} from './admin-prayer-editor-save-facade-apply';
import {
  runPrayerEditorDeleteUpdateAction,
  runPrayerEditorEditUpdateSaveAction,
  runPrayerEditorNewUpdateSaveAction,
  runPrayerEditorPrayerSaveAction,
} from './admin-prayer-editor-save-runner';
import type { PrayerEditorDialogsHostRef } from './admin-prayer-editor-facade-host';
import { runPrayerEditorSearchWithOutcome } from './admin-prayer-editor-search-orchestration';
import {
  finishPrayerEditorConfirmationApply,
  prayerEditorMutationErrorState,
  refreshPrayerEditorMainSitePrayers,
} from './admin-prayer-editor-mutation-feedback';
import { runPrayerEditorConfirmationAction } from './admin-prayer-editor-confirmation-runner';
import { prayerEditorClearListState } from './admin-prayer-editor-ui-state';

export interface PrayerEditorFacadeErrorTarget {
  error: string | null;
  sectionExpanded: boolean;
}

export interface PrayerEditorFacadeDepsHost {
  supabaseService: SupabaseService;
  toast: ToastService;
  prayerService: PrayerService;
  markForCheck: () => void;
}

export function applyPrayerEditorFacadeMutationError(
  target: PrayerEditorFacadeErrorTarget,
  toast: ToastService,
  err: unknown,
  fallback: string,
): void {
  const feedback = prayerEditorMutationErrorState(err, fallback);
  target.error = feedback.error;
  target.sectionExpanded = feedback.sectionExpanded;
  toast.error(feedback.error);
}

export function applyPrayerEditorFacadeValidationError(
  target: PrayerEditorFacadeErrorTarget,
  toast: ToastService,
  message: string,
): void {
  target.error = message;
  target.sectionExpanded = true;
  toast.error(message);
}

export interface PrayerEditorFacadeSearchHost extends PrayerEditorFacadeErrorTarget {
  supabaseService: SupabaseService;
  toast: ToastService;
  searchTerm: string;
  statusFilter: string;
  approvalFilter: string;
  mainSearchResultLimit: number;
  allPrayers: PrayerEditorPrayer[];
  totalItems: number;
  currentPage: number;
  selectedPrayers: Set<string>;
  searching: boolean;
  markForCheck: () => void;
}

export async function runPrayerEditorFacadeSearch(
  host: PrayerEditorFacadeSearchHost,
  loadPageData: () => void,
): Promise<void> {
  try {
    host.searching = true;
    host.error = null;
    host.selectedPrayers = new Set();
    host.markForCheck();

    const outcome = await runPrayerEditorSearchWithOutcome({
      supabaseUrl: host.supabaseService.getSupabaseUrl(),
      supabaseKey: host.supabaseService.getSupabaseKey(),
      searchTerm: host.searchTerm,
      statusFilter: host.statusFilter,
      approvalFilter: host.approvalFilter,
      resultLimit: host.mainSearchResultLimit,
    });

    if (outcome.ok) {
      host.allPrayers = outcome.allPrayers;
      host.totalItems = outcome.totalItems;
      host.currentPage = outcome.currentPage;
      loadPageData();
    } else {
      applyPrayerEditorFacadeMutationError(
        host,
        host.toast,
        outcome.error,
        'Failed to search prayers',
      );
    }
    host.markForCheck();
  } catch (err: unknown) {
    console.error('Error searching prayers:', err);
    applyPrayerEditorFacadeMutationError(
      host,
      host.toast,
      err,
      'Failed to search prayers',
    );
  } finally {
    host.searching = false;
    host.markForCheck();
  }
}

export function buildPrayerEditorFacadeSaveRunnerCallbacks(
  deps: PrayerEditorFacadeDepsHost,
  target: PrayerEditorFacadeErrorTarget,
): {
  getClient: () => ReturnType<SupabaseService['getClient']>;
  clearError: () => void;
  onValidationError: (message: string) => void;
  onMutationError: (err: unknown, fallback: string) => void;
  markForCheck: () => void;
} {
  return {
    getClient: () => deps.supabaseService.getClient(),
    clearError: () => {
      target.error = null;
    },
    onValidationError: (message) =>
      applyPrayerEditorFacadeValidationError(target, deps.toast, message),
    onMutationError: (err, fallback) =>
      applyPrayerEditorFacadeMutationError(target, deps.toast, err, fallback),
    markForCheck: () => deps.markForCheck(),
  };
}

export function buildPrayerEditorFacadeSaveOutcomeCallbacks(
  deps: PrayerEditorFacadeDepsHost,
  loadPageData: () => void,
): {
  loadPageData: () => void;
  toastSuccess: (message: string) => void;
  refreshMainSite: () => void;
} {
  return {
    loadPageData,
    toastSuccess: (message: string) => deps.toast.success(message),
    refreshMainSite: () => void deps.prayerService.loadPrayers(),
  };
}

export interface PrayerEditorFacadeConfirmationHost
  extends PrayerEditorFacadeErrorTarget {
  supabaseService: SupabaseService;
  toast: ToastService;
  prayerService: PrayerService;
  markForCheck: () => void;
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  selectedPrayers: Set<string>;
  bulkStatus: string;
  totalItems: number;
  currentPage: number;
  deleting: boolean;
  updatingStatus: boolean;
}

export async function runPrayerEditorFacadeConfirmation(
  host: PrayerEditorFacadeConfirmationHost,
  action: PrayerEditorConfirmationAction,
  callbacks: {
    loadPageData: () => void;
    executeDeleteUpdate: (prayerId: string, updateId: string) => Promise<void>;
  },
): Promise<void> {
  await runPrayerEditorConfirmationAction(action, {
    getClient: () => host.supabaseService.getClient(),
    getState: () => ({
      searchResults: host.searchResults,
      allPrayers: host.allPrayers,
      selectedPrayers: host.selectedPrayers,
      bulkStatus: host.bulkStatus,
      totalItems: host.totalItems,
      currentPage: host.currentPage,
    }),
    applyConfirmationResult: (result: PrayerEditorConfirmationApplyResult) => {
      finishPrayerEditorConfirmationApply(host, result, {
        loadPageData: callbacks.loadPageData,
        markForCheck: () => host.markForCheck(),
        toastSuccess: (message) => host.toast.success(message),
        refreshMainSite: () => refreshPrayerEditorMainSitePrayers(host.prayerService),
      });
    },
    applyMutationError: (err, fallback) =>
      applyPrayerEditorFacadeMutationError(host, host.toast, err, fallback),
    clearError: () => {
      host.error = null;
    },
    setDeleting: (value) => {
      host.deleting = value;
    },
    setUpdatingStatus: (value) => {
      host.updatingStatus = value;
    },
    executeDeleteUpdate: callbacks.executeDeleteUpdate,
  });
  host.markForCheck();
}

export interface PrayerEditorFacadeSaveHost
  extends PrayerEditorFacadeDepsHost,
    PrayerEditorFacadeErrorTarget {
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  editForm: PrayerEditorEditForm;
  newUpdate: PrayerEditorNewUpdate;
  editUpdateForm: PrayerEditorEditUpdateForm;
  addingUpdate: string | null;
  saving: boolean;
  savingUpdate: boolean;
  savingEditUpdate: boolean;
  loadPageData: () => void;
  cancelEdit: () => void;
  cancelEditUpdate: () => void;
  resetAddUpdateSubscriberPick: () => void;
  dialogsRef?: PrayerEditorDialogsHostRef;
}

export async function runPrayerEditorFacadePrayerSave(
  host: PrayerEditorFacadeSaveHost,
  prayerId: string,
): Promise<void> {
  await runPrayerEditorPrayerSaveAction(
    prayerId,
    {
      searchResults: host.searchResults,
      allPrayers: host.allPrayers,
      editForm: host.editForm,
    },
    {
      ...buildPrayerEditorFacadeSaveRunnerCallbacks(host, host),
      setSaving: (value) => {
        host.saving = value;
      },
      applyResult: (result) => {
        finishPrayerEditorPrayerSaveApply(host, result, {
          ...buildPrayerEditorFacadeSaveOutcomeCallbacks(host, () => host.loadPageData()),
          cancelEdit: () => host.cancelEdit(),
          openSendNotificationForPrayer: (id, title) =>
            host.dialogsRef?.openSendNotificationForPrayer(id, title),
        });
      },
    },
  );
}

export async function runPrayerEditorFacadeNewUpdateSave(
  host: PrayerEditorFacadeSaveHost,
  prayerId: string,
): Promise<void> {
  await runPrayerEditorNewUpdateSaveAction(
    prayerId,
    {
      allPrayers: host.allPrayers,
      newUpdate: host.newUpdate,
    },
    {
      ...buildPrayerEditorFacadeSaveRunnerCallbacks(host, host),
      setSavingUpdate: (value) => {
        host.savingUpdate = value;
      },
      applyResult: (result) => {
        finishPrayerEditorNewUpdateSaveApply(host, result, {
          ...buildPrayerEditorFacadeSaveOutcomeCallbacks(host, () => host.loadPageData()),
          resetAddUpdateSubscriberPick: () => host.resetAddUpdateSubscriberPick(),
          openSendNotificationForUpdate: (id, updateId, title) =>
            host.dialogsRef?.openSendNotificationForUpdate(id, updateId, title),
        });
      },
    },
  );
}

export async function runPrayerEditorFacadeEditUpdateSave(
  host: PrayerEditorFacadeSaveHost,
  prayerId: string,
  updateId: string,
): Promise<void> {
  await runPrayerEditorEditUpdateSaveAction(
    prayerId,
    updateId,
    {
      allPrayers: host.allPrayers,
      editUpdateForm: host.editUpdateForm,
    },
    {
      ...buildPrayerEditorFacadeSaveRunnerCallbacks(host, host),
      setSavingEditUpdate: (value) => {
        host.savingEditUpdate = value;
      },
      applyResult: (result) => {
        finishPrayerEditorEditUpdateSaveApply(host, result, {
          ...buildPrayerEditorFacadeSaveOutcomeCallbacks(host, () => host.loadPageData()),
          cancelEditUpdate: () => host.cancelEditUpdate(),
          openSendNotificationForUpdate: (id, updId, title) =>
            host.dialogsRef?.openSendNotificationForUpdate(id, updId, title),
        });
      },
    },
  );
}

export async function runPrayerEditorFacadeDeleteUpdateSave(
  host: PrayerEditorFacadeSaveHost,
  prayerId: string,
  updateId: string,
): Promise<void> {
  await runPrayerEditorDeleteUpdateAction(
    prayerId,
    updateId,
    { allPrayers: host.allPrayers },
    {
      ...buildPrayerEditorFacadeSaveRunnerCallbacks(host, host),
      applyResult: (result) => {
        finishPrayerEditorDeleteUpdateApply(host, result, {
          ...buildPrayerEditorFacadeSaveOutcomeCallbacks(host, () => host.loadPageData()),
          refreshMainSite: () => void host.prayerService.loadPrayers(),
        });
      },
    },
  );
}

export interface PrayerEditorFacadeClearSearchHost {
  searchTerm: string;
  allPrayers: PrayerEditorPrayer[];
  displayPrayers: PrayerEditorPrayer[];
  selectedPrayers: Set<string>;
  error: string | null;
  currentPage: number;
  totalItems: number;
  handleSearch: () => Promise<void>;
}

export function runPrayerEditorFacadeClearSearch(
  host: PrayerEditorFacadeClearSearchHost,
  clearDebouncer: () => void,
): void {
  clearDebouncer();
  const cleared = prayerEditorClearListState();
  host.searchTerm = '';
  host.allPrayers = cleared.allPrayers;
  host.displayPrayers = cleared.displayPrayers;
  host.selectedPrayers = cleared.selectedPrayers;
  host.error = null;
  host.currentPage = cleared.currentPage;
  host.totalItems = cleared.totalItems;
  void host.handleSearch();
}
