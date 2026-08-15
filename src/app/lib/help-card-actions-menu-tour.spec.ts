import { describe, it, expect, afterEach } from 'vitest';
import {
  CARD_ACTIONS_OVERFLOW_TRIGGER_SELECTOR,
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from './help-card-actions-menu-tour';

describe('helpCardActionsMenuTour', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('finds the overflow trigger by data attribute', () => {
    const button = document.createElement('button');
    button.setAttribute('data-card-actions-trigger', '');
    document.body.appendChild(button);
    expect(getCardActionsOverflowTriggerEl(document)).toBe(button);
    expect(CARD_ACTIONS_OVERFLOW_TRIGGER_SELECTOR).toBe(
      '[data-card-actions-trigger]'
    );
  });

  it('clicks a closed trigger and ignores an already-open one', () => {
    const clicks: number[] = [];
    const button = document.createElement('button');
    button.setAttribute('data-card-actions-trigger', '');
    button.addEventListener('click', () => clicks.push(1));
    openCardActionsOverflowMenu(button);
    expect(clicks).toEqual([1]);

    button.setAttribute('aria-expanded', 'true');
    openCardActionsOverflowMenu(button);
    expect(clicks).toEqual([1]);
  });
});
