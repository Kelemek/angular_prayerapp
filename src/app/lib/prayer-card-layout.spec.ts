import { describe, it, expect } from 'vitest';
import {
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
    expect(prayerTokens).not.toContain('overflow-hidden');
    expect(promptTokens).not.toContain('overflow-hidden');
    expect(prayer.headerBandRoundedClasses).toBe(
      PRAYER_CARD_HEADER_BAND_ROUNDED_CLASSES
    );
    expect(prompt.headerBandRoundedClasses).toBe(
      PRAYER_CARD_HEADER_BAND_ROUNDED_CLASSES
    );
    expect(prayer.headerBandRoundedClasses).not.toBe('rounded-t-lg');
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
