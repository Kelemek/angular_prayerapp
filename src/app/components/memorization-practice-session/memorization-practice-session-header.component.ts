import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MemorizationPracticeMode } from '../../types/memorization';
import type { RecitePhase } from '../../memorization-recite/memorization-recite-practice.component';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memorization-practice-session-header.component.html',
})
export class MemorizationPracticeSessionHeaderComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;
  @Input() phase: 'intro' | 'practicing' | 'done' = 'intro';
  @Input() displayPracticeErrors = 0;
  @Input() awaitingRoundAdvance = false;
  @Input() practiceMode: MemorizationPracticeMode | null = null;
  @Input() recitePhase: RecitePhase = 'ready';
  @Input() hintActive = false;
  @Input() listenPanelOpen = false;

  @ViewChild('hintButton') hintButtonRef?: ElementRef<HTMLButtonElement>;
}
