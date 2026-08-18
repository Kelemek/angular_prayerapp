import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-round-advance-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memorization-practice-session-round-advance-footer.component.html',
})
export class MemorizationPracticeSessionRoundAdvanceFooterComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;
  @Input() roundAffirmation = '';
  @Input() showNextRoundOption = false;
  @Input() showFinishPracticeOption = false;
}
