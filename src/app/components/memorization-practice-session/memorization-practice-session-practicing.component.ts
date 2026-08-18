import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MemorizationRecitePracticeComponent,
} from '../../memorization-recite/memorization-recite-practice.component';
import { MemorizationReorderPanelComponent } from '../memorization-reorder-panel/memorization-reorder-panel.component';
import type { MemorizationPracticeSessionPanelContext } from '../../lib/memorization-practice-session-panel-context';
import type { MemorizationPracticeSessionPracticeView } from '../../lib/memorization-practice-session-practice-view';
import {
  MEMORIZATION_FULL_HIDE_ROUND,
  cueGlyphForTypableToken,
  hiddenFractionForRound,
  memorizationIsCurrentBlank,
  memorizationIsTokenHidden,
  memorizationIsTokenRevealed,
  memorizationShowViaHint,
  reorderMovableCountForRound,
} from '../../lib/memorization/memorizationPracticeUtils';

@Component({
  selector: 'app-memorization-practice-session-practicing',
  standalone: true,
  imports: [CommonModule, MemorizationRecitePracticeComponent, MemorizationReorderPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-practicing.component.html',
})
export class MemorizationPracticeSessionPracticingComponent {
  @Input({ required: true }) ctx!: MemorizationPracticeSessionPanelContext;
  @Input({ required: true }) view!: MemorizationPracticeSessionPracticeView;
  @Input() scrollParentRef: HTMLDivElement | null = null;

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
    return memorizationIsTokenHidden(i, this.view.hiddenIndices);
  }

  isTokenRevealed(i: number): boolean {
    return memorizationIsTokenRevealed(i, this.view.revealed);
  }

  isCurrentBlank(i: number): boolean {
    return memorizationIsCurrentBlank(
      i,
      this.view.hiddenIndices,
      this.view.revealed,
      this.view.currentTargetIndex,
    );
  }

  showViaHint(i: number): boolean {
    return memorizationShowViaHint(
      i,
      this.view.hintActive,
      this.view.hiddenIndices,
      this.view.revealed,
      this.view.hintPeekIndices,
    );
  }
}
