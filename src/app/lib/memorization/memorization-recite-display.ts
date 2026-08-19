import type { MemorizationToken } from './memorizationPracticeUtils';
import type {
  ReciteAlignmentResult,
  ReciteAlignmentSummary,
  ReciteDisplaySegment,
  ReciteTokenStatus,
} from './memorization-recite-alignment-types';

export function tokensOnlyPunctuationBetween(
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

export function mergeDigitResultStatuses(statuses: ReciteTokenStatus[]): ReciteTokenStatus {
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
