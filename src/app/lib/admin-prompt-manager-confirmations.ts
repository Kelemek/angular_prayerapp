export interface PromptManagerConfirmationDialogState {
  title: string;
  message: string;
  isDangerous: boolean;
  confirmText: string;
}

export interface PromptManagerDeleteConfirmationAction {
  kind: 'delete';
  id: string;
  title: string;
}

export function buildPromptManagerDeleteConfirmation(
  title: string,
): PromptManagerConfirmationDialogState {
  return {
    title: 'Delete Prompt',
    message: `Are you sure you want to delete "${title}"?`,
    isDangerous: true,
    confirmText: 'Delete',
  };
}
