import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import type { Observable } from 'rxjs';
import { HomeFilterBadgeButtonComponent } from '../home-filter-badge-button/home-filter-badge-button.component';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import type { BadgeService } from '../../services/badge.service';
import type { PrayerRequest } from '../../services/prayer.service';
import { isMemberPrayerId } from '../../lib/prayer-card-kind';
import { verseMemorizationTextForDisplay } from '../../lib/verse-memorization-description';
import type { PrayerCardVariantLayout } from '../../lib/prayer-card-layout';

@Component({
  selector: 'app-prayer-card-title-body',
  standalone: true,
  imports: [AsyncPipe, HomeFilterBadgeButtonComponent, RichTextViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prayer-card-title-body.component.html',
})
export class PrayerCardTitleBodyComponent {
  @Input({ required: true }) variantLayout!: PrayerCardVariantLayout;
  @Input({ required: true }) prayer!: PrayerRequest;
  @Input() isPersonal = false;
  @Input() showTourAnchors = false;
  @Input() tourPersonalWalkthroughAnchors = false;
  @Input() personalDragHandle = false;
  @Input() personalDragTourId: string | null = null;
  @Input({ required: true }) displayRequester!: string;
  @Input() showDescription = false;
  @Input() isVerseMemorization = false;
  @Input() showsCommunityUnreadBadges = false;
  @Input() prayerBadge$: Observable<boolean> | null = null;
  @Input({ required: true }) badgeService!: BadgeService;

  @Output() markPrayerRead = new EventEmitter<void>();

  isMemberPrayer(): boolean {
    return isMemberPrayerId(this.prayer?.id);
  }

  verseTextForDisplay(): string {
    return verseMemorizationTextForDisplay(
      this.prayer.description,
      this.prayer.verse_reference
    );
  }

  onMarkPrayerRead(): void {
    this.markPrayerRead.emit();
  }
}
