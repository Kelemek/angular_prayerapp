import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import type { Observable } from 'rxjs';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import { ScriptureHoverPreviewComponent } from '../scripture-hover-preview/scripture-hover-preview.component';
import type { BadgeService } from '../../services/badge.service';
import type { PrayerRequest } from '../../services/prayer.service';
import type { BibleTranslation } from '../../types/memorization';
import { isMemberPrayerId } from '../../lib/prayer-card-kind';
import type { PrayerCardVariantLayout } from '../../lib/prayer-card-layout';

@Component({
  selector: 'app-prayer-card-title-body',
  standalone: true,
  imports: [AsyncPipe, RichTextViewComponent, ScriptureHoverPreviewComponent],
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

  verseTranslationForPreview(): BibleTranslation {
    const translation = this.prayer.verse_translation;
    if (
      translation === 'esv' ||
      translation === 'nasb' ||
      translation === 'lsb' ||
      translation === 'csb' ||
      translation === 'kjv' ||
      translation === 'niv' ||
      translation === 'nlt'
    ) {
      return translation;
    }
    return 'esv';
  }

  onMarkPrayerRead(): void {
    this.markPrayerRead.emit();
  }
}
