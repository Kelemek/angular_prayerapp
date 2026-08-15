export const CARD_ACTIONS_OVERFLOW_TRIGGER_SELECTOR =
  '[data-card-actions-trigger]';

export function getCardActionsOverflowTriggerEl(
  root: ParentNode | Document | null = typeof document === 'undefined' ? null : document
): HTMLButtonElement | null {
  if (!root) {
    return null;
  }
  const el = root.querySelector(CARD_ACTIONS_OVERFLOW_TRIGGER_SELECTOR);
  return el instanceof HTMLButtonElement ? el : null;
}

export function openCardActionsOverflowMenu(
  trigger: HTMLButtonElement | null
): void {
  if (!trigger) {
    return;
  }
  if (trigger.getAttribute('aria-expanded') === 'true') {
    return;
  }
  trigger.click();
}
