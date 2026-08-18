import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MemorizationPracticeSessionPanelContext } from '../../lib/memorization-practice-session-panel-context';

@Component({
  selector: 'app-memorization-practice-session-round-advance-footer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-round-advance-footer.component.html',
})
export class MemorizationPracticeSessionRoundAdvanceFooterComponent {
  @Input({ required: true }) ctx!: MemorizationPracticeSessionPanelContext;
  @Input() roundAffirmation = '';
  @Input() showNextRoundOption = false;
  @Input() showFinishPracticeOption = false;
}
