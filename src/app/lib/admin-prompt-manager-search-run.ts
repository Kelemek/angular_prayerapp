import type { SupabaseService } from '../services/supabase.service';
import type { PrayerPrompt } from '../types/prayer';
import { adminErrorMessage } from './admin-error-message';
import { searchPrayerPrompts } from './admin-prompt-manager-fetch';

export interface PromptManagerSearchRunSuccess {
  ok: true;
  prompts: PrayerPrompt[];
}

export interface PromptManagerSearchRunFailure {
  ok: false;
  errorMessage: string;
}

export type PromptManagerSearchRunOutcome =
  | PromptManagerSearchRunSuccess
  | PromptManagerSearchRunFailure;

export async function runPromptManagerSearch(
  supabase: SupabaseService,
  searchQuery: string,
): Promise<PromptManagerSearchRunOutcome> {
  try {
    const prompts = await searchPrayerPrompts(supabase, searchQuery);
    return { ok: true, prompts };
  } catch (err: unknown) {
    console.error('Error searching prompts:', err);
    const message = adminErrorMessage(err);
    return {
      ok: false,
      errorMessage: `Failed to search prompts: ${message}`,
    };
  }
}
