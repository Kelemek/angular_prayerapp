import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { PromptService } from '../services/prompt.service';
import type { PrayerTypeRecord } from '../types/prayer';
import type { PrayerTypeConfirmationAction } from './admin-prayer-types-confirmations';
import { runPrayerTypesListFetch } from './admin-prayer-types-fetch-run';
import {
  runPrayerTypeConfirmationAction,
  runPrayerTypesReorderMutation,
  type PrayerTypeMutationCallbacks,
} from './admin-prayer-types-confirmation-runner';

export interface PrayerTypesFacadeFetchHost {
  types: PrayerTypeRecord[];
  loading: boolean;
  error: string | null;
  sectionExpanded: boolean;
  markForCheck: () => void;
}

export async function runPrayerTypesFacadeFetch(
  host: PrayerTypesFacadeFetchHost,
  supabase: SupabaseService,
): Promise<void> {
  try {
    host.loading = true;
    host.error = null;

    const outcome = await runPrayerTypesListFetch(supabase);
    if (outcome.ok) {
      host.types = outcome.types;
    } else {
      host.error = outcome.error;
      host.sectionExpanded = true;
    }
  } finally {
    host.loading = false;
    host.markForCheck();
  }
}

export interface PrayerTypesFacadeMutationDepsHost {
  error: string | null;
  success: string | null;
  markForCheck: () => void;
  fetchTypes: () => Promise<void>;
  promptService: PromptService;
  toast: ToastService;
}

export function buildPrayerTypesFacadeMutationCallbacks(
  host: PrayerTypesFacadeMutationDepsHost,
  afterBookletUiRefresh?: () => void,
): PrayerTypeMutationCallbacks {
  return {
    clearMessages: () => {
      host.error = null;
      host.success = null;
    },
    markForCheck: () => host.markForCheck(),
    refreshTypes: () => host.fetchTypes(),
    refreshPrompts: () => host.promptService.loadPrompts(),
    setSuccess: (message) => {
      host.success = message;
    },
    setError: (message) => {
      host.error = message;
    },
    toastError: (message) => host.toast.error(message),
    afterBookletUiRefresh: () => afterBookletUiRefresh?.(),
  };
}

export async function runPrayerTypesFacadeConfirmation(
  supabase: SupabaseService,
  action: PrayerTypeConfirmationAction,
  callbacks: PrayerTypeMutationCallbacks,
): Promise<void> {
  await runPrayerTypeConfirmationAction(supabase, action, callbacks);
}

export async function runPrayerTypesFacadeReorder(
  supabase: SupabaseService,
  types: PrayerTypeRecord[],
  callbacks: PrayerTypeMutationCallbacks & {
    restoreTypes: () => void;
  },
): Promise<void> {
  await runPrayerTypesReorderMutation(supabase.getClient(), types, callbacks);
}
