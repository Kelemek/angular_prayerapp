import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BibleBooksMemorizationListComponent } from '../bible-books-memorization-list/bible-books-memorization-list.component';
import { ScriptureAttributionComponent } from '../scripture-attribution/scripture-attribution.component';
import { MemorizationPracticeSessionComponent } from './memorization-practice-session.component';

@Component({
  selector: 'app-memorization-practice-session-intro',
  standalone: true,
  imports: [CommonModule, BibleBooksMemorizationListComponent, ScriptureAttributionComponent],
  templateUrl: './memorization-practice-session-intro.component.html',
})
export class MemorizationPracticeSessionIntroComponent {
  @Input({ required: true }) session!: MemorizationPracticeSessionComponent;
}
