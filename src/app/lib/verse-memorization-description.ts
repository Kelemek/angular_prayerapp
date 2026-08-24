import { stripScriptureForMemorization } from './memorization/strip-scripture-for-memorization';
import type { PrayerRequest } from '../services/prayer.service';

/** Canonical reference for verse memorization prayers (card button, deep links). */
export function verseReferenceFromPrayer(prayer: PrayerRequest): string {
  return prayer.verse_reference?.trim() ?? prayer.title.trim();
}

/** Append reference to stored passage text so legacy clients that only render `description` still show it. */
export function appendVerseReferenceToDescription(
  verseText: string,
  reference: string
): string {
  const text = verseText.trim();
  const ref = reference.trim();
  if (!text) {
    return ref;
  }
  if (!ref || text.endsWith(ref)) {
    return text;
  }
  return `${text} ${ref}`;
}

/** Display text for verse memorization cards (strips markers; ensures reference at end). */
export function verseMemorizationTextForDisplay(
  description: string | null | undefined,
  reference: string | null | undefined
): string {
  const ref = reference?.trim() ?? '';
  const stored = description?.trim();
  if (stored) {
    const text = stripScriptureForMemorization(stored);
    return appendVerseReferenceToDescription(text, ref);
  }
  return ref;
}
