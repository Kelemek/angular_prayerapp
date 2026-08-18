import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { RecitePhase } from '../../memorization-recite/memorization-recite-practice.component';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-recite-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memorization-practice-session-recite-footer.component.html',
})
export class MemorizationPracticeSessionReciteFooterComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;
  @Input() recitePhase: RecitePhase = 'ready';
  @Input() reciteStarting = false;
  @Input() reciteSettingsLoadedForRecord = false;
  @Input() showReciteNextRoundOption = false;
  @Input() showReciteFinishOption = false;
}
