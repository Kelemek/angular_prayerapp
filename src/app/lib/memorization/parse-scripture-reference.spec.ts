import { describe, it, expect } from 'vitest';
import {
  parseReference,
  splitScriptureReferenceDisplay,
  isChapterOnlyScriptureReference,
  isSingleVerseScriptureReference,
  scriptureReferenceVerseCount,
  formatSpokenScriptureReference,
  buildVerseReferenceFromChapter,
  buildVerseRangeReferenceFromChapter,
  scriptureChapterReferenceKey,
  singleChapterBookVerseCount,
  isSingleChapterBookChapterOneReference,
  scriptureReferenceForPassageQuery,
} from './parse-scripture-reference';

describe('parseReference', () => {
  it('parses single verse', () => {
    expect(parseReference('John 3:16')).toEqual({
      book: 'John',
      chapter: 3,
      verseStart: 16,
      verseEnd: null,
    });
  });

  it('parses verse range with hyphen', () => {
    expect(parseReference('Genesis 1:1-3')).toEqual({
      book: 'Genesis',
      chapter: 1,
      verseStart: 1,
      verseEnd: 3,
    });
  });

  it('parses verse range with en dash', () => {
    expect(parseReference('Isaiah 40:25–26')).toEqual({
      book: 'Isaiah',
      chapter: 40,
      verseStart: 25,
      verseEnd: 26,
    });
  });

  it('parses chapter-only reference', () => {
    expect(parseReference('Psalm 23')).toEqual({
      book: 'Psalm',
      chapter: 23,
      verseStart: null,
      verseEnd: null,
    });
  });

  it('strips letter suffixes from verse numbers', () => {
    expect(parseReference('John 3:16a')).toEqual({
      book: 'John',
      chapter: 3,
      verseStart: 16,
      verseEnd: null,
    });
  });

  it('returns null for invalid reference', () => {
    expect(parseReference('not a reference')).toBeNull();
    expect(parseReference('')).toBeNull();
  });
});

describe('splitScriptureReferenceDisplay', () => {
  it('splits book from verse citation', () => {
    expect(splitScriptureReferenceDisplay('John 3:16')).toEqual({
      book: 'John',
      citation: '3:16',
    });
  });

  it('splits numbered books and ranges', () => {
    expect(splitScriptureReferenceDisplay('1 Thessalonians 5:16-18')).toEqual({
      book: '1 Thessalonians',
      citation: '5:16-18',
    });
  });

  it('splits chapter-only references', () => {
    expect(splitScriptureReferenceDisplay('Psalm 23')).toEqual({
      book: 'Psalm',
      citation: '23',
    });
  });

  it('returns whole label when there is no citation', () => {
    expect(splitScriptureReferenceDisplay('Bible Books (OT)')).toEqual({
      book: 'Bible Books (OT)',
      citation: null,
    });
  });
});

describe('isChapterOnlyScriptureReference', () => {
  it('returns true for chapter-only refs', () => {
    expect(isChapterOnlyScriptureReference('Genesis 1')).toBe(true);
    expect(isChapterOnlyScriptureReference('Psalm 23')).toBe(true);
  });

  it('returns false for verse refs', () => {
    expect(isChapterOnlyScriptureReference('John 3:16')).toBe(false);
  });

  it('returns false for invalid refs', () => {
    expect(isChapterOnlyScriptureReference('invalid')).toBe(false);
  });
});

describe('formatSpokenScriptureReference', () => {
  it('uses spaces instead of colon for verse refs', () => {
    expect(formatSpokenScriptureReference('John 3:16')).toBe('John 3 16');
    expect(formatSpokenScriptureReference('2 Timothy 3:16')).toBe('2 Timothy 3 16');
    expect(formatSpokenScriptureReference('Romans 8:28')).toBe('Romans 8 28');
  });

  it('leaves chapter-only refs unchanged', () => {
    expect(formatSpokenScriptureReference('Psalm 23')).toBe('Psalm 23');
  });
});

describe('isSingleVerseScriptureReference', () => {
  it('returns true for single-verse refs', () => {
    expect(isSingleVerseScriptureReference('John 3:16')).toBe(true);
    expect(isSingleVerseScriptureReference('Genesis 1:1')).toBe(true);
  });

  it('returns false for ranges and chapter-only refs', () => {
    expect(isSingleVerseScriptureReference('John 3:16-18')).toBe(false);
    expect(isSingleVerseScriptureReference('Psalm 23')).toBe(false);
  });
});

describe('scriptureReferenceVerseCount', () => {
  it('counts single verses and ranges', () => {
    expect(scriptureReferenceVerseCount('John 3:16')).toBe(1);
    expect(scriptureReferenceVerseCount('John 3:16-18')).toBe(3);
    expect(scriptureReferenceVerseCount('Genesis 1:1-5')).toBe(5);
    expect(scriptureReferenceVerseCount('Genesis 1:5-1')).toBe(5);
  });

  it('returns null for chapter-only and invalid refs', () => {
    expect(scriptureReferenceVerseCount('Psalm 23')).toBeNull();
    expect(scriptureReferenceVerseCount('Genesis 1')).toBeNull();
    expect(scriptureReferenceVerseCount('not a reference')).toBeNull();
  });
});

describe('buildVerseReferenceFromChapter', () => {
  it('builds verse reference from chapter', () => {
    expect(buildVerseReferenceFromChapter('Genesis 1', 16)).toBe('Genesis 1:16');
  });

  it('returns null for invalid chapter ref or verse', () => {
    expect(buildVerseReferenceFromChapter('invalid', 1)).toBeNull();
    expect(buildVerseReferenceFromChapter('Genesis 1', 0)).toBeNull();
  });
});

describe('buildVerseRangeReferenceFromChapter', () => {
  it('builds single verse', () => {
    expect(buildVerseRangeReferenceFromChapter('Genesis 1', 1, null)).toBe('Genesis 1:1');
    expect(buildVerseRangeReferenceFromChapter('Genesis 1', 1, 1)).toBe('Genesis 1:1');
  });

  it('builds verse range with normalized order', () => {
    expect(buildVerseRangeReferenceFromChapter('Genesis 1', 3, 1)).toBe('Genesis 1:1-3');
  });

  it('returns null for invalid inputs', () => {
    expect(buildVerseRangeReferenceFromChapter('bad', 1, 2)).toBeNull();
    expect(buildVerseRangeReferenceFromChapter('Genesis 1', -1, 2)).toBeNull();
    expect(buildVerseRangeReferenceFromChapter('Genesis 1', 1, -1)).toBeNull();
  });
});

describe('scriptureChapterReferenceKey', () => {
  it('returns stable key for chapter-level refs', () => {
    expect(scriptureChapterReferenceKey('Genesis 1')).toBe('genesis|1');
    expect(scriptureChapterReferenceKey('Genesis 1:16')).toBe('genesis|1');
  });

  it('normalizes whitespace', () => {
    expect(scriptureChapterReferenceKey('  Genesis   1  ')).toBe('genesis|1');
  });

  it('returns null for invalid refs', () => {
    expect(scriptureChapterReferenceKey('nope')).toBeNull();
  });
});

describe('singleChapterBookVerseCount', () => {
  it('returns verse count for one-chapter books', () => {
    expect(singleChapterBookVerseCount('Obadiah')).toBeGreaterThan(0);
    expect(singleChapterBookVerseCount('Philemon')).toBeGreaterThan(0);
    expect(singleChapterBookVerseCount('Jude')).toBeGreaterThan(0);
  });

  it('returns null for multi-chapter books', () => {
    expect(singleChapterBookVerseCount('Genesis')).toBeNull();
    expect(singleChapterBookVerseCount('John')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(singleChapterBookVerseCount('obadiah')).toBe(singleChapterBookVerseCount('Obadiah'));
  });
});

describe('isSingleChapterBookChapterOneReference', () => {
  it('returns true for Obadiah 1 style refs', () => {
    expect(isSingleChapterBookChapterOneReference('Obadiah 1')).toBe(true);
    expect(isSingleChapterBookChapterOneReference('Jude 1')).toBe(true);
  });

  it('returns false for multi-chapter book chapter refs', () => {
    expect(isSingleChapterBookChapterOneReference('Genesis 1')).toBe(false);
  });

  it('returns false when verse is specified', () => {
    expect(isSingleChapterBookChapterOneReference('Obadiah 1:1')).toBe(false);
  });
});

describe('scriptureReferenceForPassageQuery', () => {
  it('expands single-chapter book chapter-one refs to full chapter', () => {
    const expanded = scriptureReferenceForPassageQuery('Obadiah 1');
    expect(expanded).toMatch(/^Obadiah 1:1-/);
  });

  it('leaves normal refs unchanged', () => {
    expect(scriptureReferenceForPassageQuery('John 3:16')).toBe('John 3:16');
    expect(scriptureReferenceForPassageQuery('Genesis 1')).toBe('Genesis 1');
  });
});
