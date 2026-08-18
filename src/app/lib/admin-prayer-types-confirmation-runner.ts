import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseService } from '../services/supabase.service';
import type { PrayerTypeConfirmationAction } from './admin-prayer-types-confirmations';
import type { PrayerTypeRecord } from '../types/prayer';
import {
  deletePrayerType,
  reorderPrayerTypes,
  togglePrayerTypeActive,
  togglePrayerTypeBooklet,
} from './admin-prayer-types-commands';
import { adminErrorMessage } from './admin-error-message';

export interface PrayerTypeMutationCallbacks {
  clearMessages: () => void;
  markForCheck: () => void;
  refreshTypes: () => Promise<void>;
  refreshPrompts: () => Promise<void>;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  toastError?: (message: string) => void;
  afterBookletUiRefresh?: () => void;
}

export async function runPrayerTypeDeleteMutation(
  supabase: SupabaseService,
  deleteId: string,
  callbacks: PrayerTypeMutationCallbacks,
): Promise<void> {
  try {
    callbacks.clearMessages();
    await deletePrayerType(supabase, deleteId);
    callbacks.setSuccess('Prayer type deleted successfully!');
    await callbacks.refreshTypes();
    await callbacks.refreshPrompts();
  } catch (err: unknown) {
    console.error('Error deleting prayer type:', err);
    callbacks.setError(adminErrorMessage(err));
  } finally {
    callbacks.markForCheck();
  }
}

export async function runPrayerTypeBookletToggleMutation(
  supabase: SupabaseService,
  type: PrayerTypeRecord,
  callbacks: PrayerTypeMutationCallbacks,
): Promise<void> {
  try {
    callbacks.clearMessages();
    await togglePrayerTypeBooklet(supabase, type);
    await callbacks.refreshTypes();
    callbacks.markForCheck();
    callbacks.afterBookletUiRefresh?.();
  } catch (err: unknown) {
    console.error('Error updating booklet inclusion:', err);
    const message = adminErrorMessage(err);
    callbacks.setError(message);
    if (callbacks.toastError) {
      callbacks.toastError(`Could not update booklet setting: ${message}`);
    }
    callbacks.markForCheck();
    callbacks.afterBookletUiRefresh?.();
  }
}

export async function runPrayerTypeActiveToggleMutation(
  supabase: SupabaseService,
  type: PrayerTypeRecord,
  callbacks: PrayerTypeMutationCallbacks,
): Promise<void> {
  try {
    callbacks.clearMessages();
    await togglePrayerTypeActive(supabase, type);
    callbacks.setSuccess(
      `Prayer type ${!type.is_active ? 'activated' : 'deactivated'} successfully!`,
    );
    await callbacks.refreshTypes();
    await callbacks.refreshPrompts();
  } catch (err: unknown) {
    console.error('Error toggling prayer type:', err);
    callbacks.setError(adminErrorMessage(err));
  } finally {
    callbacks.markForCheck();
  }
}

export async function runPrayerTypesReorderMutation(
  client: SupabaseClient,
  types: PrayerTypeRecord[],
  callbacks: PrayerTypeMutationCallbacks & {
    restoreTypes: () => void;
  },
): Promise<void> {
  try {
    callbacks.clearMessages();
    await reorderPrayerTypes(client, types);
    await callbacks.refreshTypes();
    await callbacks.refreshPrompts();
  } catch (err: unknown) {
    console.error('Error reordering prayer types:', err);
    callbacks.setError(adminErrorMessage(err));
    callbacks.restoreTypes();
  } finally {
    callbacks.markForCheck();
  }
}

export async function runPrayerTypeConfirmationAction(
  supabase: SupabaseService,
  action: PrayerTypeConfirmationAction,
  callbacks: PrayerTypeMutationCallbacks,
): Promise<void> {
  switch (action.kind) {
    case 'delete':
      if (!action.deleteId) {
        return;
      }
      await runPrayerTypeDeleteMutation(supabase, action.deleteId, callbacks);
      break;
    case 'toggleBooklet':
      if (!action.type) {
        return;
      }
      await runPrayerTypeBookletToggleMutation(supabase, action.type, callbacks);
      break;
    case 'toggleActive':
      if (!action.type) {
        return;
      }
      await runPrayerTypeActiveToggleMutation(supabase, action.type, callbacks);
      break;
    default: {
      const neverKind: never = action.kind;
      throw new Error(`Unhandled confirmation: ${neverKind}`);
    }
  }
}
