import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { PromptManagerDeleteConfirmationAction } from './admin-prompt-manager-confirmations';

export interface PromptManagerPanelHostRef {
  resetCreateForm(): void;
  resetCsvPanel(): void;
  setCreateFormDefaultType(typeName: string): void;
}

export interface PromptManagerDialogsHostRef {
  openDeleteConfirmation(
    state: {
      title: string;
      message: string;
      isDangerous: boolean;
      confirmText: string;
    },
    action: PromptManagerDeleteConfirmationAction,
  ): void;
}

export interface PromptManagerFacadeDeps {
  supabase: SupabaseService;
  toast: ToastService;
  markForCheck: () => void;
}
