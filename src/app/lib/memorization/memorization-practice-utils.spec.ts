import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  seedRandom,
  stringToSeed,
  getWordsForMemorization,
  tokenizeMemorizationPlainWord,
  parseReferenceMemorizationTokens,
  buildMemorizationTokens,
  getTypableTokenIndices,
  formatMemorizationTokensPlain,
  memorizationIsCurrentBlank,
  memorizationShowViaHint,
  formatMemorizationReciteWhisperPrompt,
  hiddenFractionForRound,
  MEMORIZATION_FULL_HIDE_ROUND,
  referenceTextsForMemorizationReorder,
  reorderReferenceColonAfterSlotIndex,
  buildMemorizationReorderChunks,
  buildBibleBooksReorderChunks,
  reorderMovableCountForRound,
  pickReorderMovableIndices,
  buildInitialReorderSlotAssignment,
  generateMemorizationSessionSeed,
  pickHiddenWordIndices,
  firstLetterOfWord,
  firstLetterGlyphOfWord,
  cueGlyphForTypableToken,
  pickHiddenCueTypableSlotIndices,
  buildMemorizationChoiceLabels,
  memorizationWordChoiceRowCount,
  splitMemorizationChoiceRows,
  type MemorizationToken,
} from './memorizationPracticeUtils';

describe('seedRandom / stringToSeed', () => {
  it('produces deterministic sequence for same seed', () => {
    const a = seedRandom(12345);
    const b = seedRandom(12345);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it('produces different sequences for different seeds', () => {
    const a = seedRandom(1);
    const b = seedRandom(2);
    expect(a()).not.toBe(b());
  });

  it('stringToSeed is stable for same input', () => {
    expect(stringToSeed('verse-id-1')).toBe(stringToSeed('verse-id-1'));
    expect(stringToSeed('a')).not.toBe(stringToSeed('b'));
  });
});

describe('getWordsForMemorization', () => {
  it('splits on whitespace and trims', () => {
    expect(getWordsForMemorization('  For God so loved  ')).toEqual([
      'For',
      'God',
      'so',
      'loved',
    ]);
  });

  it('returns empty for blank text', () => {
    expect(getWordsForMemorization('   ')).toEqual([]);
  });
});

describe('tokenizeMemorizationPlainWord', () => {
  it('splits numeric words into digit tokens', () => {
    expect(tokenizeMemorizationPlainWord('123')).toEqual([
      { kind: 'digit', text: '1' },
      { kind: 'digit', text: '2' },
      { kind: 'digit', text: '3' },
    ]);
  });

  it('wraps alphabetic words', () => {
    expect(tokenizeMemorizationPlainWord('God')).toEqual([{ kind: 'word', text: 'God' }]);
  });
});

describe('parseReferenceMemorizationTokens', () => {
  it('returns empty for blank reference', () => {
    expect(parseReferenceMemorizationTokens('')).toEqual([]);
    expect(parseReferenceMemorizationTokens('   ')).toEqual([]);
  });

  it('tokenizes book, digits, and punctuation', () => {
    const tokens = parseReferenceMemorizationTokens('John 3:16');
    expect(tokens).toContainEqual({ kind: 'word', text: 'John' });
    expect(tokens).toContainEqual({ kind: 'punct', text: ' ' });
    expect(tokens).toContainEqual({ kind: 'digit', text: '3' });
    expect(tokens).toContainEqual({ kind: 'punct', text: ':' });
    expect(tokens).toContainEqual({ kind: 'digit', text: '1' });
    expect(tokens).toContainEqual({ kind: 'digit', text: '6' });
  });

  it('collapses consecutive whitespace to single space punct', () => {
    const tokens = parseReferenceMemorizationTokens('John   3');
    const spaces = tokens.filter((t) => t.kind === 'punct' && t.text === ' ');
    expect(spaces).toHaveLength(1);
  });

  it('handles verse ranges with dash', () => {
    const tokens = parseReferenceMemorizationTokens('Gen 1:1-3');
    expect(tokens.some((t) => t.kind === 'punct' && t.text === '-')).toBe(true);
  });
});

describe('buildMemorizationTokens', () => {
  it('combines verse words and reference tokens', () => {
    const tokens = buildMemorizationTokens('In the beginning', 'Genesis 1:1');
    const plain = formatMemorizationTokensPlain(tokens);
    expect(plain).toContain('In the beginning');
    expect(plain).toContain('Genesis');
    expect(plain).toContain('1:1');
  });

  it('tokenizes numeric verse words as digits', () => {
    const tokens = buildMemorizationTokens('Day 1', 'Genesis 1:1');
    expect(tokens.some((t) => t.kind === 'digit' && t.text === '1')).toBe(true);
  });

  it('omits reference when empty', () => {
    const tokens = buildMemorizationTokens('Hello', '');
    expect(formatMemorizationTokensPlain(tokens)).toBe('Hello');
  });

  it('strips KJV pilcrow so it is not a stuck typable token', () => {
    const tokens = buildMemorizationTokens(
      '¶ For God so loved the world',
      'John 3:16'
    );
    const plain = formatMemorizationTokensPlain(tokens);
    expect(plain.startsWith('For God')).toBe(true);
    expect(plain).not.toContain('¶');
    expect(
      getTypableTokenIndices(tokens).every((i) => {
        const t = tokens[i]!;
        return t.kind === 'word' || t.kind === 'digit';
      })
    ).toBe(true);
    expect(
      getTypableTokenIndices(tokens).some((i) => tokens[i]!.text === '¶')
    ).toBe(false);
  });
});

describe('getTypableTokenIndices', () => {
  it('includes word and digit tokens only', () => {
    const tokens: MemorizationToken[] = [
      { kind: 'word', text: 'God' },
      { kind: 'punct', text: ' ' },
      { kind: 'digit', text: '3' },
    ];
    expect(getTypableTokenIndices(tokens)).toEqual([0, 2]);
  });
});

describe('formatMemorizationTokensPlain', () => {
  it('joins token text without separators', () => {
    const tokens: MemorizationToken[] = [
      { kind: 'word', text: 'For' },
      { kind: 'punct', text: ' ' },
      { kind: 'word', text: 'God' },
    ];
    expect(formatMemorizationTokensPlain(tokens)).toBe('For God');
  });
});

describe('memorization token display helpers', () => {
  it('memorizationIsCurrentBlank respects hidden, revealed, and target index', () => {
    const hidden = new Set([1, 2]);
    const revealed = new Set([2]);
    expect(memorizationIsCurrentBlank(1, hidden, revealed, 1)).toBe(true);
    expect(memorizationIsCurrentBlank(2, hidden, revealed, 2)).toBe(false);
    expect(memorizationIsCurrentBlank(0, hidden, revealed, 1)).toBe(false);
  });

  it('memorizationShowViaHint requires hint active and peek set', () => {
    const hidden = new Set([1]);
    const revealed = new Set<number>();
    const peek = new Set([1]);
    expect(memorizationShowViaHint(1, false, hidden, revealed, peek)).toBe(false);
    expect(memorizationShowViaHint(1, true, hidden, revealed, peek)).toBe(true);
    expect(memorizationShowViaHint(1, true, hidden, revealed, new Set())).toBe(false);
  });
});

describe('formatMemorizationReciteWhisperPrompt', () => {
  it('uses translation style and spoken reference only (not verse body) for Whisper', () => {
    const tokens = buildMemorizationTokens('All Scripture is God-breathed', '2 Timothy 3:16');
    const prompt = formatMemorizationReciteWhisperPrompt(tokens, '2 Timothy 3:16', 'esv');
    expect(prompt).toBe('Contemporary English Bible recitation. 2 Timothy 3 16');
    expect(prompt).not.toContain('3:16');
    expect(prompt).not.toContain('Scripture');
  });

  it('uses King James style prefix for KJV items', () => {
    const tokens = buildMemorizationTokens('Blessed are the poor in spirit', 'Matthew 5:3');
    const prompt = formatMemorizationReciteWhisperPrompt(tokens, 'Matthew 5:3', 'kjv');
    expect(prompt).toBe('King James Bible recitation. Matthew 5 3');
  });

  it('returns empty prompt when reference is empty (bible books)', () => {
    const tokens = buildMemorizationTokens('Genesis Exodus', '');
    expect(formatMemorizationReciteWhisperPrompt(tokens, '', 'esv')).toBe('');
  });
});

describe('hiddenFractionForRound', () => {
  it('scales to 100% at round 5', () => {
    expect(hiddenFractionForRound(0)).toBe(0);
    expect(hiddenFractionForRound(1)).toBe(0.2);
    expect(hiddenFractionForRound(2)).toBe(0.4);
    expect(hiddenFractionForRound(3)).toBeCloseTo(0.6);
    expect(hiddenFractionForRound(4)).toBeCloseTo(0.8);
    expect(hiddenFractionForRound(MEMORIZATION_FULL_HIDE_ROUND)).toBe(1);
    expect(hiddenFractionForRound(10)).toBe(1);
  });
});

describe('referenceTextsForMemorizationReorder', () => {
  it('returns empty for blank reference', () => {
    expect(referenceTextsForMemorizationReorder('')).toEqual([]);
  });

  it('splits verse reference into book, chapter, verse', () => {
    expect(referenceTextsForMemorizationReorder('John 3:16')).toEqual([
      'John',
      '3',
      '16',
    ]);
  });

  it('splits verse range', () => {
    expect(referenceTextsForMemorizationReorder('John 3:16-18')).toEqual([
      'John',
      '3',
      '16-18',
    ]);
  });

  it('splits chapter-only into book and chapter', () => {
    expect(referenceTextsForMemorizationReorder('Genesis 1')).toEqual(['Genesis', '1']);
  });

  it('returns whole ref when unparsable', () => {
    expect(referenceTextsForMemorizationReorder('custom ref')).toEqual(['custom ref']);
  });
});

describe('reorderReferenceColonAfterSlotIndex', () => {
  it('returns colon slot for three-part reference', () => {
    const ref = 'John 3:16';
    const chunks = buildMemorizationReorderChunks('verse text', ref, {
      includeReferenceChunk: false,
    });
    const refChunks = referenceTextsForMemorizationReorder(ref);
    const totalChunks = chunks.length + refChunks.length;
    expect(reorderReferenceColonAfterSlotIndex(totalChunks, ref)).toBe(totalChunks - 2);
  });

  it('returns null for fewer than 3 chunks or parts', () => {
    expect(reorderReferenceColonAfterSlotIndex(2, 'John 3:16')).toBeNull();
    expect(reorderReferenceColonAfterSlotIndex(5, 'Genesis 1')).toBeNull();
  });
});

describe('buildMemorizationReorderChunks', () => {
  it('splits on clause punctuation', () => {
    const chunks = buildMemorizationReorderChunks(
      'For God so loved; that he gave',
      'John 3:16',
      { includeReferenceChunk: false }
    );
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const combined = chunks.map((c) => c.text).join(' ');
    expect(combined).toContain('For God so');
    expect(combined).toContain('loved');
    expect(combined).toContain('that he gave');
  });

  it('sub-splits long clauses into word groups', () => {
    const long =
      'one two three four five six seven eight nine ten eleven twelve thirteen fourteen';
    const chunks = buildMemorizationReorderChunks(long, '', { includeReferenceChunk: false });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('includes reference chunks by default', () => {
    const chunks = buildMemorizationReorderChunks('Hello world', 'John 3:16');
    const texts = chunks.map((c) => c.text);
    expect(texts).toContain('John');
    expect(texts).toContain('3');
    expect(texts).toContain('16');
  });

  it('assigns sequential ids', () => {
    const chunks = buildMemorizationReorderChunks('A, B', 'John 1:1', {
      includeReferenceChunk: false,
    });
    expect(chunks.map((c) => c.id)).toEqual(chunks.map((_, i) => i));
  });

  it('handles empty verse with reference', () => {
    const chunks = buildMemorizationReorderChunks('', 'John 3:16');
    expect(chunks.length).toBe(3);
  });
});

describe('buildBibleBooksReorderChunks', () => {
  it('maps book names to chunks with ids', () => {
    const chunks = buildBibleBooksReorderChunks(['Genesis', 'Exodus']);
    expect(chunks).toEqual([
      { id: 0, text: 'Genesis' },
      { id: 1, text: 'Exodus' },
    ]);
  });
});

describe('reorderMovableCountForRound', () => {
  it('returns 0 for round 0 or single chunk', () => {
    expect(reorderMovableCountForRound(1, 1)).toBe(0);
    expect(reorderMovableCountForRound(0, 5)).toBe(0);
  });

  it('returns at least 2 movable when enough chunks', () => {
    expect(reorderMovableCountForRound(1, 10)).toBeGreaterThanOrEqual(2);
  });

  it('uses all chunks at full hide round', () => {
    expect(reorderMovableCountForRound(MEMORIZATION_FULL_HIDE_ROUND, 8)).toBe(8);
  });
});

describe('pickReorderMovableIndices', () => {
  it('is deterministic for same seed', () => {
    const a = pickReorderMovableIndices(10, 2, 'seed-1');
    const b = pickReorderMovableIndices(10, 2, 'seed-1');
    expect(a).toEqual(b);
  });

  it('returns sorted ascending indices', () => {
    const indices = pickReorderMovableIndices(10, 3, 'seed-2');
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]!).toBeGreaterThan(indices[i - 1]!);
    }
  });

  it('returns empty when round is 0', () => {
    expect(pickReorderMovableIndices(5, 0, 'seed')).toEqual([]);
  });
});

describe('buildInitialReorderSlotAssignment', () => {
  it('returns identity when fewer than 2 movable slots', () => {
    const rng = seedRandom(42);
    expect(buildInitialReorderSlotAssignment(5, [], rng)).toEqual([0, 1, 2, 3, 4]);
    expect(buildInitialReorderSlotAssignment(5, [2], rng)).toEqual([0, 1, 2, 3, 4]);
  });

  it('deranges movable slots so no chunk starts at home', () => {
    const rng = seedRandom(99);
    const movable = [0, 1, 2, 3];
    const assignment = buildInitialReorderSlotAssignment(4, movable, rng);
    for (const slot of movable) {
      expect(assignment[slot]).not.toBe(slot);
    }
  });
});

describe('generateMemorizationSessionSeed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });
    expect(generateMemorizationSessionSeed()).toBe('test-uuid-1234');
  });

  it('falls back when crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const seed = generateMemorizationSessionSeed();
    expect(typeof seed).toBe('string');
    expect(seed.length).toBeGreaterThan(0);
  });
});

describe('pickHiddenWordIndices', () => {
  it('returns empty for round 0 or zero words', () => {
    expect(pickHiddenWordIndices(10, 0, 'seed')).toEqual(new Set());
    expect(pickHiddenWordIndices(0, 3, 'seed')).toEqual(new Set());
  });

  it('is deterministic for same seed', () => {
    const a = pickHiddenWordIndices(10, 2, 'verse-id-1');
    const b = pickHiddenWordIndices(10, 2, 'verse-id-1');
    expect([...a].sort((x, y) => x - y)).toEqual([...b].sort((x, y) => x - y));
  });

  it('hides all words at full hide round', () => {
    const hidden = pickHiddenWordIndices(5, MEMORIZATION_FULL_HIDE_ROUND, 'seed');
    expect(hidden.size).toBe(5);
  });

  it('hides at least one word when fraction > 0', () => {
    const hidden = pickHiddenWordIndices(10, 1, 'seed');
    expect(hidden.size).toBeGreaterThanOrEqual(1);
  });
});

describe('firstLetterOfWord / firstLetterGlyphOfWord', () => {
  it('skips punctuation for lowercase match letter', () => {
    expect(firstLetterOfWord('God,')).toBe('g');
    expect(firstLetterOfWord('(Son)')).toBe('s');
  });

  it('returns empty when no letters', () => {
    expect(firstLetterOfWord('123')).toBe('');
  });

  it('preserves case for glyph', () => {
    expect(firstLetterGlyphOfWord('God,')).toBe('G');
    expect(firstLetterGlyphOfWord('son')).toBe('s');
  });
});

describe('cueGlyphForTypableToken', () => {
  it('returns digit for digit tokens', () => {
    expect(cueGlyphForTypableToken({ kind: 'digit', text: '3' })).toBe('3');
  });

  it('returns first letter for word tokens', () => {
    expect(cueGlyphForTypableToken({ kind: 'word', text: 'God,' })).toBe('G');
  });

  it('returns middle dot for word without letters', () => {
    expect(cueGlyphForTypableToken({ kind: 'word', text: '123' })).toBe('·');
  });

  it('returns empty for punct tokens', () => {
    expect(cueGlyphForTypableToken({ kind: 'punct', text: ',' })).toBe('');
  });
});

describe('pickHiddenCueTypableSlotIndices', () => {
  it('returns empty for round 0 or zero typable slots', () => {
    expect(pickHiddenCueTypableSlotIndices(5, 0, 'seed')).toEqual(new Set());
    expect(pickHiddenCueTypableSlotIndices(0, 3, 'seed')).toEqual(new Set());
  });

  it('hides none on round 1', () => {
    expect(pickHiddenCueTypableSlotIndices(10, 1, 'seed').size).toBe(0);
  });

  it('hides all on full hide round', () => {
    const hidden = pickHiddenCueTypableSlotIndices(5, MEMORIZATION_FULL_HIDE_ROUND, 'seed');
    expect(hidden.size).toBe(5);
  });

  it('is deterministic for same seed', () => {
    const a = pickHiddenCueTypableSlotIndices(10, 3, 'cue-seed');
    const b = pickHiddenCueTypableSlotIndices(10, 3, 'cue-seed');
    expect(a).toEqual(b);
  });
});

describe('buildMemorizationChoiceLabels', () => {
  const rng = seedRandom(7);

  it('returns empty for invalid target', () => {
    const tokens: MemorizationToken[] = [{ kind: 'punct', text: ',' }];
    expect(buildMemorizationChoiceLabels(tokens, [0], 0, 4, rng)).toEqual([]);
    expect(buildMemorizationChoiceLabels(tokens, [], 0, 4, rng)).toEqual([]);
  });

  it('includes correct word label and distractors', () => {
    const tokens = buildMemorizationTokens('For God so loved', 'John 3:16');
    const typable = getTypableTokenIndices(tokens);
    const wordIdx = typable.find((i) => tokens[i]!.kind === 'word')!;
    const labels = buildMemorizationChoiceLabels(tokens, typable, wordIdx, 4, rng);
    expect(labels).toContain(tokens[wordIdx]!.text);
    expect(labels.length).toBeLessThanOrEqual(4);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('builds digit choices with extra digits when needed', () => {
    const tokens: MemorizationToken[] = [
      { kind: 'digit', text: '1' },
      { kind: 'punct', text: ' ' },
      { kind: 'digit', text: '2' },
    ];
    const typable = [0, 2];
    const labels = buildMemorizationChoiceLabels(tokens, typable, 0, 6, seedRandom(11));
    expect(labels).toContain('1');
    expect(labels.length).toBe(6);
  });

  it('word blanks exclude digit distractors', () => {
    const tokens: MemorizationToken[] = [
      { kind: 'word', text: 'God' },
      { kind: 'punct', text: ' ' },
      { kind: 'digit', text: '3' },
    ];
    const typable = [0, 2];
    const labels = buildMemorizationChoiceLabels(tokens, typable, 0, 3, seedRandom(13));
    expect(labels.every((l) => l === 'God' || /^[A-Za-z]+$/.test(l) || l === 'God')).toBe(true);
    expect(labels).not.toContain('3');
  });
});

describe('splitMemorizationChoiceRows', () => {
  it('returns empty rows when there are no labels', () => {
    expect(splitMemorizationChoiceRows([])).toEqual([[], [], []]);
  });

  it('splits evenly across three rows with earlier rows taking extras', () => {
    expect(splitMemorizationChoiceRows(['a', 'b', 'c', 'd', 'e'])).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e'],
    ]);
    expect(splitMemorizationChoiceRows(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
      ['g', 'h'],
    ]);
    expect(splitMemorizationChoiceRows(['a', 'b', 'c', 'd'], 2)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('memorizationWordChoiceRowCount', () => {
  it('maps viewport width to compact vs comfortable row counts', () => {
    expect(memorizationWordChoiceRowCount(false)).toBe(3);
    expect(memorizationWordChoiceRowCount(true)).toBe(2);
  });
});
