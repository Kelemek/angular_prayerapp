export interface PrayerCardDeleteUiState {
  showConfirmationDialog: boolean;
  showDeleteRequestForm: boolean;
  showUpdateDeleteRequestForm: string | null;
  showAddUpdateForm: boolean;
  showUpdateConfirmationDialog: boolean;
  updateConfirmationTitle: string;
  updateConfirmationMessage: string;
  updateConfirmationId: string | null;
}

export type PrayerCardDeleteUiPatch = Partial<PrayerCardDeleteUiState>;

export const PRAYER_CARD_UPDATE_DELETE_CONFIRM = {
  title: 'Delete Update',
  message:
    'Are you sure you want to delete this update? This action cannot be undone.',
} as const;

export function prayerCardPrayerDeleteClickPatch(
  isAdmin: boolean,
  isPersonal: boolean,
  showDeleteRequestForm: boolean
): PrayerCardDeleteUiPatch {
  if (isAdmin || isPersonal) {
    return { showConfirmationDialog: true };
  }
  const opening = !showDeleteRequestForm;
  return {
    showDeleteRequestForm: opening,
    ...(opening
      ? {
          showAddUpdateForm: false,
          showUpdateDeleteRequestForm: null,
        }
      : {}),
  };
}

export function prayerCardUpdateDeleteClickPatch(
  isAdmin: boolean,
  isPersonal: boolean,
  updateId: string,
  showUpdateDeleteRequestForm: string | null
): PrayerCardDeleteUiPatch {
  if (isAdmin || isPersonal) {
    return {
      updateConfirmationTitle: PRAYER_CARD_UPDATE_DELETE_CONFIRM.title,
      updateConfirmationMessage: PRAYER_CARD_UPDATE_DELETE_CONFIRM.message,
      updateConfirmationId: updateId,
      showUpdateConfirmationDialog: true,
    };
  }
  if (showUpdateDeleteRequestForm === updateId) {
    return { showUpdateDeleteRequestForm: null };
  }
  return {
    showUpdateDeleteRequestForm: updateId,
    showAddUpdateForm: false,
    showDeleteRequestForm: false,
  };
}

export function prayerCardToggleAddUpdatePatch(
  showAddUpdateForm: boolean
): PrayerCardDeleteUiPatch {
  const opening = !showAddUpdateForm;
  return {
    showAddUpdateForm: opening,
    ...(opening
      ? {
          showDeleteRequestForm: false,
          showUpdateDeleteRequestForm: null,
        }
      : {}),
  };
}

export function applyPrayerCardDeleteUiPatch(
  state: PrayerCardDeleteUiState,
  patch: PrayerCardDeleteUiPatch
): void {
  if (patch.showConfirmationDialog !== undefined) {
    state.showConfirmationDialog = patch.showConfirmationDialog;
  }
  if (patch.showDeleteRequestForm !== undefined) {
    state.showDeleteRequestForm = patch.showDeleteRequestForm;
  }
  if (patch.showUpdateDeleteRequestForm !== undefined) {
    state.showUpdateDeleteRequestForm = patch.showUpdateDeleteRequestForm;
  }
  if (patch.showAddUpdateForm !== undefined) {
    state.showAddUpdateForm = patch.showAddUpdateForm;
  }
  if (patch.showUpdateConfirmationDialog !== undefined) {
    state.showUpdateConfirmationDialog = patch.showUpdateConfirmationDialog;
  }
  if (patch.updateConfirmationTitle !== undefined) {
    state.updateConfirmationTitle = patch.updateConfirmationTitle;
  }
  if (patch.updateConfirmationMessage !== undefined) {
    state.updateConfirmationMessage = patch.updateConfirmationMessage;
  }
  if (patch.updateConfirmationId !== undefined) {
    state.updateConfirmationId = patch.updateConfirmationId;
  }
}
