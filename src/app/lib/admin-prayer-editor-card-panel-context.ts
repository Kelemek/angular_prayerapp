import type { SubscriberPickRow } from './admin-subscriber-pick';
import type {
  PrayerEditorEditForm,
  PrayerEditorEditUpdateForm,
  PrayerEditorNewUpdate,
  PrayerEditorPrayer,
  PrayerEditorUpdate,
} from './admin-prayer-editor-types';

/** Panel bindings for admin prayer editor card child components (decoupled from the card class). */
export interface AdminPrayerEditorCardPanelContext {
  prayer: PrayerEditorPrayer;
  index: number;
  editForm: PrayerEditorEditForm;
  newUpdate: PrayerEditorNewUpdate;
  editUpdateForm: PrayerEditorEditUpdateForm;
  getStatusColor(status: string): string;
  getApprovalStatusColor(status: string): string;
  isUpdateFormValid(): boolean;
  isEditUpdateFormValid(): boolean;
  onExpandClick(): void;
  onSelectClick(): void;
  onEditClick(): void;
  onDeleteClick(): void;
  onSaveEditClick(): void;
  onCancelEditClick(): void;
  onStartAddUpdateClick(): void;
  onCancelAddUpdateClick(): void;
  onSaveNewUpdateClick(): void;
  onAddUpdateSubscriberSelected(row: SubscriberPickRow): void;
  onDeleteUpdateClick(updateId: string, content: string): void;
  onStartEditUpdateClick(update: PrayerEditorUpdate): void;
  onCancelEditUpdateClick(): void;
  onSaveEditUpdateClick(updateId: string): void;
}
