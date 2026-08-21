import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cardModalsRenderOutsideShell } from '../../lib/card-shell-chrome';

const prayerCardHtml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'prayer-card.component.html'),
  'utf8'
);

const promptCardHtml = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    '../prompt-card/prompt-card.component.html'
  ),
  'utf8'
);

describe('card modal placement (stacking regression)', () => {
  it('keeps prayer card modals outside the bg-card-shell-fill shell', () => {
    expect(
      cardModalsRenderOutsideShell(
        prayerCardHtml,
        '[class]="shellClasses()"',
        'app-prayer-card-modals-stack',
        'app-prayer-card-updates-section'
      )
    ).toBe(true);
  });

  it('keeps prompt card modals outside the card shell', () => {
    expect(
      cardModalsRenderOutsideShell(
        promptCardHtml,
        '[class]="shellClasses()"',
        'app-prompt-card-pray-for-modal',
        'app-prompt-card-actions-row'
      )
    ).toBe(true);
    expect(promptCardHtml).not.toMatch(
      /\[class\]="shellClasses\(\)"[\s\S]*app-prompt-card-pray-for-modal[\s\S]*Outside bg-card-shell-fill/
    );
  });
});
