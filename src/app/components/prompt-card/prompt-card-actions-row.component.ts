import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import type { PromptCardVariantLayout } from '../../lib/prayer-card-layout';
import type { UserSessionService } from '../../services/user-session.service';
import type { PrayerEncouragementService } from '../../services/prayer-encouragement.service';

@Component({
  selector: 'app-prompt-card-actions-row',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-card-actions-row.component.html',
})
export class PromptCardActionsRowComponent {
  @Input({ required: true }) variantLayout!: PromptCardVariantLayout;
  @Input({ required: true }) prayedForCount!: number;
  @Input({ required: true }) prayedForCountLabel!: string;
  @Input({ required: true }) showPrayedForBadge!: boolean;
  @Input({ required: true }) canPrayFor!: boolean;
  @Input({ required: true }) userSessionService!: UserSessionService;
  @Input({ required: true }) prayerEncouragementService!: PrayerEncouragementService;

  @Output() prayFor = new EventEmitter<void>();
}
