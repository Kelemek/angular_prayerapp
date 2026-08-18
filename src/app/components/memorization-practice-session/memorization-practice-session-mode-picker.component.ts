import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-mode-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memorization-practice-session-mode-picker.component.html',
})
export class MemorizationPracticeSessionModePickerComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;
  /** Bound separately so the picker refreshes when the parent mutates under OnPush. */
  @Input() reciteModeBlockedMessage: string | null = null;
}
