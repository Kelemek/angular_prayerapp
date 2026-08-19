import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import type { BehaviorSubject } from 'rxjs';
import type { PrayerCardVariantLayout } from '../../lib/prayer-card-layout';
import type { PrayerUpdateRecord } from '../../lib/prayer-update-header';
import type { BadgeService } from '../../services/badge.service';
import {
  PrayerUpdateActionsComponent,
  type PrayerUpdateActionsMode,
} from '../prayer-update-actions/prayer-update-actions.component';
import { PrayerUpdateRowComponent } from '../prayer-update-row/prayer-update-row.component';

@Component({
  selector: 'app-prayer-card-updates-section',
  standalone: true,
  imports: [CommonModule, AsyncPipe, PrayerUpdateRowComponent, PrayerUpdateActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prayer-card-updates-section.component.html',
})
export class PrayerCardUpdatesSectionComponent {
  @Input({ required: true }) variantLayout!: PrayerCardVariantLayout;
  @Input({ required: true }) prayerUpdates!: PrayerUpdateRecord[];
  @Input({ required: true }) displayedUpdates!: PrayerUpdateRecord[];
  @Input({ required: true }) showTopMargin!: boolean;
  @Input({ required: true }) showAllUpdates!: boolean;
  @Input({ required: true }) shouldShowToggle!: boolean;
  @Input({ required: true }) showTourAnchors!: boolean;
  @Input({ required: true }) showsCommunityUnreadBadges!: boolean;
  @Input({ required: true }) isCommunityPrayer!: boolean;
  @Input({ required: true }) updateBadges$!: Map<string, BehaviorSubject<boolean>>;
  @Input({ required: true }) badgeService!: BadgeService;
  @Input({ required: true }) showUpdateDelete!: boolean;
  @Input({ required: true }) updateActionsMode!: PrayerUpdateActionsMode;

  @Output() toggleShowAll = new EventEmitter<void>();
  @Output() updateEdit = new EventEmitter<PrayerUpdateRecord>();
  @Output() updateDelete = new EventEmitter<string>();
  @Output() toggleAnswered = new EventEmitter<PrayerUpdateRecord>();
  @Output() markUpdateRead = new EventEmitter<string>();
}
