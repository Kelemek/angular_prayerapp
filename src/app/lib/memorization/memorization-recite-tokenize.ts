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

export function spokenOrdinalToDigit(word: string): string | null {
  return SPOKEN_ORDINAL_TO_DIGIT[word] ?? null;
}

export function spokenAsDigit(expectedDigit: string, spoken: string): string {
  const normalized = normalizeReciteWord(spoken);
  if (isReciteDigitToken(normalized)) return normalized;
  const fromOrdinal = spokenOrdinalToDigit(normalized);
  if (fromOrdinal === expectedDigit) return fromOrdinal;
  return spoken;
}

/** Lowercase alphanumerics for fuzzy word comparison. */
export function normalizeReciteWord(word: string): string {
  let w = word.toLowerCase().replace(/['’]/g, '');
  w = w.replace(/[^\w]/g, '');
  return COMPOUND_NUMBER_WORDS[w] ?? NUMBER_WORDS[w] ?? w;
}

export function isReciteDigitToken(token: string): boolean {
  return /^\d+$/.test(token);
}

export function isSingleDigitToken(token: string): boolean {
  return /^\d$/.test(token);
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
