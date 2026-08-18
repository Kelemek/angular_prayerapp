import type { SupabaseService } from '../services/supabase.service';
import { deletePrayerPrompt } from './admin-prompt-manager-commands';
import { adminErrorMessage } from './admin-error-message';

export interface PromptManagerDeleteRunnerCallbacks {
  clearMessages: () => void;
  markForCheck: () => void;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
  clearEditingIfMatches: (id: string) => void;
  refreshAfterDelete: () => Promise<void>;
  notifySaved: () => void;
}

export async function runPromptManagerDeleteMutation(
  supabase: SupabaseService,
  id: string,
  title: string,
  callbacks: PromptManagerDeleteRunnerCallbacks,
): Promise<void> {
  try {
    callbacks.clearMessages();
    await deletePrayerPrompt(supabase, id);
    callbacks.setSuccess('Prayer prompt deleted successfully!');
    callbacks.toastSuccess('Prompt deleted.');
    callbacks.clearEditingIfMatches(id);
    await callbacks.refreshAfterDelete();
    callbacks.notifySaved();
  } catch (err: unknown) {
    console.error('Error deleting prompt:', err);
    const message = adminErrorMessage(err);
    callbacks.setError(`Failed to delete prayer prompt: ${message}`);
    callbacks.toastError(`Could not delete prompt: ${message}`);
  } finally {
    callbacks.markForCheck();
  }
}
