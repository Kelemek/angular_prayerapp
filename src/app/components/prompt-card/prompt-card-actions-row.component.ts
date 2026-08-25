import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PromptCardVariantLayout } from '../../lib/prayer-card-layout';

@Component({
  selector: 'app-prompt-card-actions-row',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prompt-card-actions-row.component.html',
})
export class PromptCardActionsRowComponent {
  @Input({ required: true }) variantLayout!: PromptCardVariantLayout;
  @Input({ required: true }) prayedForCount!: number;
  @Input({ required: true }) prayedForCountLabel!: string;
  @Input({ required: true }) showPrayedForBadge!: boolean;
  @Input({ required: true }) canPrayFor!: boolean;
  @Input({ required: true }) showPrayForButton!: boolean;
  @Input({ required: true }) showPrayingCount!: boolean;
  @Input({ required: true }) prayerEncouragementEnabled!: boolean;
  @Input({ required: true }) cooldownHours!: number;

  @Output() prayFor = new EventEmitter<void>();
}
