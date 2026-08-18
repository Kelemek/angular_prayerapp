import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { PromptService } from '../services/prompt.service';
import type { PrayerTypeConfirmationAction } from './admin-prayer-types-confirmations';

export interface PrayerTypesPanelHostRef {
  resetTypeFormForAdd(): void;
}

export interface PrayerTypesDialogsHostRef {
  openConfirmation(
    state: {
      title: string;
      message: string;
      isDangerous: boolean;
      confirmText: string;
    },
    action: PrayerTypeConfirmationAction,
  ): void;
}

export interface PrayerTypesFacadeDeps {
  supabase: SupabaseService;
  toast: ToastService;
  promptService: PromptService;
  markForCheck: () => void;
  afterBookletUiRefresh?: () => void;
}
