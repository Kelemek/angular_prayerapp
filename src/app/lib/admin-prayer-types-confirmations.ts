import type { PrayerTypeRecord } from '../types/prayer';

export type PrayerTypeConfirmationKind =
  | 'delete'
  | 'toggleBooklet'
  | 'toggleActive';

export interface PrayerTypeConfirmationDialogState {
  title: string;
  message: string;
  isDangerous: boolean;
  confirmText: string;
}

export interface PrayerTypeConfirmationAction {
  kind: PrayerTypeConfirmationKind;
  deleteId?: string;
  type?: PrayerTypeRecord;
}

export function buildPrayerTypeDeleteConfirmation(
  name: string,
): PrayerTypeConfirmationDialogState {
  return {
    title: 'Delete Prayer Type',
    message: `Are you sure you want to delete the "${name}" type? This may affect existing prayer prompts using this type.`,
    isDangerous: true,
    confirmText: 'Delete',
  };
}

export function buildPrayerTypeBookletToggleConfirmation(
  type: PrayerTypeRecord,
): PrayerTypeConfirmationDialogState {
  const includeNext = !(type.include_in_booklet ?? false);
  return {
    title: includeNext
      ? 'Include in saddle-stitch booklet?'
      : 'Remove from saddle-stitch booklet?',
    message: includeNext
      ? `Include prompts for "${type.name}" in Admin → Tools → Saddle-stitch booklet (after answered prayers)?`
      : `Stop including "${type.name}" prompts in the saddle-stitch booklet printout?`,
    isDangerous: false,
    confirmText: 'Confirm',
  };
}

export function buildPrayerTypeActiveToggleConfirmation(
  type: PrayerTypeRecord,
): PrayerTypeConfirmationDialogState {
  const activating = !type.is_active;
  return {
    title: activating ? 'Activate prayer type?' : 'Deactivate prayer type?',
    message: activating
      ? `"${type.name}" will appear in prayer prompt type dropdowns.`
      : `"${type.name}" will be hidden from dropdowns until you activate it again.`,
    isDangerous: false,
    confirmText: 'Confirm',
  };
}
