import { describe, expect, it } from 'vitest';
import type { MemorizedItem } from '../../types/memorization';
import {
  compareReferencesByBibleOrder,
  sortMemorizedItemsForTable,
} from './memorization-table-sort';

function item(
  partial: Pick<MemorizedItem, 'id' | 'reference'> &
    Partial<MemorizedItem>
): MemorizedItem {
  return {
    text: '',
    translation: 'esv',
    dateAdded: 1,
    lastPracticedAt: null,
    practiceSessions: [],
    ...partial,
  };
}

function sessions(count: number): MemorizedItem['practiceSessions'] {
  return Array.from({ length: count }, (_, i) => ({
    date: i,
    wrongAttempts: 0,
    correctKeystrokes: 1,
    completed: true,
  }));
}

describe('compareReferencesByBibleOrder', () => {
  it('orders Genesis before John', () => {
    const genesis = item({ id: 'g', reference: 'Genesis 1:1' });
    const john = item({ id: 'j', reference: 'John 3:16' });
    expect(compareReferencesByBibleOrder(genesis, john)).toBeLessThan(0);
  });

  it('orders John before 1 John', () => {
    const john = item({ id: 'j', reference: 'John 3:16' });
    const firstJohn = item({ id: '1j', reference: '1 John 1:1' });
    expect(compareReferencesByBibleOrder(john, firstJohn)).toBeLessThan(0);
  });

  it('orders by chapter then verse within a book', () => {
    const a = item({ id: 'a', reference: 'John 3:16' });
    const b = item({ id: 'b', reference: 'John 3:17' });
    const c = item({ id: 'c', reference: 'John 4:1' });
    expect(compareReferencesByBibleOrder(a, b)).toBeLessThan(0);
    expect(compareReferencesByBibleOrder(b, c)).toBeLessThan(0);
  });

  it('places Bible Books items after verses', () => {
    const john = item({ id: 'j', reference: 'John 3:16' });
    const books = item({
      id: 'bb',
      reference: 'Bible Books (OT)',
      kind: 'bibleBooks',
      bibleBooksScope: 'ot',
    });
    expect(compareReferencesByBibleOrder(john, books)).toBeLessThan(0);
  });

  it('places unparseable refs after Bible Books', () => {
    const books = item({
      id: 'bb',
      reference: 'Bible Books',
      kind: 'bibleBooks',
      bibleBooksScope: 'all',
    });
    const junk = item({ id: 'x', reference: 'Not a real reference' });
    expect(compareReferencesByBibleOrder(books, junk)).toBeLessThan(0);
  });
});

describe('sortMemorizedItemsForTable', () => {
  const learning = item({
    id: 'l',
    reference: 'Romans 8:28',
    practiceSessions: sessions(1),
    translation: 'kjv',
  });
  const practicing = item({
    id: 'p',
    reference: 'Genesis 1:1',
    practiceSessions: sessions(4),
    translation: 'esv',
  });
  const mastered = item({
    id: 'm',
    reference: 'John 3:16',
    practiceSessions: sessions(9),
    translation: 'niv',
  });

  it('defaults mastery ascending with Learning first', () => {
    const sorted = sortMemorizedItemsForTable(
      [mastered, practicing, learning],
      'mastery',
      'asc'
    );
    expect(sorted.map((i) => i.id)).toEqual(['l', 'p', 'm']);
  });

  it('sorts mastery descending with Mastered first', () => {
    const sorted = sortMemorizedItemsForTable(
      [learning, practicing, mastered],
      'mastery',
      'desc'
    );
    expect(sorted.map((i) => i.id)).toEqual(['m', 'p', 'l']);
  });

  it('sorts sessions numerically', () => {
    const sorted = sortMemorizedItemsForTable(
      [mastered, learning, practicing],
      'sessions',
      'asc'
    );
    expect(sorted.map((i) => i.id)).toEqual(['l', 'p', 'm']);
  });

  it('sorts reference in bible order', () => {
    const sorted = sortMemorizedItemsForTable(
      [mastered, learning, practicing],
      'reference',
      'asc'
    );
    expect(sorted.map((i) => i.reference)).toEqual([
      'Genesis 1:1',
      'John 3:16',
      'Romans 8:28',
    ]);
  });
});
