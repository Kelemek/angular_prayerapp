import type { MemorizationPracticeMode } from '../types/memorization';
import { MEMORIZATION_FULL_HIDE_ROUND, pickHiddenWordIndices } from './memorization/memorizationPracticeUtils';

export const MAX_WRONG_BEFORE_REVEAL = 3;
export const MEMORIZATION_WORD_CHOICE_COUNT_WORD = 8;
export const MEMORIZATION_WORD_CHOICE_COUNT_DIGIT = 6;
export const MEMORIZE_EXTRA_GAP_ABOVE_KEYBOARD_PX = 48;
export const MEMORIZE_EXTRA_GAP_ABOVE_WORD_CHOICES_PX = 16;
export const MEMORIZE_HINT_EXTRA_PEEK_INTERVAL_MS = 1000;
export const ANDROID_SCROLL_CLAMP_MS = 600;
export const MEMORIZE_LISTEN_CONTROLS_DIALOG_ID = 'memorize-listen-controls-dialog';
export const MEMORIZE_LISTEN_CONTROLS_TITLE_ID = 'memorize-listen-controls-title';

export const MEMORIZE_INTRO_START_ROUND_OPTIONS = Array.from(
  { length: MEMORIZATION_FULL_HIDE_ROUND },
  (_, i) => ({ value: i + 1, label: `Round ${i + 1}` }),
);

/** Border matches header Request (`btn-chip-blue`). */
export const MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS =
  'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-600 dark:border-blue-500';

export const MEMORIZE_PRACTICE_BLUE_BTN_CLASS =
  `${MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS} rounded-lg font-medium transition-colors cursor-pointer`;

export const MEMORIZE_PRACTICE_BLUE_BTN_HINT_CLASS =
  `${MEMORIZE_PRACTICE_BLUE_BTN_FILL_CLASS} active:bg-blue-200 dark:active:bg-blue-900/70 text-sm rounded-lg transition-colors select-none touch-manipulation cursor-pointer font-medium`;

export function hiddenTypingTokenIndices(
  mode: MemorizationPracticeMode | null | undefined,
  roundIndex: number,
  seed: string,
  typableIndices: number[],
): Set<number> {
  if (mode === 'firstLetters') return new Set(typableIndices);
  const localHidden = pickHiddenWordIndices(typableIndices.length, roundIndex, seed);
  return new Set([...localHidden].map((li) => typableIndices[li]!));
}
