import type { BibleTranslation, MemorizationPracticeMode } from '../types/memorization';
import type {
  MemorizationReorderChunk,
  MemorizationToken,
} from './memorization/memorizationPracticeUtils';

/** Volatile practicing-panel state passed as one OnPush input from the shell. */
export interface MemorizationPracticeSessionPracticeView {
  practiceMode: MemorizationPracticeMode | null;
  phase: 'intro' | 'practicing' | 'done';
  flashError: boolean;
  roundIndex: number;
  hintActive: boolean;
  tokens: MemorizationToken[];
  typableIndices: number[];
  hiddenIndices: Set<number>;
  revealed: Set<number>;
  hintPeekIndices: Set<number>;
  firstLetterCueHiddenSlots: Set<number>;
  firstLetterCueRevealedSlots: Set<number>;
  currentTargetIndex: number | null;
  currentTargetToken: MemorizationToken | null;
  reorderChunks: MemorizationReorderChunk[];
  reorderSlotChunkIds: number[];
  reorderRoundMovableIndices: Set<number>;
  reorderColonAfterSlotIndex: number | null;
  isBibleBooks: boolean;
  reference: string;
  translation: BibleTranslation;
  itemId: string;
  practiceInputId: string;
  wrongAttemptsInRound: number;
  roundCompletedWithErrors: boolean;
  strictModeEnabled: boolean;
  isFinalRound: boolean;
  awaitingRoundAdvance: boolean;
  roundAdvanceHeaderCopy: string;
}
