import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { AdminDataService } from '../services/admin-data.service';
import type {
  EmailSubscriberConfirmationAction,
  EmailSubscriberConfirmationDialogState,
} from './admin-email-subscribers-confirmations';

export interface EmailSubscribersPanelHostRef {
  resetAddForm(): void;
  resetCsvPanel(): void;
  showPlanningCenterTab(): void;
  runPlanningCenterSearchTourDemo(): Promise<void>;
  selectTourPlanningCenterMatchFromDemoResults(): void;
  applyTourDemoPlanningCenterAdd(): void;
  clearTourDemoForm(): void;
}

export interface EmailSubscribersDialogsHostRef {
  openWelcomeEmailDialog(): void;
  closeWelcomeEmailDialog(): void;
  openConfirmation(
    state: EmailSubscriberConfirmationDialogState,
    action: EmailSubscriberConfirmationAction,
  ): void;
}

export interface EmailSubscribersSectionHostRef {
  containerElement?: HTMLElement;
}

export interface EmailSubscribersFacadeDeps {
  supabase: SupabaseService;
  toast: ToastService;
  adminDataService: AdminDataService;
  markForCheck: () => void;
}
