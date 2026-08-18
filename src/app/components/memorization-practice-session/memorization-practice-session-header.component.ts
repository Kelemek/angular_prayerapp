import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MemorizationPracticeMode } from '../../types/memorization';
import type { RecitePhase } from '../../memorization-recite/memorization-recite-practice.component';
import type { MemorizationPracticeSessionPanelContext } from '../../lib/memorization-practice-session-panel-context';

@Component({
  selector: 'app-memorization-practice-session-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-header.component.html',
})
export class MemorizationPracticeSessionHeaderComponent {
  @Input({ required: true }) ctx!: MemorizationPracticeSessionPanelContext;
  @Input() phase: 'intro' | 'practicing' | 'done' = 'intro';
  @Input() displayPracticeErrors = 0;
  @Input() awaitingRoundAdvance = false;
  @Input() practiceMode: MemorizationPracticeMode | null = null;
  @Input() recitePhase: RecitePhase = 'ready';
  @Input() hintActive = false;
  @Input() listenPanelOpen = false;
  @Input() showListenOpeners = false;
  @Input() showStartOver = false;

  @ViewChild('hintButton') hintButtonRef?: ElementRef<HTMLButtonElement>;
}
