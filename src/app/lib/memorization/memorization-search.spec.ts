import { describe, it, expect } from 'vitest';
import {
  normalizeMemorizationSearchQuery,
  memorizedItemMatchesSearch,
  filterMemorizedItemsBySearch,
} from './memorization-search';
import type { MemorizedItem } from '../../types/memorization';

function verse(
  reference: string,
  translation: MemorizedItem['translation'] = 'esv'
): MemorizedItem {
  return {
    id: reference,
    reference,
    text: '',
    translation,
    dateAdded: 0,
    lastPracticedAt: null,
    practiceSessions: [],
    kind: 'verse',
  };
}

describe('normalizeMemorizationSearchQuery', () => {
  it('trims, lowercases, and collapses whitespace', () => {
    expect(normalizeMemorizationSearchQuery('  John   3:16  ')).toBe(
      'john 3:16'
    );
  });

  it('returns empty for blank input', () => {
    expect(normalizeMemorizationSearchQuery('')).toBe('');
    expect(normalizeMemorizationSearchQuery('   ')).toBe('');
    expect(normalizeMemorizationSearchQuery(null)).toBe('');
  });
});

describe('memorizedItemMatchesSearch', () => {
  const john = verse('John 3:16', 'kjv');

  it('matches all when query is empty', () => {
    expect(memorizedItemMatchesSearch(john, '')).toBe(true);
    expect(memorizedItemMatchesSearch(john, '   ')).toBe(true);
  });

  it('matches book name case-insensitively', () => {
    expect(memorizedItemMatchesSearch(john, 'john')).toBe(true);
    expect(memorizedItemMatchesSearch(john, 'JOHN')).toBe(true);
  });

  it('matches verse span', () => {
    expect(memorizedItemMatchesSearch(john, '3:16')).toBe(true);
    expect(memorizedItemMatchesSearch(john, 'john 3')).toBe(true);
  });

  it('matches translation', () => {
    expect(memorizedItemMatchesSearch(john, 'kjv')).toBe(true);
    expect(memorizedItemMatchesSearch(john, 'esv')).toBe(false);
  });

  it('matches Bible Books reference labels', () => {
    const books: MemorizedItem = {
      ...verse('Bible Books (OT)'),
      kind: 'bibleBooks',
      bibleBooksScope: 'ot',
    };
    expect(memorizedItemMatchesSearch(books, 'bible books')).toBe(true);
    expect(memorizedItemMatchesSearch(books, 'ot')).toBe(true);
  });

  it('rejects non-matching queries', () => {
    expect(memorizedItemMatchesSearch(john, 'romans')).toBe(false);
  });
});

describe('filterMemorizedItemsBySearch', () => {
  const items = [
    verse('John 3:16', 'kjv'),
    verse('Romans 8:28', 'esv'),
    verse('Psalm 23:1', 'esv'),
  ];

  it('returns all items when query is empty', () => {
    expect(filterMemorizedItemsBySearch(items, '')).toEqual(items);
  });

  it('filters by book / reference', () => {
    expect(filterMemorizedItemsBySearch(items, 'rom')).toEqual([items[1]]);
    expect(filterMemorizedItemsBySearch(items, '  23  ')).toEqual([items[2]]);
  });

  it('filters by translation', () => {
    expect(filterMemorizedItemsBySearch(items, 'kjv')).toEqual([items[0]]);
  });
});
