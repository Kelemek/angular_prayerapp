import { describe, it, expect } from 'vitest';
import {
  getMetaHeaderBandLayoutClasses,
  getPrayerCardVariantLayout,
  getPromptCardVariantLayout,
} from './prayer-card-layout';

describe('getPrayerCardVariantLayout', () => {
  it('returns compact home layout by default', () => {
    const layout = getPrayerCardVariantLayout('home');
    expect(layout.bandSize).toBe('sm');
    expect(layout.titleClasses).toContain('text-lg');
    expect(layout.usePresentationWrapper).toBe(false);
    expect(layout.showUnreadBadges).toBe(true);
    expect(layout.updateRowSize).toBe('sm');
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
