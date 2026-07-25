/**
 * Email formatting for memorization spotlight reminders.
 * Duplicated in send-user-hourly-memorization-reminders/index.ts (Edge deploy); keep both in sync.
 */
import { BIBLE_CANON_BOOKS_STATIC } from './bibleCanonStatic';

const BIBLE_BOOK_NAMES_LONGEST_FIRST = [...BIBLE_CANON_BOOKS_STATIC]
  .map((b) => b.name)
  .sort((a, b) => b.length - a.length);

/** Mirror collapseWhitespace from supabase/functions/scripture/index.ts. */
export function normalizeScriptureTextForEmail(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

/** Parse space-joined bible books plain text back into individual book names. */
export function parseBibleBooksPlainText(plain: string): string[] {
  const books: string[] = [];
  let remaining = plain.trim();
  while (remaining.length > 0) {
    const name = BIBLE_BOOK_NAMES_LONGEST_FIRST.find(
      (n) => remaining === n || remaining.startsWith(`${n} `)
    );
    if (!name) break;
    books.push(name);
    remaining = remaining.slice(name.length).trimStart();
  }
  return books;
}

function escapeHtmlForEmail(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Non-breaking spaces inside multi-word book names for plain-text email. */
export function formatBibleBooksForEmailPlain(plain: string): string {
  return parseBibleBooksPlainText(plain)
    .map((name) => name.replace(/ /g, '\u00A0'))
    .join(' ');
}

/** Each book name in a nowrap span so email clients do not split "1 Kings" across lines. */
export function formatBibleBooksForEmailHtml(plain: string): string {
  return parseBibleBooksPlainText(plain)
    .map(
      (name) =>
        `<span style="white-space:nowrap;">${escapeHtmlForEmail(name)}</span>`
    )
    .join(' ');
}

/** Normalize verse text and render paragraph breaks as explicit br tags (no pre-wrap). */
export function formatVerseTextForEmailHtml(text: string): string {
  const normalized = normalizeScriptureTextForEmail(text);
  return normalized
    .split('\n\n')
    .map((paragraph) => escapeHtmlForEmail(paragraph))
    .join('<br><br>');
}

export interface FormatSpotlightBodyForEmailOptions {
  kind: 'verse' | 'bibleBooks';
  text: string;
}

export function formatSpotlightBodyForEmailHtml(opts: FormatSpotlightBodyForEmailOptions): string {
  if (!opts.text.trim()) return '';
  if (opts.kind === 'bibleBooks') {
    return formatBibleBooksForEmailHtml(opts.text);
  }
  return formatVerseTextForEmailHtml(opts.text);
}

export function formatSpotlightBodyForEmailPlain(opts: FormatSpotlightBodyForEmailOptions): string {
  if (!opts.text.trim()) return '';
  if (opts.kind === 'bibleBooks') {
    return formatBibleBooksForEmailPlain(opts.text);
  }
  return normalizeScriptureTextForEmail(opts.text);
}
