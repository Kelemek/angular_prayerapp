import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MemorizationPracticeSessionPanelContext } from '../../lib/memorization-practice-session-panel-context';

@Component({
  selector: 'app-memorization-practice-session-mode-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-mode-picker.component.html',
})
export class MemorizationPracticeSessionModePickerComponent {
  @Input({ required: true }) ctx!: MemorizationPracticeSessionPanelContext;
  @Input() reciteModeBlockedMessage: string | null = null;
  @Input() reciteModeVisible = false;
}
