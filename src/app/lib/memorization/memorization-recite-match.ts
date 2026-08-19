import type { MemorizationToken } from './memorizationPracticeUtils';
import { parseReferenceMemorizationTokens } from './memorizationPracticeUtils';
import type { ReciteTokenStatus } from './memorization-recite-alignment-types';
import {
  isReciteDigitToken,
  normalizeReciteWord,
  spokenAsDigit,
} from './memorization-recite-tokenize';

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1]! + 1, row[j]! + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length]!;
}

/** Psalm/Psalms are interchangeable when reciting the scripture reference. */
function reciteScriptureBookAliasesMatch(expected: string, spoken: string): boolean {
  if (expected === spoken) return true;
  const pair = new Set([expected, spoken]);
  return pair.has('psalm') && pair.has('psalms');
}

/** Bible book names ending in "s" are not morphological plurals (Numbers ≠ number). */
const RECITE_NON_MORPHOLOGICAL_S_WORDS = new Set([
  'numbers',
  'corinthians',
  'thessalonians',
  'philippians',
  'colossians',
  'galatians',
]);

/** True when the longer word's final "s" is part of the stem, not a plural -s (jesus, witness). */
function longerEndsWithNonPluralS(longer: string): boolean {
  return longer.endsWith('us') || longer.endsWith('ss');
}

/** Singular/plural pairs (mouth/mouths) must not count as fuzzy-correct. */
function isPluralFormPair(expected: string, spoken: string): boolean {
  if (expected === spoken) return false;
  if (expected.length < 4 || spoken.length < 4) return false;

  if (
    expected.length === spoken.length + 1 &&
    expected === `${spoken}s` &&
    !spoken.endsWith('s') &&
    !spoken.endsWith('y')
  ) {
    if (RECITE_NON_MORPHOLOGICAL_S_WORDS.has(expected)) return false;
    if (longerEndsWithNonPluralS(expected)) return false;
    return true;
  }

  if (
    spoken.length === expected.length + 1 &&
    spoken === `${expected}s` &&
    !expected.endsWith('s') &&
    !expected.endsWith('y')
  ) {
    if (RECITE_NON_MORPHOLOGICAL_S_WORDS.has(spoken)) return false;
    if (longerEndsWithNonPluralS(spoken)) return false;
    return true;
  }

  if (
    expected.length === spoken.length + 2 &&
    expected === `${spoken}es` &&
    !spoken.endsWith('s')
  ) {
    return true;
  }
  if (
    spoken.length === expected.length + 2 &&
    spoken === `${expected}es` &&
    !expected.endsWith('s')
  ) {
    return true;
  }

  if (expected.endsWith('ies') && spoken.endsWith('y') && expected === `${spoken.slice(0, -1)}ies`) {
    return true;
  }
  if (spoken.endsWith('ies') && expected.endsWith('y') && spoken === `${expected.slice(0, -1)}ies`) {
    return true;
  }

  return false;
}

function wordsFuzzyMatch(expected: string, spoken: string): boolean {
  if (expected === spoken) return true;
  if (isPluralFormPair(expected, spoken)) return false;
  if (isReciteDigitToken(expected) || isReciteDigitToken(spoken)) {
    return false;
  }
  if (expected.length < 4 || spoken.length < 4) {
    return false;
  }
  const maxLen = Math.max(expected.length, spoken.length);
  if (maxLen === 0) return true;
  const threshold = maxLen <= 4 ? 1 : maxLen <= 8 ? 2 : 3;
  return levenshtein(expected, spoken) <= threshold;
}

/** Filler words STT often inserts around scripture references. */
const SKIP_SPOKEN_WORDS = new Set(['chapter', 'ch', 'verse', 'verses']);

/** Extra fillers Whisper may insert between reference numbers (reference pass only). */
export const REFERENCE_SKIP_SPOKEN_WORDS = new Set([
  'and',
  'colon',
  'dash',
  'dot',
  'hyphen',
  'minus',
  'period',
  'point',
  'thru',
  'through',
  'to',
]);

export function splitTypableVerseAndReference(
  typableIndices: number[],
  reference: string
): { verseTypable: number[]; refTypable: number[] } {
  const refTypableCount = parseReferenceMemorizationTokens(reference).filter(
    (t) => t.kind === 'word' || t.kind === 'digit'
  ).length;
  if (refTypableCount <= 0 || refTypableCount >= typableIndices.length) {
    return { verseTypable: typableIndices, refTypable: [] };
  }
  return {
    verseTypable: typableIndices.slice(0, -refTypableCount),
    refTypable: typableIndices.slice(-refTypableCount),
  };
}

export function isSkippableSpokenWord(word: string, referenceMode = false): boolean {
  if (SKIP_SPOKEN_WORDS.has(word)) return true;
  if (referenceMode && REFERENCE_SKIP_SPOKEN_WORDS.has(word)) return true;
  return false;
}

export type TokenMatchOptions = {
  /** When true, Psalm/Psalms count as correct for scripture reference tokens. */
  referenceBookAliases?: boolean;
};

export function tokenMatchStatus(
  expected: string,
  spoken: string,
  options: TokenMatchOptions = {}
): ReciteTokenStatus | null {
  if (expected === spoken) return 'correct';
  if (options.referenceBookAliases && reciteScriptureBookAliasesMatch(expected, spoken)) {
    return 'correct';
  }
  if (isReciteDigitToken(expected)) {
    const spokenDigit = spokenAsDigit(expected, spoken);
    if (isReciteDigitToken(spokenDigit)) {
      return spokenDigit === expected ? 'correct' : 'wrong';
    }
    return null;
  }
  return wordsFuzzyMatch(expected, spoken) ? 'correct' : null;
}

export function matchesUpcomingMissing(
  tokens: MemorizationToken[],
  typableIndices: number[],
  currentSlot: number,
  spokenWord: string,
  options: TokenMatchOptions = {}
): boolean {
  const idx = currentSlot + 1;
  if (idx >= typableIndices.length) return false;
  const expected = normalizeReciteWord(tokens[typableIndices[idx]!]!.text);
  return tokenMatchStatus(expected, spokenWord, options) === 'correct';
}

export function matchesAnyExpectedToken(
  tokens: MemorizationToken[],
  typableIndices: number[],
  spokenWord: string,
  options: TokenMatchOptions = {}
): boolean {
  for (const tokenIndex of typableIndices) {
    const expected = normalizeReciteWord(tokens[tokenIndex]!.text);
    if (tokenMatchStatus(expected, spokenWord, options) === 'correct') {
      return true;
    }
  }
  return false;
}

export function consumeExpectedDigit(
  expectedDigit: string,
  candidate: string
): { status: 'correct' | 'wrong'; fragment: string; remainder: string | null } {
  const first = candidate[0]!;
  const remainder = candidate.length > 1 ? candidate.slice(1) : null;
  if (first === expectedDigit) {
    return { status: 'correct', fragment: first, remainder };
  }
  if (candidate.length === 1) {
    return { status: 'wrong', fragment: candidate, remainder: null };
  }
  return { status: 'wrong', fragment: candidate, remainder: null };
}

/** Correct matches show expected verse/reference spelling and casing in the UI. */
export function alignmentSpokenDisplay(
  tokens: MemorizationToken[],
  tokenIndex: number,
  status: ReciteTokenStatus,
  heard: string
): string {
  if (status === 'correct') {
    return tokens[tokenIndex]!.text;
  }
  return heard;
}
