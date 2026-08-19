import type { MemorizationToken } from './memorizationPracticeUtils';
import type {
  ReciteAlignedColumnDisplay,
  ReciteAlignedSpokenChar,
  ReciteAlignmentResult,
  ReciteAlignmentSummary,
  ReciteSpokenWordDisplay,
} from './memorization-recite-alignment-types';
import {
  computeReciteGroupedStats,
  mergeDigitResultStatuses,
  tokensOnlyPunctuationBetween,
} from './memorization-recite-display';
import {
  REFERENCE_SKIP_SPOKEN_WORDS,
  alignmentSpokenDisplay,
  consumeExpectedDigit,
  isSkippableSpokenWord,
  matchesAnyExpectedToken,
  matchesUpcomingMissing,
  splitTypableVerseAndReference,
  tokenMatchStatus,
} from './memorization-recite-match';
import {
  isReciteDigitToken,
  isSingleDigitToken,
  normalizeReciteWord,
  spokenAsDigit,
  spokenOrdinalToDigit,
  tokenizeReciteTranscript,
} from './memorization-recite-tokenize';

export type AlignTypableSubsequenceResult = {
  results: ReciteAlignmentResult[];
  spokenAssignments: Array<{ spokenIndex: number; text: string; status: 'correct' | 'wrong' }>;
  finalSpokenIdx: number;
};

export function alignTypableSubsequence(
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

      const matchOptions = { referenceBookAliases: referenceMode };

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
