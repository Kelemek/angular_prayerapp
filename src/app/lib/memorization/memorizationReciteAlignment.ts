import type { MemorizationToken } from './memorizationPracticeUtils';
import { parseReferenceMemorizationTokens } from './memorizationPracticeUtils';

export type ReciteTokenStatus = 'correct' | 'missing' | 'wrong';

export type ReciteAlignmentResult = {
  tokenIndex: number;
  status: ReciteTokenStatus;
  spokenText?: string;
  /** Index in tokenized transcript when this result consumed a spoken word. */
  spokenIndex?: number;
};

export type ReciteSpokenWordDisplay = {
  text: string;
  status: 'correct' | 'wrong';
};

export type ReciteAlignedSpokenChar = {
  char: string;
  status: 'correct' | 'wrong' | 'missing';
};

export type ReciteAlignedColumnDisplay = {
  spoken?: { text: string; status: 'correct' | 'wrong' };
  /** Per-character top row for grouped digits or skipped words. */
  spokenChars?: ReciteAlignedSpokenChar[];
  expected?: { text: string; status: ReciteTokenStatus };
};

/** Grouped verse/reference units for recite practice display (multi-digit refs stay together). */
export type ReciteDisplaySegment = {
  kind: 'punct' | 'word' | 'digits';
  text: string;
  tokenIndices: number[];
};

export type ReciteAlignmentSummary = {
  results: ReciteAlignmentResult[];
  spokenWords: ReciteSpokenWordDisplay[];
  alignedColumns: ReciteAlignedColumnDisplay[];
  correctCount: number;
  wrongCount: number;
  missingCount: number;
  totalTypable: number;
};

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
  sixty: '60',
  seventy: '70',
  eighty: '80',
  ninety: '90',
  hundred: '100',
};

const COMPOUND_NUMBER_WORDS: Record<string, string> = buildCompoundNumberWords();

/** Book-prefix ordinals STT often uses after listen mode speaks "first/second/third …". */
const SPOKEN_ORDINAL_TO_DIGIT: Record<string, string> = {
  first: '1',
  second: '2',
  third: '3',
  '1st': '1',
  '2nd': '2',
  '3rd': '3',
  i: '1',
  ii: '2',
  iii: '3',
};

function spokenOrdinalToDigit(word: string): string | null {
  return SPOKEN_ORDINAL_TO_DIGIT[word] ?? null;
}

function spokenAsDigit(expectedDigit: string, spoken: string): string {
  const normalized = normalizeReciteWord(spoken);
  if (isReciteDigitToken(normalized)) return normalized;
  const fromOrdinal = spokenOrdinalToDigit(normalized);
  if (fromOrdinal === expectedDigit) return fromOrdinal;
  return spoken;
}

function buildCompoundNumberWords(): Record<string, string> {
  const tens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const ones = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const map: Record<string, string> = {};
  for (let t = 0; t < tens.length; t++) {
    const tensWord = tens[t]!;
    const tensVal = (t + 2) * 10;
    for (let o = 0; o < ones.length; o++) {
      map[`${tensWord}${ones[o]!}`] = String(tensVal + o + 1);
    }
  }
  return map;
}

/** Lowercase alphanumerics for fuzzy word comparison. */
export function normalizeReciteWord(word: string): string {
  let w = word.toLowerCase().replace(/['’]/g, '');
  w = w.replace(/[^\w]/g, '');
  return COMPOUND_NUMBER_WORDS[w] ?? NUMBER_WORDS[w] ?? w;
}

function splitTranscriptPiece(piece: string): string[] {
  if (piece.includes(':')) {
    const parts: string[] = [];
    for (const colonPart of piece.split(':')) {
      for (const sub of colonPart.split('-')) {
        const normalized = normalizeReciteWord(sub);
        if (normalized) parts.push(normalized);
      }
    }
    return parts;
  }
  const parts: string[] = [];
  for (const sub of piece.split('-')) {
    const normalized = normalizeReciteWord(sub);
    if (normalized) parts.push(normalized);
  }
  return parts;
}

/** Merge STT number phrases (twenty eight → 28, to eight → 28). */
function combineSpokenNumberPhrases(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    if (/^(20|30|40|50|60|70|80|90)$/.test(word) && i + 1 < words.length) {
      const next = words[i + 1]!;
      if (/^[1-9]$/.test(next)) {
        out.push(String(Number(word) + Number(next)));
        i += 1;
        continue;
      }
    }
    if ((word === 'to' || word === 'too') && i + 1 < words.length) {
      const next = words[i + 1]!;
      if (/^[1-9]$/.test(next)) {
        out.push(`2${next}`);
        i += 1;
        continue;
      }
    }
    out.push(word);
  }
  return out;
}

export function tokenizeReciteTranscript(transcript: string): string[] {
  const words: string[] = [];
  for (const piece of transcript.trim().split(/\s+/).filter(Boolean)) {
    words.push(...splitTranscriptPiece(piece));
  }
  return combineSpokenNumberPhrases(words);
}

function isReciteDigitToken(token: string): boolean {
  return /^\d+$/.test(token);
}

function isSingleDigitToken(token: string): boolean {
  return /^\d$/.test(token);
}

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

function tokensOnlyPunctuationBetween(
  tokens: MemorizationToken[],
  startTokenIndex: number,
  endTokenIndex: number
): boolean {
  for (let i = startTokenIndex + 1; i < endTokenIndex; i++) {
    const token = tokens[i]!;
    if (token.kind === 'punct') {
      if (token.text === ':' || token.text === '-') return false;
      continue;
    }
    return false;
  }
  return true;
}

/** Walk tokens for recite UI: merge verse digits (e.g. 28) but not across : or -. */
export function buildReciteDisplaySegments(tokens: MemorizationToken[]): ReciteDisplaySegment[] {
  const segments: ReciteDisplaySegment[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.kind === 'punct') {
      segments.push({ kind: 'punct', text: token.text, tokenIndices: [] });
      i += 1;
      continue;
    }
    if (token.kind === 'word') {
      segments.push({ kind: 'word', text: token.text, tokenIndices: [i] });
      i += 1;
      continue;
    }

    const tokenIndices = [i];
    let text = token.text;
    let j = i + 1;
    while (j < tokens.length) {
      const next = tokens[j]!;
      if (next.kind !== 'digit') break;
      if (!tokensOnlyPunctuationBetween(tokens, tokenIndices[tokenIndices.length - 1]!, j)) {
        break;
      }
      tokenIndices.push(j);
      text += next.text;
      j += 1;
    }
    segments.push({ kind: 'digits', text, tokenIndices });
    i = j;
  }
  return segments;
}

function consumeExpectedDigit(
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

  // Verse expects plural, user said singular (mouth vs mouths).
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

  // User said plural, verse expects singular (rare).
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

  // -es plurals (dish/dishes); skip witness-style ...s + s truncations.
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

  // -ies ↔ -y (city/cities).
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
  // Single reference digits (8 vs 9, 8 vs 6) are one edit apart and must not fuzzy-match.
  if (isReciteDigitToken(expected) || isReciteDigitToken(spoken)) {
    return false;
  }
  // Short words (I/am/the/for) must match exactly — STT often confuses am/are, a/the, etc.
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
const REFERENCE_SKIP_SPOKEN_WORDS = new Set([
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

function isSkippableSpokenWord(word: string, referenceMode = false): boolean {
  if (SKIP_SPOKEN_WORDS.has(word)) return true;
  if (referenceMode && REFERENCE_SKIP_SPOKEN_WORDS.has(word)) return true;
  return false;
}

type TokenMatchOptions = {
  /** When true, Psalm/Psalms count as correct for scripture reference tokens. */
  referenceBookAliases?: boolean;
};

function tokenMatchStatus(
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

/** Correct matches show expected verse/reference spelling and casing in the UI. */
function alignmentSpokenDisplay(
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

/**
 * True when the spoken word matches the *immediate next* expected token because the
 * user skipped the current word (e.g. "For so loved" with "God" omitted).
 * Lookahead beyond one word caused false skips when the opening phrase was wrong
 * (e.g. "You are the vine" vs "I am the vine" aligned "are" to a later "are").
 */
function matchesUpcomingMissing(
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

function matchesAnyExpectedToken(
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

type AlignTypableSubsequenceResult = {
  results: ReciteAlignmentResult[];
  spokenAssignments: Array<{ spokenIndex: number; text: string; status: 'correct' | 'wrong' }>;
  finalSpokenIdx: number;
};

function alignTypableSubsequence(
  tokens: MemorizationToken[],
  typableIndices: number[],
  spoken: string[],
  crossSectionTypableIndices: number[] = [],
  startSpokenIdx = 0,
  isFinalSection = true,
  referenceMode = false
): AlignTypableSubsequenceResult {
  const results: ReciteAlignmentResult[] = [];
  const spokenAssignments: AlignTypableSubsequenceResult['spokenAssignments'] = [];
  let spokenIdx = startSpokenIdx;
  let digitRemainder: string | null = null;

  const advanceSpokenIndex = (): void => {
    digitRemainder = null;
    spokenIdx += 1;
  };

  const currentCandidate = (): string | null => {
    if (digitRemainder !== null) return digitRemainder;
    if (spokenIdx >= spoken.length) return null;
    const word = spoken[spokenIdx]!;
    if (isSkippableSpokenWord(word, referenceMode)) return null;
    return word;
  };

  for (let slot = 0; slot < typableIndices.length; slot++) {
    const tokenIndex = typableIndices[slot]!;
    const expectedWord = normalizeReciteWord(tokens[tokenIndex]!.text);
    let matched = false;

    while (spokenIdx < spoken.length || digitRemainder !== null) {
      if (digitRemainder === null) {
        while (spokenIdx < spoken.length && isSkippableSpokenWord(spoken[spokenIdx]!, referenceMode)) {
          spokenIdx += 1;
        }
      }

      const candidate = currentCandidate();
      if (!candidate) break;

      if (isSingleDigitToken(expectedWord)) {
        const ordinalDigit = spokenOrdinalToDigit(candidate);
        if (ordinalDigit !== null && ordinalDigit !== expectedWord) {
          results.push({
            tokenIndex,
            status: 'wrong',
            spokenText: candidate,
            spokenIndex: spokenIdx,
          });
          spokenAssignments.push({
            spokenIndex: spokenIdx,
            text: candidate,
            status: 'wrong',
          });
          advanceSpokenIndex();
          matched = true;
          break;
        }

        const digitCandidate = spokenAsDigit(expectedWord, candidate);
        if (!isReciteDigitToken(digitCandidate)) {
          if (referenceMode && REFERENCE_SKIP_SPOKEN_WORDS.has(candidate)) {
            advanceSpokenIndex();
            continue;
          }
          break;
        }
        const digitMatch = consumeExpectedDigit(expectedWord, digitCandidate);
        const assignmentStatus = digitMatch.status;
        const heard =
          candidate !== digitCandidate ? candidate : digitMatch.fragment;
        const spokenDisplay = alignmentSpokenDisplay(
          tokens,
          tokenIndex,
          digitMatch.status,
          heard
        );
        results.push({
          tokenIndex,
          status: digitMatch.status,
          spokenText: spokenDisplay,
          spokenIndex: spokenIdx,
        });
        spokenAssignments.push({
          spokenIndex: spokenIdx,
          text: spokenDisplay,
          status: assignmentStatus,
        });
        if (digitMatch.remainder) {
          digitRemainder = digitMatch.remainder;
        } else {
          advanceSpokenIndex();
        }
        matched = true;
        break;
      }

      const matchOptions: TokenMatchOptions = { referenceBookAliases: referenceMode };

      // Skip stray digit tokens only when they do not match the expected word (e.g. verse
      // "twelve" normalizes to "12" and must not be discarded as reference noise).
      if (
        isReciteDigitToken(candidate) &&
        tokenMatchStatus(expectedWord, candidate, matchOptions) === null
      ) {
        spokenIdx += 1;
        digitRemainder = null;
        continue;
      }

      const status = tokenMatchStatus(expectedWord, candidate, matchOptions);
      if (status === 'correct' || status === 'wrong') {
        const spokenDisplay = alignmentSpokenDisplay(tokens, tokenIndex, status, candidate);
        results.push({
          tokenIndex,
          status,
          spokenText: spokenDisplay,
          spokenIndex: spokenIdx,
        });
        spokenAssignments.push({ spokenIndex: spokenIdx, text: spokenDisplay, status });
        advanceSpokenIndex();
        matched = true;
        break;
      }

      if (matchesUpcomingMissing(tokens, typableIndices, slot, candidate, matchOptions)) {
        results.push({ tokenIndex, status: 'missing' });
        matched = true;
        break;
      }

      if (
        crossSectionTypableIndices.length > 0 &&
        matchesAnyExpectedToken(tokens, crossSectionTypableIndices, candidate, matchOptions)
      ) {
        advanceSpokenIndex();
        continue;
      }

      results.push({ tokenIndex, status: 'wrong', spokenText: candidate, spokenIndex: spokenIdx });
      spokenAssignments.push({ spokenIndex: spokenIdx, text: candidate, status: 'wrong' });
      advanceSpokenIndex();
      matched = true;
      break;
    }

    if (!matched) {
      results.push({ tokenIndex, status: 'missing' });
    }
  }

  if (isFinalSection) {
    while (spokenIdx < spoken.length) {
      const candidate = spoken[spokenIdx]!;
      if (!isSkippableSpokenWord(candidate, referenceMode)) {
        spokenAssignments.push({ spokenIndex: spokenIdx, text: candidate, status: 'wrong' });
      }
      spokenIdx += 1;
    }
  }

  return { results, spokenAssignments, finalSpokenIdx: spokenIdx };
}

function detectSpokenRefFirst(
  tokens: MemorizationToken[],
  verseTypable: number[],
  refTypable: number[],
  spoken: string[]
): boolean {
  if (verseTypable.length === 0 || refTypable.length === 0) {
    return false;
  }

  const firstVerse = normalizeReciteWord(tokens[verseTypable[0]!]!.text);
  const firstRef = normalizeReciteWord(tokens[refTypable[0]!]!.text);
  let verseIdx = -1;
  let refIdx = -1;

  for (let i = 0; i < spoken.length; i++) {
    const word = spoken[i]!;
    if (verseIdx < 0 && tokenMatchStatus(firstVerse, word) === 'correct') {
      verseIdx = i;
    }
    if (
      refIdx < 0 &&
      tokenMatchStatus(firstRef, word, { referenceBookAliases: true }) === 'correct'
    ) {
      refIdx = i;
    }
    if (verseIdx >= 0 && refIdx >= 0) {
      break;
    }
  }

  return refIdx >= 0 && verseIdx >= 0 && refIdx < verseIdx;
}

function mergeDigitResultStatuses(statuses: ReciteTokenStatus[]): ReciteTokenStatus {
  if (statuses.some((s) => s === 'missing')) return 'missing';
  if (statuses.some((s) => s === 'wrong')) return 'wrong';
  return 'correct';
}

function segmentStatuses(
  segment: ReciteDisplaySegment,
  resultByToken: Map<number, ReciteAlignmentResult>
): ReciteTokenStatus[] {
  return segment.tokenIndices.map((i) => resultByToken.get(i)?.status ?? 'missing');
}

function countSegmentContribution(statuses: ReciteTokenStatus[]): {
  correct: number;
  wrong: number;
  missing: number;
} {
  if (statuses.length === 0) return { correct: 0, wrong: 0, missing: 1 };
  if (statuses.every((s) => s === 'correct')) {
    return { correct: 1, wrong: 0, missing: 0 };
  }
  if (statuses.every((s) => s === 'missing')) {
    return { correct: 0, wrong: 0, missing: 1 };
  }
  if (statuses.every((s) => s === 'wrong')) {
    return { correct: 0, wrong: 1, missing: 0 };
  }
  return {
    correct: 0,
    wrong: statuses.filter((s) => s === 'wrong').length,
    missing: statuses.filter((s) => s === 'missing').length,
  };
}

/** Count correct/wrong/missing using display segments so multi-digit refs (e.g. 16) are one unit. */
export function computeReciteGroupedStats(
  tokens: MemorizationToken[],
  results: ReciteAlignmentResult[]
): Pick<ReciteAlignmentSummary, 'correctCount' | 'wrongCount' | 'missingCount' | 'totalTypable'> {
  const resultByToken = new Map(results.map((r) => [r.tokenIndex, r]));
  let correctCount = 0;
  let wrongCount = 0;
  let missingCount = 0;
  let totalTypable = 0;

  for (const segment of buildReciteDisplaySegments(tokens)) {
    if (segment.kind === 'punct') continue;
    totalTypable += 1;
    const contribution = countSegmentContribution(segmentStatuses(segment, resultByToken));
    correctCount += contribution.correct;
    wrongCount += contribution.wrong;
    missingCount += contribution.missing;
  }

  return { correctCount, wrongCount, missingCount, totalTypable };
}

/** Skipped labels grouped like display segments (verse 16 → "16", not "1, 6"). */
export function formatReciteSkippedLabels(
  tokens: MemorizationToken[],
  results: ReciteAlignmentResult[]
): string[] {
  const missingByToken = new Set(
    results.filter((r) => r.status === 'missing').map((r) => r.tokenIndex)
  );
  if (missingByToken.size === 0) return [];

  const labels: string[] = [];
  for (const segment of buildReciteDisplaySegments(tokens)) {
    if (segment.kind === 'punct') continue;
    if (segment.kind === 'word') {
      const idx = segment.tokenIndices[0]!;
      if (missingByToken.has(idx)) labels.push(segment.text);
      continue;
    }
    if (segment.tokenIndices.every((i) => missingByToken.has(i))) {
      labels.push(segment.text);
    }
  }
  return labels;
}

function spokenCharForResult(
  tokens: MemorizationToken[],
  result: ReciteAlignmentResult
): ReciteAlignedSpokenChar {
  if (result.status === 'missing') {
    return { char: '—', status: 'missing' };
  }
  return {
    char: result.spokenText ?? tokens[result.tokenIndex]!.text,
    status: result.status === 'correct' ? 'correct' : 'wrong',
  };
}

function buildAlignedColumns(
  tokens: MemorizationToken[],
  results: ReciteAlignmentResult[],
  assignments: AlignTypableSubsequenceResult['spokenAssignments']
): ReciteAlignedColumnDisplay[] {
  const sorted = results.slice().sort((a, b) => a.tokenIndex - b.tokenIndex);
  const columns: ReciteAlignedColumnDisplay[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const result = sorted[i]!;
    const token = tokens[result.tokenIndex]!;
    if (token.kind !== 'digit') {
      const spokenChars =
        result.status === 'missing' || result.spokenText
          ? [spokenCharForResult(tokens, result)]
          : undefined;
      columns.push({
        spoken: result.spokenText
          ? {
              text: result.spokenText,
              status: result.status === 'correct' ? 'correct' : 'wrong',
            }
          : undefined,
        spokenChars,
        expected: {
          text: token.text,
          status: result.status,
        },
      });
      continue;
    }

    let j = i;
    const group: ReciteAlignmentResult[] = [];
    while (j < sorted.length) {
      const groupResult = sorted[j]!;
      const groupToken = tokens[groupResult.tokenIndex]!;
      if (groupToken.kind !== 'digit') break;
      if (
        group.length > 0 &&
        !tokensOnlyPunctuationBetween(
          tokens,
          group[group.length - 1]!.tokenIndex,
          groupResult.tokenIndex
        )
      ) {
        break;
      }
      group.push(groupResult);
      j++;
    }

    const expectedText = group.map((r) => tokens[r.tokenIndex]!.text).join('');
    const allMissing = group.every((r) => r.status === 'missing');
    const spokenChars =
      allMissing && group.length > 1
        ? [{ char: '—', status: 'missing' as const }]
        : group.map((r) => spokenCharForResult(tokens, r));
    const expectedStatus = mergeDigitResultStatuses(group.map((r) => r.status));
    columns.push({
      spokenChars,
      expected: {
        text: expectedText,
        status: expectedStatus,
      },
    });
    i = j - 1;
  }

  const linkedSpokenIndices = new Set(
    results.map((r) => r.spokenIndex).filter((idx): idx is number => idx !== undefined)
  );
  for (const assignment of [...assignments].sort((a, b) => a.spokenIndex - b.spokenIndex)) {
    if (linkedSpokenIndices.has(assignment.spokenIndex)) continue;
    columns.push({
      spoken: { text: assignment.text, status: assignment.status },
    });
  }

  return columns;
}

function buildSpokenWordsFromTranscript(
  spoken: string[],
  assignments: AlignTypableSubsequenceResult['spokenAssignments']
): ReciteSpokenWordDisplay[] {
  const displayByIndex = new Map<number, { text: string; status: 'correct' | 'wrong' }>();
  for (const assignment of assignments) {
    const existing = displayByIndex.get(assignment.spokenIndex);
    if (!existing || assignment.status === 'wrong') {
      displayByIndex.set(assignment.spokenIndex, {
        text: assignment.text,
        status: assignment.status,
      });
    }
  }

  const spokenWords: ReciteSpokenWordDisplay[] = [];
  for (let i = 0; i < spoken.length; i++) {
    const text = spoken[i]!;
    if (isSkippableSpokenWord(text)) continue;
    const display = displayByIndex.get(i);
    spokenWords.push({
      text: display?.text ?? text,
      status: display?.status ?? 'wrong',
    });
  }
  return spokenWords;
}

/**
 * Word-level alignment of spoken transcript to expected typable tokens.
 * Reference may be spoken before or after the verse body.
 */
export function alignRecitation(
  tokens: MemorizationToken[],
  typableIndices: number[],
  transcript: string,
  reference = ''
): ReciteAlignmentSummary {
  const spoken = tokenizeReciteTranscript(transcript);
  const { verseTypable, refTypable } = splitTypableVerseAndReference(
    typableIndices,
    reference
  );

  const refFirst = detectSpokenRefFirst(tokens, verseTypable, refTypable, spoken);
  let verseAligned: AlignTypableSubsequenceResult;
  let refAligned: AlignTypableSubsequenceResult;
  if (refFirst) {
    refAligned = alignTypableSubsequence(tokens, refTypable, spoken, verseTypable, 0, false, true);
    verseAligned = alignTypableSubsequence(
      tokens,
      verseTypable,
      spoken,
      [],
      refAligned.finalSpokenIdx,
      true
    );
  } else {
    verseAligned = alignTypableSubsequence(tokens, verseTypable, spoken, [], 0, false);
    refAligned = alignTypableSubsequence(
      tokens,
      refTypable,
      spoken,
      [],
      verseAligned.finalSpokenIdx,
      true,
      true
    );
  }
  const results = [...verseAligned.results, ...refAligned.results].sort(
    (a, b) => a.tokenIndex - b.tokenIndex
  );
  const allAssignments = [
    ...verseAligned.spokenAssignments,
    ...refAligned.spokenAssignments,
  ];
  const spokenWords = buildSpokenWordsFromTranscript(spoken, allAssignments);
  const alignedColumns = buildAlignedColumns(tokens, results, allAssignments);

  const grouped = computeReciteGroupedStats(tokens, results);

  return {
    results,
    spokenWords,
    alignedColumns,
    ...grouped,
  };
}

export function reciteScorePercent(summary: ReciteAlignmentSummary): number {
  if (summary.totalTypable === 0) return 100;
  return Math.round((summary.correctCount / summary.totalTypable) * 100);
}
