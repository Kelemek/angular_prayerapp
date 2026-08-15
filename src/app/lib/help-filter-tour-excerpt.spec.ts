import { describe, expect, it } from 'vitest';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from './help-filter-tour-excerpt';

const FILTER_OPTIONS_HELP =
  'The main filter row has **Public**, **Personal**, **Prompts**, **Memorize**, and optionally **Members**. The active tab is highlighted with a colored border. Tap **Public** for community prayers, then use the **Current**, **Answered**, and **Total** chips that appear below. **Personal**, **Prompts**, and **Memorize** each show their own sub-filter chips under the main row when selected.';

describe('excerptForNamedFilter', () => {
  it('extracts markdown-bold filter clauses from Filter Options help', () => {
    expect(excerptForNamedFilter(FILTER_OPTIONS_HELP, 'Current')).toBe(
      '**Current**, **Answered**, and **Total** chips that appear below.'
    );
    expect(excerptForNamedFilter(FILTER_OPTIONS_HELP, 'Answered')).toBe(
      '**Answered**, and **Total** chips that appear below.'
    );
    expect(excerptForNamedFilter(FILTER_OPTIONS_HELP, 'Prompts')).toBe(
      '**Prompts**, and **Memorize** each show their own sub-filter chips under the main row when selected.'
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
      'Use filters: under **Public**, **Current** shows active community prayers, **Answered** shows answered ones, and **Total** shows all.';
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
  it('rejects chip-list fragments without explanatory verbs', () => {
    expect(
      isDescriptiveFilterTourExcerpt(
        '**Answered**, and **Total** chips that appear below.'
      )
    ).toBe(false);
  });

  it('accepts legacy quoted clauses with verbs', () => {
    expect(
      isDescriptiveFilterTourExcerpt('"Answered" shows answered ones')
    ).toBe(true);
  });
});
