import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MemorizationPracticeSessionPanelContext } from '../../lib/memorization-practice-session-panel-context';

@Component({
  selector: 'app-memorization-practice-session-intro-footer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-intro-footer.component.html',
})
export class MemorizationPracticeSessionIntroFooterComponent {
  @Input({ required: true }) ctx!: MemorizationPracticeSessionPanelContext;
  @Input() startRoundChoice = 1;
}
