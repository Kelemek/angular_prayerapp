import { BIBLE_CANON_BOOKS_STATIC } from './bibleCanonStatic'

/** Verse count for Protestant one-chapter books (Obadiah, Philemon, 2–3 John, Jude). */
const SINGLE_CHAPTER_BOOK_VERSES = new Map(
  BIBLE_CANON_BOOKS_STATIC.filter((b) => b.versesPerChapter.length === 1).map((b) => [
    b.name.toLowerCase(),
    b.versesPerChapter[0]!,
  ])
)

/**
 * Parse a scripture reference into components (shared by DB-backed and API.Bible paths).
 * Examples: "John 3:16", "Genesis 1:1-3", "Psalm 23", "Isaiah 40:25–26"
 * Handles both hyphens (-) and en dashes (–) in verse ranges.
 * Strips letter suffixes like "a", "b" from verse numbers.
 */
export function parseReference(
  reference: string
): { book: string; chapter: number; verseStart: number | null; verseEnd: number | null } | null {
  const normalized = reference.replace(/–/g, '-').replace(/(\d+)[a-z]+/g, '$1')

  const match = normalized.match(/^(.+?)\s+(\d+)(?::\s*(\d+)(?:\s*-\s*(\d+))?)?$/)
  if (!match) return null

  return {
    book: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verseStart: match[3] ? parseInt(match[3], 10) : null,
    verseEnd: match[4] ? parseInt(match[4], 10) : null,
  }
}

/**
 * Split a display reference so the book name can ellipsize while chapter/verse
 * stays fully visible (e.g. "1 Thessalonians" truncates, "5:16-18" does not).
 * Non-verse labels (Bible Books, free text) return the whole string as `book`.
 */
export function splitScriptureReferenceDisplay(reference: string): {
  book: string;
  citation: string | null;
} {
  const trimmed = reference.trim()
  const match = trimmed.match(/^(.+?)\s+(\d+(?::\s*\d+(?:\s*[-–]\s*\d+)?)?)$/)
  if (!match) {
    return { book: trimmed, citation: null }
  }
  return {
    book: match[1]!.trim(),
    citation: match[2]!.replace(/\s+/g, ''),
  }
}

/** True for references like "Genesis 1" or "Psalm 23" (no `:verse`). */
export function isChapterOnlyScriptureReference(reference: string): boolean {
  const parsed = parseReference(reference.trim())
  return parsed !== null && parsed.verseStart === null
}

/** True when the reference is exactly one verse (e.g. John 3:16, not a range or chapter-only). */
export function isSingleVerseScriptureReference(reference: string): boolean {
  const parsed = parseReference(reference.trim())
  if (!parsed || parsed.verseStart === null) return false
  return parsed.verseEnd === null || parsed.verseEnd === parsed.verseStart
}

/**
 * Inclusive verse count for a verse or verse-range reference.
 * Returns null for chapter-only refs (e.g. Psalm 23) and unparseable strings.
 */
export function scriptureReferenceVerseCount(reference: string): number | null {
  const parsed = parseReference(reference.trim())
  if (!parsed || parsed.verseStart === null) return null
  const end = parsed.verseEnd ?? parsed.verseStart
  const lo = Math.min(parsed.verseStart, end)
  const hi = Math.max(parsed.verseStart, end)
  return hi - lo + 1
}

/**
 * Spoken form for Whisper prompts and STT hints — no colon (users say "3 16", not "3:16").
 * Example: `2 Timothy 3:16` → `2 Timothy 3 16`.
 */
export function formatSpokenScriptureReference(reference: string): string {
  const parsed = parseReference(reference.trim())
  if (!parsed) return reference.trim()
  const parts = [parsed.book, String(parsed.chapter)]
  if (parsed.verseStart !== null) {
    parts.push(String(parsed.verseStart))
    if (parsed.verseEnd !== null && parsed.verseEnd !== parsed.verseStart) {
      parts.push(String(parsed.verseEnd))
    }
  }
  return parts.join(' ')
}

/** Build a verse reference from a chapter-level reference and verse number (`Genesis 1` + `16` → `Genesis 1:16`). */
export function buildVerseReferenceFromChapter(
  chapterReference: string,
  verse: number
): string | null {
  return buildVerseRangeReferenceFromChapter(chapterReference, verse, null)
}

/** Build a verse or verse-range reference from a chapter-level reference. */
export function buildVerseRangeReferenceFromChapter(
  chapterReference: string,
  verseStart: number,
  verseEnd: number | null
): string | null {
  if (!Number.isFinite(verseStart) || verseStart < 1) return null
  const parsed = parseReference(chapterReference.trim())
  if (!parsed) return null
  if (verseEnd === null || verseEnd === verseStart) {
    return `${parsed.book} ${parsed.chapter}:${verseStart}`
  }
  if (!Number.isFinite(verseEnd) || verseEnd < 1) return null
  const lo = Math.min(verseStart, verseEnd)
  const hi = Math.max(verseStart, verseEnd)
  return `${parsed.book} ${parsed.chapter}:${lo}-${hi}`
}

/** Stable key for matching chapter-level references (`Genesis 1`, `Genesis 1:16`, etc.). */
export function scriptureChapterReferenceKey(reference: string): string | null {
  const normalized = reference.trim().replace(/\s+/g, ' ')
  const parsed = parseReference(normalized)
  if (!parsed) return null
  return `${parsed.book.toLowerCase()}|${parsed.chapter}`
}

export function singleChapterBookVerseCount(book: string): number | null {
  return SINGLE_CHAPTER_BOOK_VERSES.get(book.trim().toLowerCase()) ?? null
}

/**
 * M'Cheyne-style refs like `Obadiah 1` / `Jude 1` name the only chapter of a one-chapter book,
 * not verse 1. Multi-chapter books (`Genesis 1`) are unchanged.
 */
export function isSingleChapterBookChapterOneReference(reference: string): boolean {
  const parsed = parseReference(reference.trim())
  if (!parsed || parsed.verseStart !== null) return false
  if (parsed.chapter !== 1) return false
  return singleChapterBookVerseCount(parsed.book) != null
}

/**
 * ESV passage text/audio treat `Obadiah 1` as verse 1; expand to the full chapter for providers.
 */
export function scriptureReferenceForPassageQuery(reference: string): string {
  const trimmed = reference.trim()
  if (!isSingleChapterBookChapterOneReference(trimmed)) return trimmed
  const parsed = parseReference(trimmed)
  if (!parsed) return trimmed
  const lastVerse = singleChapterBookVerseCount(parsed.book)
  if (lastVerse == null) return trimmed
  return `${parsed.book} 1:1-${lastVerse}`
}
