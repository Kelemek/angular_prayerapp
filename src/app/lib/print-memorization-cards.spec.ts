import { describe, expect, it } from 'vitest';
import {
  MEMORIZATION_CARDS_PER_SHEET,
  MEMORIZATION_FOLDABLE_CARDS_PER_SHEET,
  MEMORIZATION_PRINT_CONTENT_HEIGHT_FUDGE_PT,
  MEMORIZATION_PRINT_LAYOUT_VERSION,
  MEMORIZATION_PRINT_PAGE_HEIGHT_PT,
  MEMORIZATION_PRINT_PAGE_MARGIN_PT,
  IOS_DUPLEX_ROW_HEIGHT_PT,
  buildMemorizationCardsPrintHtml,
  chunkMemorizationCardsForSheets,
  computeMemorizationPrintLayout,
  mirrorBackGridForLongEdgeDuplex,
  type MemorizationPrintCard,
} from './print-memorization-cards';

function card(ref: string, text = 'Verse text'): MemorizationPrintCard {
  return { reference: ref, text, translation: 'esv' };
}

describe('print-memorization-cards', () => {
  it('chunks cards into sheets of six', () => {
    const items = Array.from({ length: 7 }, (_, i) => card(`Ref ${i + 1}`));
    expect(chunkMemorizationCardsForSheets(items)).toEqual([
      items.slice(0, 6),
      items.slice(6),
    ]);
  });

  it('mirrors columns on back grid for long-edge duplex', () => {
    const front = [
      [card('A'), card('B')],
      [card('C'), card('D')],
      [card('E'), card('F')],
    ];
    const back = mirrorBackGridForLongEdgeDuplex(front);
    expect(back[0][0]?.reference).toBe('B');
    expect(back[0][1]?.reference).toBe('A');
    expect(back[2][0]?.reference).toBe('F');
    expect(back[2][1]?.reference).toBe('E');
  });

  it('sizes content box shorter than letter printable area (pt)', () => {
    const layout = computeMemorizationPrintLayout();
    const printableH =
      MEMORIZATION_PRINT_PAGE_HEIGHT_PT - 2 * MEMORIZATION_PRINT_PAGE_MARGIN_PT;
    expect(layout.pageMarginPt).toBe(36);
    expect(layout.contentHeightPt).toBeLessThan(printableH);
    expect(layout.contentHeightPt).toBe(
      printableH - MEMORIZATION_PRINT_CONTENT_HEIGHT_FUDGE_PT
    );
  });

  it('renders a default translation label when translation is empty', () => {
    const html = buildMemorizationCardsPrintHtml(
      [{ reference: 'John 3:16', text: 'For God…', translation: '' }],
      'duplex',
    );
    expect(html).toContain('ESV');
  });

  it('uses table layout for iOS native duplex', () => {
    const html = buildMemorizationCardsPrintHtml([card('John 3:16')], 'duplex', {
      iosNativeMarkup: true,
    });
    expect(html).toContain('data-print-ios-native-duplex="true"');
    expect(html).toContain('<table class="card-grid-table"');
    expect(html).not.toContain('display: grid');
    expect(html).not.toContain('page-break-after');
    expect(html).toContain('page-break-before: always');
    expect(html).toContain(`height:${IOS_DUPLEX_ROW_HEIGHT_PT.toFixed(2)}pt`);
    expect(html).toContain('valign="middle"');
    expect(html).not.toContain('class="card card-front"');
    expect(IOS_DUPLEX_ROW_HEIGHT_PT * 3).toBeLessThan(
      computeMemorizationPrintLayout('duplex').contentHeightPt
    );
  });

  it('embeds layout version and duplex sheet breaks', () => {
    const html = buildMemorizationCardsPrintHtml([card('John 3:16')]);
    expect(html).toContain(`data-print-layout-version="${MEMORIZATION_PRINT_LAYOUT_VERSION}"`);
    expect(html).toContain('data-print-sheet-style="duplex"');
    expect(html).toContain('verses (Duplex)');
    expect(html).not.toContain('<table');
    expect(html).toContain('class="sheet-break"');
    expect(html).toContain('class="print-page sheet-front');
    expect(html).toContain('class="print-page sheet-back');
  });

  it('chunks foldable sheets as three cards per page', () => {
    const items = Array.from({ length: 4 }, (_, i) => card(`R${i + 1}`));
    expect(
      chunkMemorizationCardsForSheets(items, MEMORIZATION_FOLDABLE_CARDS_PER_SHEET)
    ).toEqual([items.slice(0, 3), items.slice(3)]);
    expect(MEMORIZATION_FOLDABLE_CARDS_PER_SHEET).toBe(3);
  });

  it('renders foldable single-sided pages with three full-width cards', () => {
    const html = buildMemorizationCardsPrintHtml([card('John 3:16', 'For God so loved')], 'foldable');
    expect(html).toContain('data-print-sheet-style="foldable"');
    expect(html).toContain('verses (Foldable)');
    expect(html).toContain('grid-template-columns: 1fr');
    expect(html).toContain('card-fold-half--front');
    expect(html).toContain('class="print-page sheet-foldable');
    expect(html).not.toContain('sheet-back');
    expect((html.match(/sheet-foldable/g) ?? []).length).toBe(1);
    expect((html.match(/<div class="card-foldable/g) ?? []).length).toBe(3);
  });

  it('uses a table and breaks before later iOS foldable pages', () => {
    const items = Array.from({ length: 4 }, (_, i) => card(`R${i + 1}`, 'Verse'));
    const html = buildMemorizationCardsPrintHtml(items, 'foldable', {
      iosNativeMarkup: true,
    });
    expect(html).toContain('data-print-ios-native-foldable="true"');
    expect(html).not.toContain('sheet-break');
    expect(html).not.toContain('page-break-after');
    expect(html).not.toContain('display: grid');
    expect((html.match(/sheet-foldable/g) ?? []).length).toBe(2);
    expect((html.match(/page-break-before: always/g) ?? []).length).toBe(1);
    expect(html).toContain('R4');
    expect(html).toContain('valign="middle"');
  });

  it('does not insert a page break for a single iOS foldable sheet', () => {
    const html = buildMemorizationCardsPrintHtml([card('John 3:16')], 'foldable', {
      iosNativeMarkup: true,
    });
    expect(html).not.toContain('page-break');
    expect((html.match(/sheet-foldable/g) ?? []).length).toBe(1);
  });

  it('renders two foldable pages for four cards', () => {
    const items = Array.from({ length: 4 }, (_, i) => card(`R${i + 1}`));
    const html = buildMemorizationCardsPrintHtml(items, 'foldable');
    expect((html.match(/sheet-foldable/g) ?? []).length).toBe(2);
    expect(html).toContain('R4');
  });

  it('renders one front and one back sheet for a single duplex card', () => {
    const html = buildMemorizationCardsPrintHtml([card('John 3:16', 'For God so loved')]);
    expect(html).toContain('John 3:16');
    expect(html).toContain('For God so loved');
    expect(html).toContain('card-back-inner');
    const frontCount = (html.match(/sheet-front/g) ?? []).length;
    const backCount = (html.match(/sheet-back/g) ?? []).length;
    expect(frontCount).toBe(1);
    expect(backCount).toBe(1);
  });

  it('renders two front/back pairs for seven duplex cards', () => {
    const items = Array.from({ length: 7 }, (_, i) => card(`R${i + 1}`));
    const html = buildMemorizationCardsPrintHtml(items);
    expect((html.match(/sheet-front/g) ?? []).length).toBe(2);
    expect((html.match(/sheet-back/g) ?? []).length).toBe(2);
    expect(html).toContain('R7');
  });

  it('escapes HTML in verse text', () => {
    const html = buildMemorizationCardsPrintHtml([
      card('Test', '<script>alert(1)</script>'),
    ]);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('uses six cards per sheet constant', () => {
    expect(MEMORIZATION_CARDS_PER_SHEET).toBe(6);
  });
});
