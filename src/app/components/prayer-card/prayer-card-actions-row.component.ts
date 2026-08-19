import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import type { PrayerCardVariantLayout } from '../../lib/prayer-card-layout';
import type { UserSessionService } from '../../services/user-session.service';
import type { PrayerEncouragementService } from '../../services/prayer-encouragement.service';

@Component({
  selector: 'app-prayer-card-actions-row',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
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
  @Input({ required: true }) userSessionService!: UserSessionService;
  @Input({ required: true }) prayerEncouragementService!: PrayerEncouragementService;

  @Output() addUpdate = new EventEmitter<void>();
  @Output() prayFor = new EventEmitter<void>();
}
