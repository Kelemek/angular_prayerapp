import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  PRAYER_CARD_ACTION_ROW_MOBILE_LOCK_CLASS,
  type PrayerCardVariantLayout,
} from '../../lib/prayer-card-layout';
import type { PrayerJournalKind } from '../../lib/prayer-journal-note';
import { PrayerJournalService } from '../../services/prayer-journal.service';
@Component({
  selector: 'app-prayer-card-actions-row',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prayer-card-actions-row.component.html',
})
export class PrayerCardActionsRowComponent {
  private readonly journalNotes = inject(PrayerJournalService);
  readonly actionRowMobileLockClass = PRAYER_CARD_ACTION_ROW_MOBILE_LOCK_CLASS;

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
  @Input() showAddUpdate = true;
  @Input() showPrayForButton = true;
  @Input() showPrayingCount = true;
  @Input() prayerEncouragementEnabled = true;
  @Input() cooldownHours = 4;
  @Input({ required: true }) journalKind!: PrayerJournalKind;
  @Input({ required: true }) journalPrayerId!: string;

  @Output() addUpdate = new EventEmitter<void>();
  @Output() prayFor = new EventEmitter<void>();
  @Output() openJournal = new EventEmitter<void>();

  get hasJournalNote(): boolean {
    return this.journalNotes.hasNote(this.journalKind, this.journalPrayerId);
  }
}
