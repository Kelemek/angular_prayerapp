import type { PrayerEditorPrayer } from './admin-prayer-editor-types';
import { prayerEditorBulkStatusLabel } from './admin-prayer-editor-commands';

export type PrayerEditorConfirmationKind =
  | 'deleteOne'
  | 'deleteMany'
  | 'bulkStatus'
  | 'deleteUpdate';

export interface PrayerEditorConfirmationAction {
  kind: PrayerEditorConfirmationKind;
  prayerId?: string;
  updateId?: string;
}

export interface PrayerEditorConfirmationDialogState {
  title: string;
  message: string;
  details?: string | null;
  buttonText: string;
  isDangerous: boolean;
}

export function buildDeletePrayerEditorPrayerConfirmation(
  prayer: PrayerEditorPrayer,
): PrayerEditorConfirmationDialogState {
  return {
    title: 'Delete Prayer',
    message: `Are you sure you want to delete the prayer "${prayer.title}"? This action cannot be undone.`,
    buttonText: 'Delete',
    isDangerous: true,
  };
}

export function buildDeleteSelectedPrayerEditorConfirmation(
  count: number,
): PrayerEditorConfirmationDialogState {
  return {
    title: 'Delete Selected Prayers',
    message: `Are you sure you want to delete ${count} prayer(s)? This action cannot be undone.`,
    buttonText: 'Delete',
    isDangerous: true,
  };
}

export function buildBulkStatusPrayerEditorConfirmation(
  count: number,
  status: string,
): PrayerEditorConfirmationDialogState {
  const statusLabel = prayerEditorBulkStatusLabel(status);
  return {
    title: 'Update Prayer Status',
    message: `Are you sure you want to change ${count} prayer(s) to "${statusLabel}" status?`,
    buttonText: 'Update',
    isDangerous: false,
  };
}

export function buildDeletePrayerEditorUpdateConfirmation(
  content: string,
): PrayerEditorConfirmationDialogState {
  const preview =
    content.substring(0, 50) + (content.length > 50 ? '...' : '');
  return {
    title: 'Delete Update',
    message: 'Are you sure you want to delete this prayer update?',
    details: `"${preview}"\n\nThis action cannot be undone.`,
    buttonText: 'Delete',
    isDangerous: true,
  };
}
