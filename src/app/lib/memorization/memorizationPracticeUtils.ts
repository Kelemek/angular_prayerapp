import { formatSpokenScriptureReference, parseReference } from './parse-scripture-reference'
import type { BibleTranslation } from '../../types/memorization'
import { stripScriptureForMemorization } from './strip-scripture-for-memorization'

/** Seeded PRNG (mulberry32). */
export function seedRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic 32-bit seed from string. */
export function stringToSeed(str: string): number {
  let h = 1779033703
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

export function getWordsForMemorization(plainText: string): string[] {
  return plainText.trim().split(/\s+/).filter(Boolean)
}

/** One whitespace-delimited word from verse/book plain text → typable tokens (e.g. `1` → digit). */
export function tokenizeMemorizationPlainWord(word: string): MemorizationToken[] {
  if (/^[0-9]+$/.test(word)) {
    return word.split('').map((text) => ({ kind: 'digit' as const, text }))
  }
  return [{ kind: 'word', text: word }]
}

/** One display/typing unit: verse words, reference words, per-digit blanks, or visible punctuation (not typed). */
export type MemorizationToken = {
  kind: 'word' | 'digit' | 'punct'
  /** Word text, single digit char, or punctuation/space to show as-is */
  text: string
}

/** Parse a reference: each digit is its own token; colons, dashes, and other non-alphanumeric chars are punct (shown, not typed). */
export function parseReferenceMemorizationTokens(reference: string): MemorizationToken[] {
  const ref = reference.trim()
  if (!ref) return []
  const tokens: MemorizationToken[] = []
  let i = 0
  while (i < ref.length) {
    const c = ref[i]
    if (/\s/.test(c)) {
      if (tokens.length === 0 || tokens[tokens.length - 1]!.text !== ' ') {
        tokens.push({ kind: 'punct', text: ' ' })
      }
      while (i < ref.length && /\s/.test(ref[i])) i++
      continue
    }
    if (/[0-9]/.test(c)) {
      tokens.push({ kind: 'digit', text: c })
      i++
      continue
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i + 1
      while (j < ref.length && /[A-Za-z]/.test(ref[j]!)) j++
      tokens.push({ kind: 'word', text: ref.slice(i, j) })
      i = j
      continue
    }
    tokens.push({ kind: 'punct', text: c })
    i++
  }
  return tokens
}

/** Verse words (with spaces as punct tokens) + space + reference tokens appended for memorization. */
export function buildMemorizationTokens(versePlainText: string, reference: string): MemorizationToken[] {
  // Re-strip so legacy/cached KJV text with ¶ (etc.) cannot become stuck typable tokens.
  const verseWords = getWordsForMemorization(stripScriptureForMemorization(versePlainText))
  const out: MemorizationToken[] = []
  for (let i = 0; i < verseWords.length; i++) {
    if (out.length > 0) out.push({ kind: 'punct', text: ' ' })
    out.push(...tokenizeMemorizationPlainWord(verseWords[i]!))
  }
  const refTokens = parseReferenceMemorizationTokens(reference)
  if (refTokens.length === 0) return out
  if (out.length > 0) out.push({ kind: 'punct', text: ' ' })
  out.push(...refTokens)
  return out
}

export function getTypableTokenIndices(tokens: MemorizationToken[]): number[] {
  const idx: number[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    if (t.kind === 'word' || t.kind === 'digit') idx.push(i)
  }
  return idx
}

/** Plain line for intro / display (spaces and punctuation come from token text). */
export function formatMemorizationTokensPlain(tokens: MemorizationToken[]): string {
  return tokens.map((t) => t.text).join('')
}

/**
 * Whisper prompt style prefix — nudges STT toward the memorized translation’s English
 * without sending verse text (which biases Whisper to insert omitted words).
 */
export function reciteWhisperTranslationStylePrefix(translation: BibleTranslation): string {
  if (translation === 'kjv') {
    return 'King James Bible recitation.';
  }
  return 'Contemporary English Bible recitation.';
}

/**
 * Whisper prompt: translation style + spoken-style reference only (not the verse body).
 * Feeding the full verse biases Whisper to insert omitted words that appear in the prompt.
 */
export function formatMemorizationReciteWhisperPrompt(
  _tokens: MemorizationToken[],
  reference: string,
  translation: BibleTranslation = 'esv'
): string {
  const spokenRef = formatSpokenScriptureReference(reference.trim());
  const refPart = spokenRef || reference.trim();
  if (!refPart) return '';
  return `${reciteWhisperTranslationStylePrefix(translation)} ${refPart}`;
}

/** Round 1 = 20% hidden, … round 5 = 100%. Round 0 = 0%. */
export function hiddenFractionForRound(roundIndex: number): number {
  if (roundIndex <= 0) return 0
  return Math.min(1, roundIndex * 0.2)
}

/** How many practice rounds until 100% hidden (inclusive). */
export const MEMORIZATION_FULL_HIDE_ROUND = 5

/** One draggable unit for reorder mode (verse clauses / word groups plus reference pieces when enabled). */
export type MemorizationReorderChunk = {
  id: number
  text: string
}

const REORDER_CLAUSE_SPLIT = /[,;:\u2014\u2013]+/
const REORDER_MAX_CLAUSE_CHARS = 40
const REORDER_WORDS_PER_FALLBACK_GROUP = 3

/**
 * Split a saved reference into separate reorder chips: **book**, **chapter** (plain digits), and
 * **verse span** when the reference parses (`parseReference`). The **:** between chapter and verse
 * is not a chip; use {@link reorderReferenceColonAfterSlotIndex} for UI. Chapter-only refs yield
 * two chips; unparsable refs become a single chip.
 */
export function referenceTextsForMemorizationReorder(reference: string): string[] {
  const refT = reference.trim()
  if (refT.length === 0) return []
  const parsed = parseReference(refT)
  if (!parsed) return [refT]
  const parts: string[] = [parsed.book]
  if (parsed.verseStart != null) {
    parts.push(String(parsed.chapter))
    if (parsed.verseEnd != null && parsed.verseEnd !== parsed.verseStart) {
      parts.push(`${parsed.verseStart}-${parsed.verseEnd}`)
    } else {
      parts.push(String(parsed.verseStart))
    }
  } else {
    parts.push(String(parsed.chapter))
  }
  return parts
}

/** Slot index of the chapter-number chip after which a static **:** is rendered (before the verse chip). */
export function reorderReferenceColonAfterSlotIndex(chunkCount: number, reference: string): number | null {
  if (chunkCount < 3) return null
  if (referenceTextsForMemorizationReorder(reference).length !== 3) return null
  return chunkCount - 2
}

/**
 * Split verse body on clause punctuation (comma, semicolon, colon, em/en dash); sub-split long
 * segments into word groups. By default appends **reference** as one or more trailing chunks
 * (book, chapter, verse span; a **:** between chapter and verse is UI-only —
 * {@link referenceTextsForMemorizationReorder}, {@link reorderReferenceColonAfterSlotIndex}). Pass
 * `includeReferenceChunk: false` to omit reference pieces (e.g. tests).
 */
export function buildMemorizationReorderChunks(
  versePlainText: string,
  reference: string,
  options?: { includeReferenceChunk?: boolean }
): MemorizationReorderChunk[] {
  const includeRef = options?.includeReferenceChunk ?? true
  const verse = stripScriptureForMemorization(versePlainText)
  const textParts: string[] = []
  if (verse.length > 0) {
    const raw = verse
      .split(REORDER_CLAUSE_SPLIT)
      .map((p) => p.trim())
      .filter(Boolean)
    const clauses = raw.length > 0 ? raw : [verse]
    for (const c of clauses) {
      textParts.push(...splitReorderClausePart(c))
    }
  }
  const refT = reference.trim()
  if (refT.length > 0 && includeRef) {
    textParts.push(...referenceTextsForMemorizationReorder(refT))
  }
  return textParts.map((text, id) => ({ id, text }))
}

/** One reorder chip per Bible book name (canon order). */
export function buildBibleBooksReorderChunks(bookNames: string[]): MemorizationReorderChunk[] {
  return bookNames.map((text, id) => ({ id, text }))
}

function splitReorderClausePart(part: string): string[] {
  const words = part.split(/\s+/).filter(Boolean)
  if (
    part.length <= REORDER_MAX_CLAUSE_CHARS &&
    words.length <= REORDER_WORDS_PER_FALLBACK_GROUP
  ) {
    return [part]
  }
  if (words.length === 0) return [part]
  const out: string[] = []
  for (let i = 0; i < words.length; i += REORDER_WORDS_PER_FALLBACK_GROUP) {
    out.push(words.slice(i, i + REORDER_WORDS_PER_FALLBACK_GROUP).join(' '))
  }
  return out
}

/** How many chunks participate in shuffling this round (monotone in round; ≥2 when n≥2) except full round uses all. */
export function reorderMovableCountForRound(roundIndex: number, chunkCount: number): number {
  if (chunkCount <= 1 || roundIndex <= 0) return 0
  const fraction = hiddenFractionForRound(roundIndex)
  const fromFrac = Math.ceil(chunkCount * fraction)
  let k = Math.max(2, fromFrac)
  if (roundIndex >= MEMORIZATION_FULL_HIDE_ROUND) {
    k = chunkCount
  }
  return Math.min(chunkCount, k)
}

/** Seeded subset of chunk indices (sorted ascending) that are shuffled this round. */
export function pickReorderMovableIndices(
  chunkCount: number,
  roundIndex: number,
  seedStr: string
): number[] {
  const need = reorderMovableCountForRound(roundIndex, chunkCount)
  if (need <= 0 || chunkCount === 0) return []
  const rng = seedRandom(stringToSeed(`${seedStr}-mem-reorder-movable-r${roundIndex}`))
  const ix = Array.from({ length: chunkCount }, (_, i) => i)
  for (let i = ix.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[ix[i], ix[j]] = [ix[j]!, ix[i]!]
  }
  const chosen = ix.slice(0, need)
  chosen.sort((a, b) => a - b)
  return chosen
}

/**
 * `assignment[slot]` = id of chunk shown at that slot. Locked slots stay identity; movable slots
 * get a derangement so no movable slot starts with its own chunk id.
 */
export function buildInitialReorderSlotAssignment(
  chunkCount: number,
  movableIndices: number[],
  rng: () => number
): number[] {
  const assignment = Array.from({ length: chunkCount }, (_, i) => i)
  const m = [...movableIndices].sort((a, b) => a - b)
  if (m.length < 2) {
    return assignment
  }
  const permutedIds = derangeMovableChunkIds(m, rng)
  for (let k = 0; k < m.length; k++) {
    assignment[m[k]!] = permutedIds[k]!
  }
  return assignment
}

/** Permutation of chunk ids for movable slots so no id sits in its home slot. */
function derangeMovableChunkIds(sortedSlots: number[], rng: () => number): number[] {
  const n = sortedSlots.length
  const ids = sortedSlots.map((s) => s)
  for (let attempt = 0; attempt < 80; attempt++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[ids[i], ids[j]] = [ids[j]!, ids[i]!]
    }
    let ok = true
    for (let k = 0; k < n; k++) {
      if (ids[k] === sortedSlots[k]) {
        ok = false
        break
      }
    }
    if (ok) return ids
  }
  const rot = ids.slice(1).concat(ids[0]!)
  for (let k = 0; k < n; k++) {
    if (rot[k] === sortedSlots[k]) {
      return [...rot].reverse()
    }
  }
  return rot
}

/** Unique per practice run so blanked words differ each session (still stable per round within one session). */
export function generateMemorizationSessionSeed(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

export function pickHiddenWordIndices(
  wordCount: number,
  roundIndex: number,
  seedStr: string
): Set<number> {
  const fraction = hiddenFractionForRound(roundIndex)
  if (wordCount === 0 || fraction <= 0) return new Set()
  const target = Math.max(1, Math.round(wordCount * fraction))
  const hideCount = Math.min(wordCount, roundIndex >= MEMORIZATION_FULL_HIDE_ROUND ? wordCount : target)

  const rng = seedRandom(stringToSeed(`${seedStr}-memorize-round-${roundIndex}`))
  const indices = Array.from({ length: wordCount }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return new Set(indices.slice(0, hideCount))
}

/** First alphabetic character for typing match (handles leading punctuation; lowercase for case-insensitive compare). */
export function firstLetterOfWord(word: string): string {
  const m = word.match(/[A-Za-zÀ-ÿ]/u)
  return m ? m[0].toLowerCase() : ''
}

/** First alphabetic character as it appears in the word (for initials cue display). */
export function firstLetterGlyphOfWord(word: string): string {
  const m = word.match(/[A-Za-zÀ-ÿ]/u)
  return m ? m[0] : ''
}

/** Single-character hint for initials practice mode (word → first letter preserving case; digit → digit). */
export function cueGlyphForTypableToken(token: MemorizationToken): string {
  if (token.kind === 'digit') return token.text
  if (token.kind === 'word') {
    const letter = firstLetterGlyphOfWord(token.text)
    return letter || '·'
  }
  return ''
}

/**
 * 0-based typable-slot indices (0..typableCount-1) whose cue glyphs are **hidden** this round.
 * Round 1: none; rounds 2–4: ~25% / ~50% / ~75%; round 5: all. Seeded shuffle is stable per seed+round.
 */
export function pickHiddenCueTypableSlotIndices(
  typableCount: number,
  roundIndex: number,
  seedStr: string
): Set<number> {
  if (typableCount <= 0 || roundIndex <= 0) return new Set()
  if (roundIndex >= MEMORIZATION_FULL_HIDE_ROUND) {
    return new Set(Array.from({ length: typableCount }, (_, i) => i))
  }
  const step = (roundIndex - 1) / (MEMORIZATION_FULL_HIDE_ROUND - 1)
  const hideCount = Math.round(typableCount * step)
  if (hideCount <= 0) return new Set()

  const rng = seedRandom(stringToSeed(`${seedStr}-mem-firstletter-cue-r${roundIndex}`))
  const indices = Array.from({ length: typableCount }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
  }
  return new Set(indices.slice(0, Math.min(typableCount, hideCount)))
}

/**
 * Labels for word-mode multiple choice: always includes the correct `tokens[targetIndex].text`.
 * - **Word** blanks: distractors are other **word** tokens only (no reference digits).
 * - **Digit** blanks: distractors use other **digit** tokens first, then random digits **not** appearing
 *   anywhere in the passage as a digit; if still short, any unused digit.
 * Caller supplies `rng` so order is stable across re-renders for a given blank.
 */
export function buildMemorizationChoiceLabels(
  tokens: MemorizationToken[],
  typableIndices: number[],
  targetIndex: number,
  choiceCount: number,
  rng: () => number
): string[] {
  const targetToken = tokens[targetIndex]
  if (
    !targetToken ||
    (targetToken.kind !== 'word' && targetToken.kind !== 'digit') ||
    !typableIndices.includes(targetIndex)
  ) {
    return []
  }
  const correct = targetToken.text

  const verseDigitChars = new Set<string>()
  for (const idx of typableIndices) {
    const t = tokens[idx]
    if (t?.kind === 'digit') verseDigitChars.add(t.text)
  }

  const wrongPool: string[] = []
  const seen = new Set<string>()
  for (const idx of typableIndices) {
    if (idx === targetIndex) continue
    const t = tokens[idx]
    if (!t || t.kind === 'punct') continue
    if (targetToken.kind === 'word' && t.kind !== 'word') continue
    if (targetToken.kind === 'digit' && t.kind !== 'digit') continue
    const label = t.text
    if (label === correct) continue
    if (seen.has(label)) continue
    seen.add(label)
    wrongPool.push(label)
  }

  const takeDistractors = (pool: string[], n: number): string[] => {
    if (n <= 0 || pool.length === 0) return []
    const copy = [...pool]
    const out: string[] = []
    let remaining = copy.length
    for (let k = 0; k < n && remaining > 0; k++) {
      const pick = Math.floor(rng() * remaining)
      out.push(copy[pick]!)
      copy[pick] = copy[remaining - 1]!
      remaining--
    }
    return out
  }

  const needWrong = Math.max(0, choiceCount - 1)
  const distractors = takeDistractors(wrongPool, needWrong)

  if (targetToken.kind === 'digit' && distractors.length < needWrong) {
    const used = new Set<string>([correct, ...distractors])
    const pickExtraDigits = (candidates: string[]) => {
      const copy = [...candidates]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
      }
      for (const d of copy) {
        if (distractors.length >= needWrong) return
        if (used.has(d)) continue
        distractors.push(d)
        used.add(d)
      }
    }
    const notInVerse = '0123456789'.split('').filter((d) => !verseDigitChars.has(d))
    pickExtraDigits(notInVerse)
    if (distractors.length < needWrong) {
      pickExtraDigits('0123456789'.split('').filter((d) => !used.has(d)))
    }
  }

  const labels = [correct, ...distractors]
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[labels[i], labels[j]] = [labels[j]!, labels[i]!]
  }
  return labels
}

/** Word-choice footer rows on narrow viewports (below Tailwind `sm`). */
export const MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT = 3;

/** Word-choice footer rows on `sm` and wider viewports. */
export const MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMFORTABLE = 2;

/** Tailwind `sm` — word-choice footer switches to fewer rows at this width and above. */
export const MEMORIZATION_WORD_CHOICE_SM_MIN_WIDTH_PX = 640;

export const MEMORIZATION_WORD_CHOICE_COMFORTABLE_MEDIA_QUERY =
  `(min-width: ${MEMORIZATION_WORD_CHOICE_SM_MIN_WIDTH_PX}px)` as const;

export function memorizationWordChoiceRowCount(isComfortableWidth: boolean): number {
  return isComfortableWidth
    ? MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMFORTABLE
    : MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT;
}

/** Split word-mode choices into balanced rows for a stable footer layout. */
export function splitMemorizationChoiceRows(
  labels: readonly string[],
  rowCount = MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT
): readonly string[][] {
  if (rowCount <= 0) return [];
  if (labels.length === 0) {
    return Array.from({ length: rowCount }, () => [] as string[]);
  }
  const base = Math.floor(labels.length / rowCount);
  let remainder = labels.length % rowCount;
  const rows: string[][] = [];
  let offset = 0;
  for (let i = 0; i < rowCount; i++) {
    const size = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    rows.push(labels.slice(offset, offset + size));
    offset += size;
  }
  return rows;
}
