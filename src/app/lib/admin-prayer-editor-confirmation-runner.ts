import type { SupabaseClient } from '@supabase/supabase-js';
import type { PrayerEditorConfirmationAction } from './admin-prayer-editor-confirmations';
import {
  applyPrayerEditorBulkDeleteConfirmation,
  applyPrayerEditorBulkStatusConfirmation,
  applyPrayerEditorSingleDeleteConfirmation,
  prayerEditorConfirmationListState,
  type PrayerEditorConfirmationApplyResult,
} from './admin-prayer-editor-confirmation-apply';
import { dispatchPrayerEditorConfirmation } from './admin-prayer-editor-confirmation-dispatch';

export interface PrayerEditorConfirmationRunnerState {
  searchResults: Parameters<typeof prayerEditorConfirmationListState>[0]['searchResults'];
  allPrayers: Parameters<typeof prayerEditorConfirmationListState>[0]['allPrayers'];
  selectedPrayers: Set<string>;
  bulkStatus: string;
  totalItems: number;
  currentPage: number;
}

export interface PrayerEditorConfirmationRunnerCallbacks {
  getClient: () => SupabaseClient;
  getState: () => PrayerEditorConfirmationRunnerState;
  applyConfirmationResult: (result: PrayerEditorConfirmationApplyResult) => void;
  applyMutationError: (err: unknown, fallback: string) => void;
  clearError: () => void;
  setDeleting: (value: boolean) => void;
  setUpdatingStatus: (value: boolean) => void;
  executeDeleteUpdate: (prayerId: string, updateId: string) => Promise<void>;
}

export async function runPrayerEditorConfirmationAction(
  action: PrayerEditorConfirmationAction,
  callbacks: PrayerEditorConfirmationRunnerCallbacks,
): Promise<void> {
  const client = callbacks.getClient();
  const state = callbacks.getState();
  const listState = prayerEditorConfirmationListState(state);

  try {
    await dispatchPrayerEditorConfirmation(action, {
      bulkStatus: async () => {
        callbacks.setUpdatingStatus(true);
        const result = await applyPrayerEditorBulkStatusConfirmation(
          client,
          listState,
        );
        callbacks.applyConfirmationResult(result);
      },
      deleteMany: async () => {
        callbacks.setDeleting(true);
        callbacks.clearError();
        const result = await applyPrayerEditorBulkDeleteConfirmation(
          client,
          listState,
        );
        callbacks.applyConfirmationResult(result);
      },
      deleteOne: async (prayerId) => {
        callbacks.setDeleting(true);
        callbacks.clearError();
        const result = await applyPrayerEditorSingleDeleteConfirmation(
          client,
          listState,
          prayerId,
        );
        callbacks.applyConfirmationResult(result);
      },
      deleteUpdate: async (prayerId, updateId) => {
        callbacks.setDeleting(true);
        callbacks.clearError();
        await callbacks.executeDeleteUpdate(prayerId, updateId);
      },
    });
  } catch (err: unknown) {
    console.error('Error applying prayer editor confirmation:', err);
    callbacks.applyMutationError(err, 'Failed to apply confirmation');
  } finally {
    callbacks.setDeleting(false);
    callbacks.setUpdatingStatus(false);
  }
}
