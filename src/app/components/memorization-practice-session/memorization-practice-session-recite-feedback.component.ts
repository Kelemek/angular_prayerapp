import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-recite-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memorization-practice-session-recite-feedback.component.html',
})
export class MemorizationPracticeSessionReciteFeedbackComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;
}
