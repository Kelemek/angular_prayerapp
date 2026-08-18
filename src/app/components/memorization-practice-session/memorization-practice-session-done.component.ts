import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-done',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memorization-practice-session-done.component.html',
})
export class MemorizationPracticeSessionDoneComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;
  @Input() completionMessage = '';
}
