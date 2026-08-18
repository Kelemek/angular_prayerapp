import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BibleTranslation, MemorizationPracticeMode } from '../../types/memorization';
import {
  MemorizationRecitePracticeComponent,
  type ReciteAttemptMetrics,
} from '../../memorization-recite/memorization-recite-practice.component';
import { MemorizationReorderPanelComponent } from '../memorization-reorder-panel/memorization-reorder-panel.component';
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  cueGlyphForTypableToken,
  hiddenFractionForRound,
  reorderMovableCountForRound,
  type MemorizationReorderChunk,
  type MemorizationToken,
} from '../../lib/memorization/memorizationPracticeUtils';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-practicing',
  standalone: true,
  imports: [CommonModule, MemorizationRecitePracticeComponent, MemorizationReorderPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-practicing.component.html',
})
export class MemorizationPracticeSessionPracticingComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;

  @Input() scrollParentRef: HTMLDivElement | null = null;
  @Input() awaitingRoundAdvance = false;
  @Input() roundAdvanceHeaderCopy = '';
  @Input() practiceMode: MemorizationPracticeMode | null = null;
  @Input() phase: 'intro' | 'practicing' | 'done' = 'intro';
  @Input() flashError = false;
  @Input() roundIndex = 0;
  @Input() hintActive = false;
  @Input() tokens: MemorizationToken[] = [];
  @Input() typableIndices: number[] = [];
  @Input() hiddenIndices = new Set<number>();
  @Input() revealed = new Set<number>();
  @Input() hintPeekIndices = new Set<number>();
  @Input() firstLetterCueHiddenSlots = new Set<number>();
  @Input() firstLetterCueRevealedSlots = new Set<number>();
  @Input() currentTargetIndex: number | null = null;
  @Input() currentTargetToken: MemorizationToken | null = null;
  @Input() reorderChunks: MemorizationReorderChunk[] = [];
  @Input() reorderSlotChunkIds: number[] = [];
  @Input() reorderRoundMovableIndices = new Set<number>();
  @Input() reorderColonAfterSlotIndex: number | null = null;
  @Input() isBibleBooks = false;
  @Input() reference = '';
  @Input() translation: BibleTranslation = 'esv';
  @Input() itemId = '';
  @Input() practiceInputId = '';
  @Input() wrongAttemptsInRound = 0;
  @Input() roundCompletedWithErrors = false;
  @Input() strictModeEnabled = false;
  @Input() isFinalRound = false;

  readonly MEMORIZATION_FULL_HIDE_ROUND = MEMORIZATION_FULL_HIDE_ROUND;
  readonly Math = Math;
  readonly hiddenFractionForRound = hiddenFractionForRound;
  readonly reorderMovableCountForRound = reorderMovableCountForRound;
  readonly cueGlyphForTypableToken = cueGlyphForTypableToken;

  @ViewChild('firstLetterCuesViewport') firstLetterCuesViewportRef?: ElementRef<HTMLDivElement>;
  @ViewChild('practiceWordsWord') practiceWordsWordRef?: ElementRef<HTMLDivElement>;
  @ViewChild('practiceWordsType') practiceWordsTypeRef?: ElementRef<HTMLLabelElement>;
  @ViewChild(MemorizationRecitePracticeComponent) recitePracticeRef?: MemorizationRecitePracticeComponent;

  isTokenHidden(i: number): boolean {
    return this.hiddenIndices.has(i);
  }

  isTokenRevealed(i: number): boolean {
    return this.revealed.has(i);
  }

  isCurrentBlank(i: number): boolean {
    return this.isTokenHidden(i) && !this.isTokenRevealed(i) && i === this.currentTargetIndex;
  }

  showViaHint(i: number): boolean {
    return (
      this.hintActive &&
      this.isTokenHidden(i) &&
      !this.isTokenRevealed(i) &&
      this.hintPeekIndices.has(i)
    );
  }

  onReciteClearHint(): void {
    this.session.onReciteClearHint();
  }

  onReciteAttemptMetrics(metrics: ReciteAttemptMetrics): void {
    this.session.onReciteAttemptMetrics(metrics);
  }

  onReciteRepeatRound(): void {
    this.session.onReciteRepeatRound();
  }

  onReciteNextRound(): void {
    this.session.onReciteNextRound();
  }

  onReciteFinishPractice(): void {
    this.session.onReciteFinishPractice();
  }

  onReorderSlotChunkIdsChange(ids: number[]): void {
    this.session.onReorderSlotChunkIdsChange(ids);
  }

  onReorderInvalidDrop(): void {
    this.session.onReorderInvalidDrop();
  }

  onReorderSlotsBecameCorrect(slots: number[]): void {
    this.session.onReorderSlotsBecameCorrect(slots);
  }

  onReorderWrongSwap(): void {
    this.session.onReorderWrongSwap();
  }

  onVerseTouchStart(event: TouchEvent): void {
    this.session.onVerseTouchStart(event);
  }

  onVerseTouchMove(event: TouchEvent): void {
    this.session.onVerseTouchMove(event);
  }

  onVerseTouchCancel(): void {
    this.session.onVerseTouchCancel();
  }

  onVerseTouchEnd(): void {
    this.session.onVerseTouchEnd();
  }
}
