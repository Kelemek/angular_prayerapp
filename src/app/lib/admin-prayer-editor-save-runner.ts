import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isPrayerEditorEditUpdateFormValid,
  isPrayerEditorNewUpdateValid,
  PRAYER_EDITOR_REQUIRED_FIELDS_ERROR,
  validatePrayerEditorEditForm,
} from './admin-prayer-editor-commands';
import type {
  PrayerEditorEditForm,
  PrayerEditorEditUpdateForm,
  PrayerEditorNewUpdate,
  PrayerEditorPrayer,
} from './admin-prayer-editor-types';
import {
  applyPrayerEditorDeleteUpdate,
  applyPrayerEditorEditUpdateSave,
  applyPrayerEditorNewUpdateSave,
  applyPrayerEditorPrayerSave,
  type PrayerEditorDeleteUpdateApplyResult,
  type PrayerEditorEditUpdateApplyResult,
  type PrayerEditorNewUpdateApplyResult,
  type PrayerEditorPrayerSaveApplyResult,
} from './admin-prayer-editor-save-apply';

export interface PrayerEditorSaveRunnerCallbacks {
  getClient: () => SupabaseClient;
  clearError: () => void;
  onValidationError: (message: string) => void;
  onMutationError: (err: unknown, fallback: string) => void;
  markForCheck: () => void;
}

export async function runPrayerEditorPrayerSaveAction(
  prayerId: string,
  input: {
    searchResults: PrayerEditorPrayer[];
    allPrayers: PrayerEditorPrayer[];
    editForm: PrayerEditorEditForm;
  },
  callbacks: PrayerEditorSaveRunnerCallbacks & {
    setSaving: (value: boolean) => void;
    applyResult: (result: PrayerEditorPrayerSaveApplyResult) => void;
  },
): Promise<void> {
  const validationError = validatePrayerEditorEditForm(input.editForm);
  if (validationError) {
    callbacks.onValidationError(validationError);
    return;
  }

  try {
    callbacks.setSaving(true);
    callbacks.clearError();
    callbacks.markForCheck();

    const result = await applyPrayerEditorPrayerSave(
      callbacks.getClient(),
      input.searchResults,
      input.allPrayers,
      prayerId,
      input.editForm,
    );
    callbacks.applyResult(result);
  } catch (err: unknown) {
    console.error('Error updating prayer:', err);
    callbacks.onMutationError(err, 'Failed to update prayer');
  } finally {
    callbacks.setSaving(false);
    callbacks.markForCheck();
  }
}

export async function runPrayerEditorNewUpdateSaveAction(
  prayerId: string,
  input: {
    allPrayers: PrayerEditorPrayer[];
    newUpdate: PrayerEditorNewUpdate;
  },
  callbacks: PrayerEditorSaveRunnerCallbacks & {
    setSavingUpdate: (value: boolean) => void;
    applyResult: (result: PrayerEditorNewUpdateApplyResult) => void;
  },
): Promise<void> {
  if (!isPrayerEditorNewUpdateValid(input.newUpdate)) {
    callbacks.onValidationError(PRAYER_EDITOR_REQUIRED_FIELDS_ERROR);
    return;
  }

  try {
    callbacks.setSavingUpdate(true);
    callbacks.clearError();
    callbacks.markForCheck();

    const result = await applyPrayerEditorNewUpdateSave(
      callbacks.getClient(),
      input.allPrayers,
      prayerId,
      input.newUpdate,
    );
    callbacks.applyResult(result);
  } catch (err: unknown) {
    console.error('Error saving update:', err);
    callbacks.onMutationError(err, 'Failed to save update');
  } finally {
    callbacks.setSavingUpdate(false);
    callbacks.markForCheck();
  }
}

export async function runPrayerEditorEditUpdateSaveAction(
  prayerId: string,
  updateId: string,
  input: {
    allPrayers: PrayerEditorPrayer[];
    editUpdateForm: PrayerEditorEditUpdateForm;
  },
  callbacks: PrayerEditorSaveRunnerCallbacks & {
    setSavingEditUpdate: (value: boolean) => void;
    applyResult: (result: PrayerEditorEditUpdateApplyResult) => void;
  },
): Promise<void> {
  if (!isPrayerEditorEditUpdateFormValid(input.editUpdateForm)) {
    callbacks.onValidationError(PRAYER_EDITOR_REQUIRED_FIELDS_ERROR);
    return;
  }

  try {
    callbacks.setSavingEditUpdate(true);
    callbacks.clearError();
    callbacks.markForCheck();

    const result = await applyPrayerEditorEditUpdateSave(
      callbacks.getClient(),
      input.allPrayers,
      prayerId,
      updateId,
      input.editUpdateForm,
    );
    callbacks.applyResult(result);
  } catch (err: unknown) {
    console.error('Error updating update:', err);
    callbacks.onMutationError(err, 'Failed to update');
  } finally {
    callbacks.setSavingEditUpdate(false);
    callbacks.markForCheck();
  }
}

export async function runPrayerEditorDeleteUpdateAction(
  prayerId: string,
  updateId: string,
  input: { allPrayers: PrayerEditorPrayer[] },
  callbacks: PrayerEditorSaveRunnerCallbacks & {
    applyResult: (result: PrayerEditorDeleteUpdateApplyResult) => void;
  },
): Promise<void> {
  try {
    callbacks.clearError();
    callbacks.markForCheck();

    const result = await applyPrayerEditorDeleteUpdate(
      callbacks.getClient(),
      input.allPrayers,
      prayerId,
      updateId,
    );
    callbacks.applyResult(result);
  } catch (err: unknown) {
    console.error('Error deleting update:', err);
    callbacks.onMutationError(err, 'Failed to delete update');
  } finally {
    callbacks.markForCheck();
  }
}
