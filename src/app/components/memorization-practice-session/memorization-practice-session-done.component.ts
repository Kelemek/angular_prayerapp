import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MemorizationPracticeSessionPanelContext } from '../../lib/memorization-practice-session-panel-context';

@Component({
  selector: 'app-memorization-practice-session-done',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-done.component.html',
})
export class MemorizationPracticeSessionDoneComponent {
  @Input({ required: true }) ctx!: MemorizationPracticeSessionPanelContext;
  @Input() completionMessage = '';
}
