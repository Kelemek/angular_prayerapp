import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MemorizationPracticeSessionPanelContext } from '../../lib/memorization-practice-session-panel-context';

@Component({
  selector: 'app-memorization-practice-session-recite-feedback',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-recite-feedback.component.html',
})
export class MemorizationPracticeSessionReciteFeedbackComponent {
  @Input({ required: true }) ctx!: MemorizationPracticeSessionPanelContext;
}
