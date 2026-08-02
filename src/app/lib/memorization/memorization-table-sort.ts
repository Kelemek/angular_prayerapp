import type {
  MemorizationMasterLevel,
  MemorizedItem,
} from '../../types/memorization';
import { bookNameToUsfm } from './api-bible-passage-id';
import { BIBLE_CANON_BOOKS_STATIC } from './bibleCanonStatic';
import { isBibleBooksMemorizationItem } from './bibleBooksMemorization';
import {
  countCompletedSessions,
  getMasterLevel,
} from './memorization-mastery';
import type {
  MemorizeTableSortBy,
  MemorizeTableSortDirection,
} from './memorization-list-prefs';
import { parseReference } from './parse-scripture-reference';

export const MASTER_LEVEL_SORT_ORDER: Record<MemorizationMasterLevel, number> = {
  learning: 0,
  practicing: 1,
  mastered: 2,
};

const USFM_BOOK_INDEX = new Map(
  BIBLE_CANON_BOOKS_STATIC.map((book, index) => [book.id, index])
);

type ReferenceSortBucket = 'verse' | 'bibleBooks' | 'unparseable';

interface ReferenceSortKey {
  bucket: ReferenceSortBucket;
  bookIndex: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  label: string;
}

function referenceSortKey(item: MemorizedItem): ReferenceSortKey {
  const label = item.reference.trim();
  if (isBibleBooksMemorizationItem(item)) {
    return {
      bucket: 'bibleBooks',
      bookIndex: Number.MAX_SAFE_INTEGER,
      chapter: 0,
      verseStart: 0,
      verseEnd: 0,
      label,
    };
  }

  const parsed = parseReference(label);
  if (!parsed) {
    return {
      bucket: 'unparseable',
      bookIndex: Number.MAX_SAFE_INTEGER,
      chapter: 0,
      verseStart: 0,
      verseEnd: 0,
      label,
    };
  }

  const usfm = bookNameToUsfm(parsed.book);
  const bookIndex =
    usfm != null
      ? (USFM_BOOK_INDEX.get(usfm) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;
  if (bookIndex === Number.MAX_SAFE_INTEGER) {
    return {
      bucket: 'unparseable',
      bookIndex,
      chapter: 0,
      verseStart: 0,
      verseEnd: 0,
      label,
    };
  }

  const verseStart = parsed.verseStart ?? 0;
  const verseEnd = parsed.verseEnd ?? verseStart;
  return {
    bucket: 'verse',
    bookIndex,
    chapter: parsed.chapter,
    verseStart,
    verseEnd,
    label,
  };
}

const BUCKET_ORDER: Record<ReferenceSortBucket, number> = {
  verse: 0,
  bibleBooks: 1,
  unparseable: 2,
};

export function compareReferencesByBibleOrder(
  a: MemorizedItem,
  b: MemorizedItem
): number {
  const ka = referenceSortKey(a);
  const kb = referenceSortKey(b);
  const bucketDiff = BUCKET_ORDER[ka.bucket] - BUCKET_ORDER[kb.bucket];
  if (bucketDiff !== 0) return bucketDiff;
  if (ka.bucket !== 'verse') {
    return ka.label.localeCompare(kb.label);
  }
  if (ka.bookIndex !== kb.bookIndex) return ka.bookIndex - kb.bookIndex;
  if (ka.chapter !== kb.chapter) return ka.chapter - kb.chapter;
  if (ka.verseStart !== kb.verseStart) return ka.verseStart - kb.verseStart;
  if (ka.verseEnd !== kb.verseEnd) return ka.verseEnd - kb.verseEnd;
  return ka.label.localeCompare(kb.label);
}

function compareBySortKey(
  a: MemorizedItem,
  b: MemorizedItem,
  sortBy: MemorizeTableSortBy
): number {
  switch (sortBy) {
    case 'reference':
      return compareReferencesByBibleOrder(a, b);
    case 'sessions':
      return countCompletedSessions(a) - countCompletedSessions(b);
    case 'mastery': {
      const diff =
        MASTER_LEVEL_SORT_ORDER[getMasterLevel(a)] -
        MASTER_LEVEL_SORT_ORDER[getMasterLevel(b)];
      if (diff !== 0) return diff;
      // Within the same mastery level, keep bible order as a stable secondary key.
      return compareReferencesByBibleOrder(a, b);
    }
    default: {
      const _exhaustive: never = sortBy;
      return _exhaustive;
    }
  }
}

export function sortMemorizedItemsForTable(
  items: MemorizedItem[],
  sortBy: MemorizeTableSortBy,
  direction: MemorizeTableSortDirection
): MemorizedItem[] {
  const dir = direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const primary = compareBySortKey(a, b, sortBy);
    if (primary !== 0) return primary * dir;
    return a.id.localeCompare(b.id);
  });
}
