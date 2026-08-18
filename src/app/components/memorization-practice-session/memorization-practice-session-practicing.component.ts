import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MemorizationRecitePracticeComponent,
  type ReciteAttemptMetrics,
} from '../../memorization-recite/memorization-recite-practice.component';
import { MemorizationReorderPanelComponent } from '../memorization-reorder-panel/memorization-reorder-panel.component';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-practicing',
  standalone: true,
  imports: [CommonModule, MemorizationRecitePracticeComponent, MemorizationReorderPanelComponent],
  templateUrl: './memorization-practice-session-practicing.component.html',
})
export class MemorizationPracticeSessionPracticingComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;
  @Input() scrollParentRef: HTMLDivElement | null = null;
  @Input() awaitingRoundAdvance = false;
  @Input() roundAdvanceHeaderCopy = '';

  @ViewChild('firstLetterCuesViewport') firstLetterCuesViewportRef?: ElementRef<HTMLDivElement>;
  @ViewChild('practiceWordsWord') practiceWordsWordRef?: ElementRef<HTMLDivElement>;
  @ViewChild('practiceWordsType') practiceWordsTypeRef?: ElementRef<HTMLLabelElement>;
  @ViewChild(MemorizationRecitePracticeComponent) recitePracticeRef?: MemorizationRecitePracticeComponent;

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
}
