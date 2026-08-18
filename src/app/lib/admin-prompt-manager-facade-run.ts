import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { PrayerPrompt, PrayerTypeRecord } from '../types/prayer';
import { fetchActivePrayerTypesForPrompts } from './admin-prompt-manager-fetch';
import {
  runPromptManagerDeleteMutation,
  type PromptManagerDeleteRunnerCallbacks,
} from './admin-prompt-manager-delete-runner';
import { runPromptManagerSearch } from './admin-prompt-manager-search-run';

export interface PromptManagerFacadeSearchHost {
  searching: boolean;
  error: string | null;
  success: string | null;
  hasSearched: boolean;
  sectionExpanded: boolean;
  prompts: PrayerPrompt[];
  markForCheck: () => void;
}

export async function runPromptManagerFacadeSearch(
  host: PromptManagerFacadeSearchHost,
  supabase: SupabaseService,
  searchQuery: string,
): Promise<void> {
  try {
    host.searching = true;
    host.markForCheck();
    host.error = null;
    host.success = null;
    host.hasSearched = true;

    const outcome = await runPromptManagerSearch(supabase, searchQuery);
    if (outcome.ok) {
      host.prompts = outcome.prompts;
    } else {
      host.error = outcome.errorMessage;
      host.sectionExpanded = true;
    }
  } finally {
    host.searching = false;
    host.markForCheck();
  }
}

export async function bootstrapPromptManagerSection(
  fetchPrayerTypes: () => Promise<void>,
  handleSearch: () => Promise<void>,
): Promise<void> {
  await fetchPrayerTypes();
  await handleSearch();
}

export async function runPromptManagerFetchPrayerTypes(
  supabase: SupabaseService,
  setDefaultType?: (typeName: string) => void,
): Promise<PrayerTypeRecord[]> {
  try {
    const prayerTypes = await fetchActivePrayerTypesForPrompts(supabase);
    if (prayerTypes.length > 0 && setDefaultType) {
      setDefaultType(prayerTypes[0].name);
    }
    return prayerTypes;
  } catch (err: unknown) {
    console.error('Error fetching prayer types:', err);
    return [];
  }
}

export interface PromptManagerFacadeDeleteHost {
  error: string | null;
  success: string | null;
  editingId: string | null;
  hasSearched: boolean;
  markForCheck: () => void;
  handleSearch: () => Promise<void>;
}

export function buildPromptManagerDeleteRunnerCallbacks(
  host: PromptManagerFacadeDeleteHost,
  toast: ToastService,
  notifySaved: () => void,
): PromptManagerDeleteRunnerCallbacks {
  return {
    clearMessages: () => {
      host.error = null;
      host.success = null;
    },
    markForCheck: () => host.markForCheck(),
    setSuccess: (message) => {
      host.success = message;
    },
    setError: (message) => {
      host.error = message;
    },
    toastSuccess: (message) => toast.success(message),
    toastError: (message) => toast.error(message),
    clearEditingIfMatches: (id) => {
      if (host.editingId === id) {
        host.editingId = null;
      }
    },
    refreshAfterDelete: async () => {
      if (host.hasSearched) {
        await host.handleSearch();
      }
    },
    notifySaved,
  };
}

export async function runPromptManagerFacadeDelete(
  supabase: SupabaseService,
  action: { id: string; title: string },
  host: PromptManagerFacadeDeleteHost,
  toast: ToastService,
  notifySaved: () => void,
): Promise<void> {
  await runPromptManagerDeleteMutation(
    supabase,
    action.id,
    action.title,
    buildPromptManagerDeleteRunnerCallbacks(host, toast, notifySaved),
  );
}
