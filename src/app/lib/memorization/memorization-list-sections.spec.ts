import { describe, expect, it } from 'vitest';
import type { MemorizedItem } from '../../types/memorization';
import {
  buildFilteredMemorizedList,
  memorizedVerseSectionsFromItems,
} from './memorization-list-sections';

function item(
  partial: Pick<MemorizedItem, 'id' | 'reference'> & Partial<MemorizedItem>
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

describe('buildFilteredMemorizedList', () => {
  const john = item({
    id: '1',
    reference: 'John 3:16',
    translation: 'kjv',
    practiceSessions: sessions(1),
  });
  const romans = item({
    id: '2',
    reference: 'Romans 8:28',
    practiceSessions: sessions(4),
  });
  const mastered = item({
    id: '3',
    reference: 'Psalm 23:1',
    practiceSessions: sessions(9),
  });

  it('filters once and builds card sections from the same list', () => {
    const { filtered, sections } = buildFilteredMemorizedList(
      [john, romans, mastered],
      'rom'
    );
    expect(filtered).toEqual([romans]);
    expect(sections.map((s) => s.title)).toEqual(['Practicing']);
    expect(sections[0]!.items).toEqual([romans]);
  });

  it('returns all non-empty mastery sections when search is empty', () => {
    const { filtered, sections } = buildFilteredMemorizedList(
      [john, romans, mastered],
      ''
    );
    expect(filtered).toHaveLength(3);
    expect(sections.map((s) => s.title)).toEqual([
      'Learning',
      'Practicing',
      'Mastered',
    ]);
  });
});

describe('memorizedVerseSectionsFromItems', () => {
  it('omits empty mastery buckets', () => {
    const learning = item({
      id: 'l',
      reference: 'John 3:16',
      practiceSessions: sessions(1),
    });
    const sections = memorizedVerseSectionsFromItems([learning]);
    expect(sections.map((s) => s.title)).toEqual(['Learning']);
  });
});
