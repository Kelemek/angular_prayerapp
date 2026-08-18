import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { RecitePhase } from '../../memorization-recite/memorization-recite-practice.component';
import type { MemorizationPracticeSessionPanelContext } from '../../lib/memorization-practice-session-panel-context';

@Component({
  selector: 'app-memorization-practice-session-recite-footer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-recite-footer.component.html',
})
export class MemorizationPracticeSessionReciteFooterComponent {
  @Input({ required: true }) ctx!: MemorizationPracticeSessionPanelContext;
  @Input() recitePhase: RecitePhase = 'ready';
  @Input() reciteStarting = false;
  @Input() reciteSettingsLoadedForRecord = false;
  @Input() showReciteNextRoundOption = false;
  @Input() showReciteFinishOption = false;
}
