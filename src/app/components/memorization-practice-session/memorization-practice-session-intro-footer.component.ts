import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-intro-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memorization-practice-session-intro-footer.component.html',
})
export class MemorizationPracticeSessionIntroFooterComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;
}
