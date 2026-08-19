export const PRAY_FOR_MODAL_DO_NOT_SHOW_KEY = 'prayer_encouragement_modal_do_not_show';

export function shouldSkipPrayForExplanationModal(): boolean {
  try {
    return localStorage.getItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY) === 'true';
  } catch {
    return false;
  }
}

export function persistPrayForModalDoNotShowAgain(): void {
  try {
    localStorage.setItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY, 'true');
  } catch {
    // Ignore quota or disabled localStorage
  }
}
