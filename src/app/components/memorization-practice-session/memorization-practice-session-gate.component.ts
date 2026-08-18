import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type MemorizationPracticeSessionGateKind = 'loading' | 'error' | 'empty';

@Component({
  selector: 'app-memorization-practice-session-gate',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-gate.component.html',
})
export class MemorizationPracticeSessionGateComponent {
  @Input({ required: true }) kind!: MemorizationPracticeSessionGateKind;
  @Input() errorMessage = '';

  @Output() close = new EventEmitter<void>();
}
