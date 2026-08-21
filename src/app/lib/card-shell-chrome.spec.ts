import { describe, expect, it } from 'vitest';
import { cardModalsRenderOutsideShell } from './card-shell-chrome';
import {
  getUpdateRowHeaderBandRoundedClasses,
  getPrayerCardVariantLayout,
  getPromptCardVariantLayout,
  PRAYER_CARD_HEADER_BAND_ROUNDED_CLASSES,
  PRAYER_UPDATE_ROW_SHELL_FILL_CLASSES,
} from './prayer-card-layout';
import { getPromptCardShellClasses } from './prompt-card-display';

describe('getUpdateRowHeaderBandRoundedClasses', () => {
  it('uses xl inner radius for presentation update rows', () => {
    expect(getUpdateRowHeaderBandRoundedClasses('rounded-xl')).toContain(
      'shell-radius-xl'
    );
    expect(getUpdateRowHeaderBandRoundedClasses('rounded-xl')).toContain(
      'shell-border-w-1'
    );
  });

  it('uses lg inner radius for home update rows', () => {
    expect(getUpdateRowHeaderBandRoundedClasses('rounded-lg')).toContain(
      'shell-radius-lg'
    );
    expect(getUpdateRowHeaderBandRoundedClasses('rounded-lg')).not.toContain(
      'shell-radius-xl'
    );
  });
});

describe('getPromptCardShellClasses', () => {
  it('includes presentation bottom padding tokens', () => {
    const classes = getPromptCardShellClasses(
      getPromptCardVariantLayout('presentation')
    );
    expect(classes).toContain('pb-4');
    expect(classes).toContain('sm:pb-6');
    expect(classes).toContain('md:pb-8');
  });

  it('includes home bottom padding tokens', () => {
    const classes = getPromptCardShellClasses(
      getPromptCardVariantLayout('home')
    );
    expect(classes).toContain('pb-4');
    expect(classes).not.toContain('md:pb-8');
  });
});

describe('card shell chrome tokens', () => {
  it('uses parameterized corner seal classes', () => {
    expect(PRAYER_UPDATE_ROW_SHELL_FILL_CLASSES).toContain('bg-shell-corner-seal');
    expect(PRAYER_UPDATE_ROW_SHELL_FILL_CLASSES).toContain('shell-border-w-1');
    expect(PRAYER_CARD_HEADER_BAND_ROUNDED_CLASSES).toContain(
      'rounded-t-shell-inner'
    );
    expect(getPrayerCardVariantLayout('presentation').updateShellClass).toBe(
      'rounded-xl'
    );
  });
});

describe('cardModalsRenderOutsideShell', () => {
  const prayerTemplate = `
    <div [class]="shellClasses()">
      <app-prayer-card-updates-section />
    </div>
    <!-- Outside bg-card-shell-fill (isolation: isolate) so fixed modals stack above filter tabs and later cards. -->
    <app-prayer-card-modals-stack />
  `;

  it('returns true when modals stack is outside the shell subtree', () => {
    expect(
      cardModalsRenderOutsideShell(
        prayerTemplate,
        '[class]="shellClasses()"',
        'app-prayer-card-modals-stack',
        'app-prayer-card-updates-section'
      )
    ).toBe(true);
  });

  it('returns false when modals stack is inside the shell subtree', () => {
    const broken = `
      <div [class]="shellClasses()">
        <app-prayer-card-updates-section />
        <app-prayer-card-modals-stack />
      </div>
      <!-- Outside bg-card-shell-fill (isolation: isolate) -->
    `;
    expect(
      cardModalsRenderOutsideShell(
        broken,
        '[class]="shellClasses()"',
        'app-prayer-card-modals-stack',
        'app-prayer-card-updates-section'
      )
    ).toBe(false);
  });
});
