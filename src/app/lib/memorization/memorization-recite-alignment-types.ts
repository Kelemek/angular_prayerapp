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
