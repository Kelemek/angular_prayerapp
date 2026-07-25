import { describe, expect, it } from 'vitest';
import { bibleBooksPlainText } from './bibleBooksMemorization';
import {
  formatBibleBooksForEmailHtml,
  formatBibleBooksForEmailPlain,
  formatSpotlightBodyForEmailHtml,
  formatSpotlightBodyForEmailPlain,
  formatVerseTextForEmailHtml,
  normalizeScriptureTextForEmail,
  parseBibleBooksPlainText,
} from './memorization-email-format';

describe('memorization-email-format', () => {
  it('normalizeScriptureTextForEmail collapses single newlines within paragraphs', () => {
    expect(normalizeScriptureTextForEmail('line one\nline two')).toBe('line one line two');
  });

  it('normalizeScriptureTextForEmail preserves paragraph breaks', () => {
    expect(normalizeScriptureTextForEmail('para one\n\npara two')).toBe('para one\n\npara two');
  });

  it('parseBibleBooksPlainText round-trips bibleBooksPlainText(all)', () => {
    const plain = bibleBooksPlainText('all');
    const parsed = parseBibleBooksPlainText(plain);
    expect(parsed).toHaveLength(66);
    expect(parsed).toContain('1 Kings');
    expect(parsed).toContain('2 Timothy');
    expect(parsed).toContain('Song of Solomon');
    expect(parsed.join(' ')).toBe(plain);
  });

  it('formatBibleBooksForEmailHtml wraps each book in nowrap spans', () => {
    const plain = 'Genesis Exodus 1 Kings 2 Kings 2 Timothy Titus';
    const html = formatBibleBooksForEmailHtml(plain);
    expect(html).toContain('white-space:nowrap');
    expect(html).toContain('1 Kings');
    expect(html).toContain('2 Timothy');
    expect(html).not.toMatch(/1<\/span>\s*<span[^>]*>Kings/);
    expect(html).not.toMatch(/2<\/span>\s*<span[^>]*>Timothy/);
  });

  it('formatBibleBooksForEmailPlain uses non-breaking spaces inside book names', () => {
    const plain = '1 Kings 2 Timothy Song of Solomon';
    const formatted = formatBibleBooksForEmailPlain(plain);
    expect(formatted).toContain('1\u00A0Kings');
    expect(formatted).toContain('2\u00A0Timothy');
    expect(formatted).toContain('Song\u00A0of\u00A0Solomon');
  });

  it('formatVerseTextForEmailHtml does not use pre-wrap and collapses stray newlines', () => {
    const text = 'Count it all joy,\nmy brothers, when you meet trials.';
    const html = formatVerseTextForEmailHtml(text);
    expect(html).not.toContain('pre-wrap');
    expect(html).toBe('Count it all joy, my brothers, when you meet trials.');
  });

  it('formatVerseTextForEmailHtml converts paragraph breaks to br tags', () => {
    const text = 'First paragraph.\n\nSecond paragraph.';
    const html = formatVerseTextForEmailHtml(text);
    expect(html).toBe('First paragraph.<br><br>Second paragraph.');
  });

  it('formatSpotlightBodyForEmailHtml dispatches on kind', () => {
    const verseHtml = formatSpotlightBodyForEmailHtml({
      kind: 'verse',
      text: 'Hello\nworld',
    });
    expect(verseHtml).toBe('Hello world');

    const booksHtml = formatSpotlightBodyForEmailHtml({
      kind: 'bibleBooks',
      text: '1 Kings 2 Kings',
    });
    expect(booksHtml).toContain('nowrap');
    expect(booksHtml).toContain('1 Kings');
  });

  it('formatSpotlightBodyForEmailPlain dispatches on kind', () => {
    const versePlain = formatSpotlightBodyForEmailPlain({
      kind: 'verse',
      text: 'Hello\nworld',
    });
    expect(versePlain).toBe('Hello world');

    const booksPlain = formatSpotlightBodyForEmailPlain({
      kind: 'bibleBooks',
      text: '1 Kings 2 Kings',
    });
    expect(booksPlain).toContain('1\u00A0Kings');
  });
});
