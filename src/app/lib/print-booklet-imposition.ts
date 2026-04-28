/**
 * Saddle-stitch imposition for folded letter booklets (duplex, 2 half-letter panels per side).
 * Reader pages are 1-indexed conceptually; arrays are 0-indexed.
 *
 * For N reader pages (N divisible by 4), sheet s (0-based) uses:
 * - Front: page (N - 2s) | page (2s + 1)
 * - Back:  page (2s + 2) | page (N - 2s - 1)
 */

export function padToMultipleOfFour<T>(readerPages: T[], blankFactory: () => T): T[] {
  const n = readerPages.length;
  const rem = n % 4;
  if (rem === 0) {
    return [...readerPages];
  }
  const padCount = 4 - rem;
  const out = [...readerPages];
  for (let i = 0; i < padCount; i++) {
    out.push(blankFactory());
  }
  return out;
}

/**
 * Pad so total length is a multiple of 4 with **back cover last** (for saddle-stitch).
 * `pagesBeforeBack` is front cover + all content pages (not the back cover).
 * Inserts blank pages **before** the back cover so the physical outside back stays the final reader page.
 */
export function padToMultipleOfFourWithBackCoverLast<T>(
  pagesBeforeBack: T[],
  blankFactory: () => T,
  backCover: T
): T[] {
  const padCount = (4 - ((pagesBeforeBack.length + 1) % 4)) % 4;
  const blanks: T[] = [];
  for (let i = 0; i < padCount; i++) {
    blanks.push(blankFactory());
  }
  return [...pagesBeforeBack, ...blanks, backCover];
}

export interface BookletPrintSide<T> {
  left: T;
  right: T;
}

/**
 * Returns print sides in order: front of sheet 0, back of sheet 0, front of sheet 1, ...
 * Each side is two panels (left | right) for letter landscape.
 */
export function saddleStitchImpose<T>(readerPages: T[]): BookletPrintSide<T>[] {
  const N = readerPages.length;
  if (N === 0) {
    return [];
  }
  if (N % 4 !== 0) {
    throw new Error(`saddleStitchImpose: page count must be a multiple of 4, got ${N}`);
  }
  const numSheets = N / 4;
  const result: BookletPrintSide<T>[] = [];
  for (let s = 0; s < numSheets; s++) {
    result.push({
      left: readerPages[N - 2 * s - 1],
      right: readerPages[2 * s]
    });
    result.push({
      left: readerPages[2 * s + 1],
      right: readerPages[N - 2 * s - 2]
    });
  }
  return result;
}
