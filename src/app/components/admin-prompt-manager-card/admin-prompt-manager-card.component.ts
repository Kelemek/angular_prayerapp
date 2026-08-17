import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PrayerPrompt } from '../../types/prayer';
import { formatPromptDate } from '../../lib/admin-prompt-manager';

@Component({
  selector: 'app-admin-prompt-manager-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prompt-manager-card.component.html',
})
export class AdminPromptManagerCardComponent {
  @Input({ required: true }) prompt!: PrayerPrompt;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  formatDate(dateString: string): string {
    return formatPromptDate(dateString);
  }
}
