import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  PRAYER_CARD_ACTION_ROW_MOBILE_LOCK_CLASS,
  PRAYER_CARD_HEADER_INSET_CLASSES,
  PRAYER_CARD_PERSONAL_CATEGORY_HEADER_INSET_CLASSES,
  PRAYER_CARD_PERSONAL_CATEGORY_HEADER_TEXT_CLASSES,
  PRAYER_CARD_SHELL_FILL_CLASSES,
  PRAYER_CARD_HEADER_BAND_ROUNDED_CLASSES,
  PRESENTATION_CARD_HEADER_BAND_ROUNDED_CLASSES,
  getMetaHeaderBandLayoutClasses,
  getPrayerCardVariantLayout,
  getPromptCardVariantLayout,
  getUpdateRowHeaderBandRoundedClasses,
} from './prayer-card-layout';

describe('getPrayerCardVariantLayout', () => {
  it('returns compact home layout by default', () => {
    const layout = getPrayerCardVariantLayout('home');
    expect(layout.bandSize).toBe('sm');
    expect(layout.titleClasses).toContain('text-lg');
    expect(layout.usePresentationWrapper).toBe(false);
    expect(layout.showUnreadBadges).toBe(true);
    expect(layout.updateRowSize).toBe('sm');
    expect(layout.updateContentClass).toBe(
      'block text-gray-600 dark:text-gray-300'
    );
    expect(layout.updateContentClass).not.toContain('text-sm');
    expect(layout.descriptionClasses).toContain('text-gray-600');
    expect(getUpdateRowHeaderBandRoundedClasses(layout.updateShellClass)).toContain(
      'shell-radius-lg'
    );
  });

  it('seals home card corners without clipping unread badges', () => {
    const prayer = getPrayerCardVariantLayout('home');
    const prompt = getPromptCardVariantLayout('home');
    const prayerTokens = prayer.shellBaseClasses.split(/\s+/);
    const promptTokens = prompt.shellBaseClasses.split(/\s+/);
    for (const token of PRAYER_CARD_SHELL_FILL_CLASSES.split(/\s+/)) {
      expect(prayerTokens).toContain(token);
      expect(promptTokens).toContain(token);
    }
    expect(prayerTokens).toContain('overflow-visible');
    expect(promptTokens).toContain('overflow-visible');
    expect(prayerTokens).not.toContain('overflow-hidden');
    expect(promptTokens).not.toContain('overflow-hidden');
    expect(prayerTokens).not.toContain('isolate');
    expect(promptTokens).not.toContain('isolate');
    expect(prayer.headerBandRoundedClasses).toBe(
      PRAYER_CARD_HEADER_BAND_ROUNDED_CLASSES
    );
    expect(prompt.headerBandRoundedClasses).toBe(
      PRAYER_CARD_HEADER_BAND_ROUNDED_CLASSES
    );
    expect(prayer.headerBandRoundedClasses).not.toBe('rounded-t-lg');
  });

  it('does not isolate the corner-seal utility (isolation clips hanging badges)', () => {
    const cssPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../card-chrome.css'
    );
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toContain('@utility bg-shell-corner-seal');
    expect(css).not.toMatch(/^\s*isolation:\s*isolate/m);
    expect(css).toMatch(/overflow:\s*visible/);
    expect(css).toContain(
      '.home-prayer-virtual-scroll-viewport > .cdk-virtual-scroll-content-wrapper'
    );
    expect(css).toMatch(/contain:\s*layout/);
  });

  it('returns presentation prompt shell with bottom padding tokens', () => {
    const layout = getPromptCardVariantLayout('presentation');
    expect(layout.shellBottomPadding).toContain('pb-4');
    expect(layout.shellBottomPadding).toContain('md:pb-8');
  });

  it('returns presentation layout with larger typography and wrapper', () => {
    const layout = getPrayerCardVariantLayout('presentation');
    expect(layout.bandSize).toBe('sm');
    expect(layout.titleClasses).toContain('text-xl');
    expect(layout.titleClasses).toContain('lg:text-5xl');
    expect(layout.shellPaddingClasses).toContain('px-4');
    expect(layout.shellPaddingClasses).toContain('md:px-8');
    expect(layout.usePresentationWrapper).toBe(true);
    expect(layout.headerBleedClasses).toContain('md:-mx-8');
    expect(layout.updateRowSize).toBe('sm');
    expect(layout.showTourAnchors).toBe(false);
    expect(getUpdateRowHeaderBandRoundedClasses(layout.updateShellClass)).toContain(
      'shell-radius-xl'
    );
    expect(layout.headerBandRoundedClasses).toBe(
      PRESENTATION_CARD_HEADER_BAND_ROUNDED_CLASSES
    );
    expect(layout.presentationScrollClasses).toContain('presentation-card-elevation');
    expect(layout.presentationScrollClasses).toContain('overflow-hidden');
    expect(layout.presentationScrollClasses).toContain('rounded-3xl');
    expect(layout.shellBaseClasses).toContain('overflow-y-auto');
    expect(layout.shellBaseClasses).toContain('presentation-card-scroll');
    expect(layout.shellBaseClasses).not.toContain('rounded-3xl');
    expect(layout.shellBaseClasses).not.toContain('flex-1');
  });
});

describe('getPromptCardVariantLayout', () => {
  it('returns home prompt layout with interactive type header', () => {
    const layout = getPromptCardVariantLayout('home');
    expect(layout.bandSize).toBe('sm');
    expect(layout.typeHeaderInteractive).toBe(true);
    expect(layout.usePresentationWrapper).toBe(false);
  });

  it('returns presentation prompt layout with larger typography', () => {
    const layout = getPromptCardVariantLayout('presentation');
    expect(layout.bandSize).toBe('sm');
    expect(layout.titleClasses).toContain('text-xl');
    expect(layout.titleClasses).toContain('lg:text-5xl');
    expect(layout.typeHeaderInteractive).toBe(false);
    expect(layout.usePresentationWrapper).toBe(true);
  });
});

describe('getMetaHeaderBandLayoutClasses', () => {
  it('presentation layout uses the same meta header tokens as home sm', () => {
    const home = getMetaHeaderBandLayoutClasses();
    const presentation = getPrayerCardVariantLayout('presentation');
    expect(getMetaHeaderBandLayoutClasses(presentation.bandSize)).toEqual(home);
  });
});

describe('PRAYER_CARD_PERSONAL_CATEGORY_HEADER_INSET_CLASSES', () => {
  it('uses the same left inset as other prayer card headers', () => {
    const personalTokens = PRAYER_CARD_PERSONAL_CATEGORY_HEADER_INSET_CLASSES.split(
      /\s+/
    );
    const sharedTokens = PRAYER_CARD_HEADER_INSET_CLASSES.split(/\s+/);
    expect(sharedTokens).toEqual(['px-4', 'sm:px-6']);
    expect(personalTokens).toContain('pl-4');
    expect(personalTokens).toContain('sm:pl-6');
    expect(personalTokens).not.toContain('pl-2');
    expect(personalTokens).not.toContain('sm:px-3');
  });
});

describe('PRAYER_CARD_PERSONAL_CATEGORY_HEADER_TEXT_CLASSES', () => {
  it('uses smaller type on mobile so more of the category name fits', () => {
    const tokens = PRAYER_CARD_PERSONAL_CATEGORY_HEADER_TEXT_CLASSES.split(/\s+/);
    expect(tokens).toContain('text-[12px]');
    expect(tokens).toContain('sm:text-[14px]');
    expect(tokens).not.toContain('text-[14px]');
  });
});

describe('PRAYER_CARD_ACTION_ROW_MOBILE_LOCK_CLASS', () => {
  it('is wired on prayer and prompt card action rows', () => {
    const componentsDir = join(dirname(fileURLToPath(import.meta.url)), '../components');
    const prayerRow = readFileSync(
      join(componentsDir, 'prayer-card/prayer-card-actions-row.component.html'),
      'utf8'
    );
    const promptRow = readFileSync(
      join(componentsDir, 'prompt-card/prompt-card-actions-row.component.html'),
      'utf8'
    );
    expect(prayerRow).toContain('actionRowMobileLockClass');
    expect(promptRow).toContain('actionRowMobileLockClass');
    expect(PRAYER_CARD_ACTION_ROW_MOBILE_LOCK_CLASS).toBe(
      'prayer-card-action-row-mobile-lock'
    );
  });

  it('keeps Journal between Add Update and Pray For and uses the shared button classes', () => {
    const componentsDir = join(dirname(fileURLToPath(import.meta.url)), '../components');
    const prayerRow = readFileSync(
      join(componentsDir, 'prayer-card/prayer-card-actions-row.component.html'),
      'utf8'
    );
    const promptRow = readFileSync(
      join(componentsDir, 'prompt-card/prompt-card-actions-row.component.html'),
      'utf8'
    );
    const addUpdate = prayerRow.indexOf('Add Update');
    const journal = prayerRow.indexOf('prayer-card-journal-button');
    const prayFor = prayerRow.indexOf('Pray For');
    expect(addUpdate).toBeGreaterThan(-1);
    expect(journal).toBeGreaterThan(addUpdate);
    expect(prayFor).toBeGreaterThan(journal);
    expect(prayerRow).toContain('variantLayout.actionButtonClasses');
    expect(promptRow).not.toContain('prayer-card-journal-button');
  });

  it('hides the Journal word on a phone and keeps the restored padding and gap', () => {
    const componentsDir = join(dirname(fileURLToPath(import.meta.url)), '../components');
    const prayerRow = readFileSync(
      join(componentsDir, 'prayer-card/prayer-card-actions-row.component.html'),
      'utf8'
    );
    expect(prayerRow).toContain('class="prayer-card-journal-label">Journal</span>');
    expect(prayerRow).toContain('btn-chip-blue');

    const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8').replace(
      /\r\n/g,
      '\n'
    );
    const mediaStart = css.indexOf('@media (max-width: 639px)');
    const lock = css.indexOf('.prayer-card-action-row-mobile-lock', mediaStart);
    const memorize = css.indexOf('Memorize practice modal header', lock);
    const phoneLock = css.slice(lock, memorize);
    expect(phoneLock).toContain('gap: 4px');
    expect(phoneLock).toContain('padding-left: 8px');
    expect(phoneLock).toContain('padding-right: 8px');
    expect(phoneLock).toContain('font-size: calc(12px / var(--os-text-zoom, 1))');
    expect(phoneLock).toContain('.prayer-card-journal-label {\n    display: none;\n  }');
    expect(phoneLock).not.toContain('padding-left: 2px');
    expect(phoneLock).not.toContain('padding-left: 4px');
    expect(phoneLock).not.toContain('gap: 1px');
    expect(phoneLock).not.toContain('gap: 2px');
    expect(phoneLock).not.toContain('margin-left: -8px');
    expect(phoneLock).not.toContain('font-size: calc(10px / var(--os-text-zoom, 1))');
    expect(phoneLock).not.toContain('width: 32px');
    expect(css.slice(memorize)).not.toContain('.prayer-card-journal-label');
  });

  it('documents seasonal prayer update row body lighter than header band', () => {
    const cssPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../styles.css'
    );
    const css = readFileSync(cssPath, 'utf8');
    expect(css).toContain('--color-card-meta-header-band: #d6d1cb');
    expect(css).toContain('--theme-surface-inset: #e8e5e1');
    const blossomBlock = css.match(/html\.blossom \{[\s\S]*?\n\}/);
    expect(blossomBlock?.[0]).toContain('--color-card-meta-header-band: #f6d5de');
    expect(blossomBlock?.[0]).toContain('--theme-surface-inset: #fff7f9');
    expect(css).toContain('prayer-update-row-shell');
    expect(css).toContain('prayer-update-row-body');
  });
});
