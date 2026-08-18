import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BibleBooksMemorizationScope, BibleTranslation } from '../../types/memorization';
import { BibleBooksMemorizationListComponent } from '../bible-books-memorization-list/bible-books-memorization-list.component';
import { ScriptureAttributionComponent } from '../scripture-attribution/scripture-attribution.component';

@Component({
  selector: 'app-memorization-practice-session-intro',
  standalone: true,
  imports: [CommonModule, BibleBooksMemorizationListComponent, ScriptureAttributionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memorization-practice-session-intro.component.html',
})
export class MemorizationPracticeSessionIntroComponent {
  @Input() isBibleBooks = false;
  @Input() introTokensPlain = '';
  @Input() introTranslation: BibleTranslation = 'esv';
  @Input() bibleBooksScope?: BibleBooksMemorizationScope;
}
