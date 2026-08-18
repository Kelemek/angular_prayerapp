import { describe, expect, it } from 'vitest';
import { buildSaddleStitchBookletHtml } from './print-booklet-html';
import { buildPrintPersonalPrayerListDocumentHtml } from './print-personal-prayer-list-html';
import { buildPrintPrayerListDocumentHtml } from './print-prayer-list-html';
import { buildPrintPromptListDocumentHtml } from './print-prompt-list-html';

function extractStyleBlock(html: string): string {
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  return match?.[1] ?? '';
}

/** Regression: phase-2 extraction must close @media blocks so print rules apply on screen preview + print. */
describe('print HTML embedded CSS media queries', () => {
  it('prayer list closes screen and print blocks before @page', () => {
    const style = extractStyleBlock(buildPrintPrayerListDocumentHtml([], 'month', 'https://example.com/qr'));
    expect(style).toMatch(/@media screen[\s\S]*}\s*@media print/);
    expect(style).toMatch(/@media print[\s\S]*}\s*@page/);
  });

  it('prompt list closes screen and print blocks before @page', () => {
    const style = extractStyleBlock(buildPrintPromptListDocumentHtml([], 'https://example.com/qr'));
    expect(style).toMatch(/@media screen[\s\S]*}\s*@media print/);
    expect(style).toMatch(/@media print[\s\S]*}\s*@page/);
  });

  it('personal list closes screen and print blocks', () => {
    const style = extractStyleBlock(buildPrintPersonalPrayerListDocumentHtml([]));
    expect(style).toMatch(/@media screen[\s\S]*}\s*@media print/);
    expect(style).toMatch(/@media print[\s\S]*}\s*}/);
  });

  it('booklet layout rules sit outside @media print', () => {
    const style = extractStyleBlock(
      buildSaddleStitchBookletHtml(
        [],
        'month',
        '',
        null,
        null,
        null,
        [],
        [],
        'https://example.com/qr',
        '/icons/icon-512.png',
      ),
    );
    expect(style).toMatch(/@media print[\s\S]*}\s*@page/);
    const printClose = style.indexOf('@media print');
    const surfaceIdx = style.indexOf('.booklet-print-surface');
    expect(surfaceIdx).toBeGreaterThan(printClose);
    const notesPanelIdx = style.indexOf('.booklet-panel:has(.booklet-notes-page)');
    const iconPrintIdx = style.indexOf('.booklet-cover-app-icon-wrap');
    expect(notesPanelIdx).toBeGreaterThan(iconPrintIdx);
  });
});
