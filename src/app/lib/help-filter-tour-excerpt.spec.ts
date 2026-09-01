import { describe, expect, it } from 'vitest';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from './help-filter-tour-excerpt';

const FILTER_OPTIONS_HELP =
  'The main filter row has **Church**, **Personal**, and **Memorize**. The active tab looks like a folder tab whose color fills the section below. Tap **Church** for community prayers, then use the **Current**, **Answered**, **Archived**, and **Total** filter chips in that section. **Prompts** shows prayer prompt cards under Church. If your church maps a Planning Center list, **Members** also appears after Prompts. **Personal** and **Memorize** each show their own filter chips in the tab section when selected.';

describe('excerptForNamedFilter', () => {
  it('extracts markdown-bold filter clauses from Filter Options help', () => {
    expect(excerptForNamedFilter(FILTER_OPTIONS_HELP, 'Current')).toBe(
      '**Current**, **Answered**, **Archived**, and **Total** filter chips in that section.'
    );
    expect(excerptForNamedFilter(FILTER_OPTIONS_HELP, 'Answered')).toBe(
      '**Answered**, **Archived**, and **Total** filter chips in that section.'
    );
    expect(excerptForNamedFilter(FILTER_OPTIONS_HELP, 'Prompts')).toBe(
      '**Prompts** shows prayer prompt cards under Church.'
    );
    expect(excerptForNamedFilter(FILTER_OPTIONS_HELP, 'Members')).toBe(
      '**Members** also appears after Prompts.'
    );
  });

  it('still supports legacy quoted filter names', () => {
    const legacy =
      'Use filters: "Current" shows active prayers, "Answered" shows answered ones, and "Prompts" displays cards.';
    expect(excerptForNamedFilter(legacy, 'Current')).toBe(
      '"Current" shows active prayers'
    );
    expect(excerptForNamedFilter(legacy, 'Answered')).toBe(
      '"Answered" shows answered ones'
    );
    expect(excerptForNamedFilter(legacy, 'Prompts')).toBe(
      '"Prompts" displays cards.'
    );
  });

  it('stops markdown-bold excerpts at the next filter clause in one sentence', () => {
    const combined =
      'Use filters: under **Church**, **Current** shows active community prayers, **Answered** shows answered ones, and **Total** shows all.';
    expect(excerptForNamedFilter(combined, 'Current')).toBe(
      '**Current** shows active community prayers'
    );
    expect(excerptForNamedFilter(combined, 'Answered')).toBe(
      '**Answered** shows answered ones'
    );
    expect(excerptForNamedFilter(combined, 'Total')).toBe(
      '**Total** shows all.'
    );
  });

  it('returns empty string when the filter name is absent', () => {
    expect(excerptForNamedFilter(FILTER_OPTIONS_HELP, 'Zebra')).toBe('');
  });
});

describe('isDescriptiveFilterTourExcerpt', () => {
  it('rejects list-only fragments without explanatory verbs', () => {
    expect(
      isDescriptiveFilterTourExcerpt(
        '**Answered**, **Archived**, and **Total** filter chips in that section.'
      )
    ).toBe(false);
  });

  it('accepts legacy quoted clauses with verbs', () => {
    expect(
      isDescriptiveFilterTourExcerpt('"Answered" shows answered ones')
    ).toBe(true);
  });
});
