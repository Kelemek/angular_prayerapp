import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { PrayerService } from '../services/prayer.service';
import type {
  PrayerEditorConfirmationAction,
  PrayerEditorConfirmationDialogState,
} from './admin-prayer-editor-confirmations';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

export interface PrayerEditorPanelHostRef {
  flushEditDescriptionForPrayer(prayerId: string): void;
  resetAddUpdateSubscriberPickForPrayer(prayerId: string): void;
  resetCreateForm(): void;
}

export interface PrayerEditorDialogsHostRef {
  openSendNotificationForPrayer(prayerId: string, title: string): void;
  openSendNotificationForUpdate(
    prayerId: string,
    updateId: string,
    title: string,
  ): void;
  openConfirmation(
    state: PrayerEditorConfirmationDialogState,
    action: PrayerEditorConfirmationAction,
  ): void;
  openDeletePrayerConfirmation(prayer: PrayerEditorPrayer): void;
  openDeleteSelectedConfirmation(count: number): void;
  openBulkStatusConfirmation(count: number, status: string): void;
  openDeleteUpdateConfirmation(
    prayerId: string,
    updateId: string,
    content: string,
  ): void;
}

export interface PrayerEditorSectionHostRef {
  containerElement?: HTMLElement;
}

export interface PrayerEditorFacadeDeps {
  supabase: SupabaseService;
  toast: ToastService;
  prayerService: PrayerService;
  markForCheck: () => void;
}
