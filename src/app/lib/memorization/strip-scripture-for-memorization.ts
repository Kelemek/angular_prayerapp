import { stripHtmlTags } from './stripHtmlTags';

/**
 * Print markers that appear in some KJV (and similar) sources but are not
 * typable on a normal keyboard — e.g. paragraph/pilcrow signs.
 * Also removes spaces/tabs immediately after the mark so display text does not
 * keep a leading gap ("¶ For" → "For") while preserving newlines.
 */
const NON_TYPABLE_SCRIPTURE_MARKS = /[\u00B6]+[ \t]*/g;

/**
 * Remove non-typable print marks (e.g. KJV pilcrow) for display or practice.
 * Preserves newlines; does not collapse general whitespace.
 */
export function stripNonTypableScriptureMarks(text: string): string {
  return text.replace(NON_TYPABLE_SCRIPTURE_MARKS, '');
}

/** Strip HTML, ESV verse markers like [16], and non-typable print marks before memorization. */
export function stripScriptureForMemorization(text: string): string {
  const plain = stripHtmlTags(text);
  return stripNonTypableScriptureMarks(plain.replace(/\[\d+\]/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}
