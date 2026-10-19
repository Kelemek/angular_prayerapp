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
import { showPrayerCardUpdateAuthor } from '../../lib/prayer-card-display';
import { prayerUpdateDeleteAction } from '../../lib/prayer-card-permissions';
import type { PrayerUpdateRecord } from '../../lib/prayer-update-header';
import type { BadgeService } from '../../services/badge.service';
import { HomeFilterBadgeButtonComponent } from '../home-filter-badge-button/home-filter-badge-button.component';
import {
  PrayerUpdateActionsComponent,
  type PrayerUpdateActionsMode,
} from '../prayer-update-actions/prayer-update-actions.component';
import { PrayerUpdateRowComponent } from '../prayer-update-row/prayer-update-row.component';

@Component({
  selector: 'app-prayer-card-updates-section',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    HomeFilterBadgeButtonComponent,
    PrayerUpdateRowComponent,
    PrayerUpdateActionsComponent,
  ],
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
  @Input() isGroupPrayer = false;
  @Input({ required: true }) updateBadges$!: Map<string, BehaviorSubject<boolean>>;
  @Input({ required: true }) badgeService!: BadgeService;
  @Input({ required: true }) showUpdateDelete!: boolean;
  @Input({ required: true }) updateActionsMode!: PrayerUpdateActionsMode;
  @Input() isAdmin = false;
  @Input() allowGroupOwnerDelete = false;
  @Input() currentUserEmail = '';

  get showUpdateAuthor(): boolean {
    return showPrayerCardUpdateAuthor({
      isCommunityPrayer: this.isCommunityPrayer,
      isGroupPrayer: this.isGroupPrayer,
    });
  }

  actionsModeFor(update: PrayerUpdateRecord): PrayerUpdateActionsMode {
    if (this.isGroupPrayer) {
      return this.canEditGroupUpdate(update) ? 'personal' : 'readonly';
    }
    if (this.updateActionsMode !== 'member') {
      return this.updateActionsMode;
    }
    return this.memberDeleteAction(update) === 'none' ? 'readonly' : 'member';
  }

  showDeleteFor(update: PrayerUpdateRecord): boolean {
    if (this.isGroupPrayer) {
      return this.groupUpdateDeleteAction(update) !== 'none';
    }
    if (this.updateActionsMode === 'member') {
      return this.memberDeleteAction(update) !== 'none';
    }
    return this.showUpdateDelete;
  }

  private canEditGroupUpdate(update: PrayerUpdateRecord): boolean {
    return (
      prayerUpdateDeleteAction({
        isMember: false,
        isAdmin: false,
        isPersonal: true,
        currentUserEmail: this.currentUserEmail,
        authorEmail: update.author_email,
      }) !== 'none'
    );
  }

  private groupUpdateDeleteAction(update: PrayerUpdateRecord) {
    if (this.isAdmin || this.allowGroupOwnerDelete) {
      return 'confirm' as const;
    }
    return prayerUpdateDeleteAction({
      isMember: false,
      isAdmin: false,
      isPersonal: true,
      currentUserEmail: this.currentUserEmail,
      authorEmail: update.author_email,
    });
  }

  private memberDeleteAction(update: PrayerUpdateRecord) {
    return prayerUpdateDeleteAction({
      isMember: true,
      isAdmin: this.isAdmin,
      isPersonal: false,
      currentUserEmail: this.currentUserEmail,
      authorEmail: update.author_email,
    });
  }

  @Output() toggleShowAll = new EventEmitter<void>();
  @Output() updateEdit = new EventEmitter<PrayerUpdateRecord>();
  @Output() updateDelete = new EventEmitter<string>();
  @Output() toggleAnswered = new EventEmitter<PrayerUpdateRecord>();
  @Output() markUpdateRead = new EventEmitter<string>();
}
