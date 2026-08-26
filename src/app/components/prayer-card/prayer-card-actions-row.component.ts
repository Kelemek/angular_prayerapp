import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PrayerCardVariantLayout } from '../../lib/prayer-card-layout';
@Component({
  selector: 'app-prayer-card-actions-row',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prayer-card-actions-row.component.html',
})
export class PrayerCardActionsRowComponent {
  @Input({ required: true }) variantLayout!: PrayerCardVariantLayout;
  @Input({ required: true }) showTourAnchors!: boolean;
  @Input({ required: true }) tourPersonalWalkthroughAnchors!: boolean;
  @Input({ required: true }) tourUpdateAnchors!: boolean;
  @Input({ required: true }) tourPrayForEncouragementAnchors!: boolean;
  @Input({ required: true }) prayedForCount!: number;
  @Input({ required: true }) prayedForCountLabel!: string;
  @Input({ required: true }) showPrayedForBadge!: boolean;
  @Input({ required: true }) usesPersonalCooldown!: boolean;
  @Input({ required: true }) canPrayFor!: boolean;
  @Input() showPrayForButton = true;
  @Input() showPrayingCount = true;
  @Input() prayerEncouragementEnabled = true;
  @Input() cooldownHours = 4;

  @Output() addUpdate = new EventEmitter<void>();
  @Output() prayFor = new EventEmitter<void>();
}
