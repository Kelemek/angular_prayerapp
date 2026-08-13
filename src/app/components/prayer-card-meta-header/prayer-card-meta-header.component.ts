import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardMetaHeaderBandComponent } from '../card-meta-header-band/card-meta-header-band.component';
import { PersonalCategoryPillComponent } from '../personal-category-color-picker/personal-category-pill.component';
import { PrayerItemReminderBellButtonComponent } from '../prayer-item-reminder-bell-button/prayer-item-reminder-bell-button.component';
import {
  getPrayerStatusHeaderTextClasses,
  getPrayerStatusLabel,
} from '../../lib/prayer-status-header';
import { formatPrayerCardShortDateParts } from '../../lib/prayer-update-header';
import {
  PRAYER_CARD_HEADER_BLEED_CLASSES,
  PRAYER_CARD_HEADER_INSET_CLASSES,
  PRAYER_CARD_META_HEADER_ICON_BUTTON_BASE_CLASSES,
  getMetaHeaderBandLayoutClasses,
  type MetaHeaderBandSize,
} from '../../lib/prayer-card-layout';

@Component({
  selector: 'app-prayer-card-meta-header',
  standalone: true,
  imports: [CommonModule, CardMetaHeaderBandComponent, PersonalCategoryPillComponent, PrayerItemReminderBellButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card-meta-header-band
      [layout]="showCenterDateTime ? 'three-column' : 'two-column'"
      [bandSize]="bandSize"
      [bleedClasses]="bleedClasses"
      [actionsInsetClasses]="actionsInsetClasses"
      [centerDate]="showCenterDateTime ? metaHeaderDate : null"
      [centerTime]="showCenterDateTime ? metaHeaderTime : null"
      [centerDragHandle]="centerDragHandle"
      [centerDragHandleId]="centerDragHandleId"
      [compactActionsInset]="isPersonal"
    >
      <div cardMetaLeft class="w-full min-w-0">
        @if (isPersonal) {
          @if (category) {
          <app-personal-category-pill
            variant="header"
            [bandSize]="bandSize"
            [category]="category"
            (pickerOpenChange)="pickerOpenChange.emit($event)"
          />
          }
        } @else if (showStatus) {
        <span
          [class]="'block min-w-0 max-w-full truncate font-bold ' + layoutClasses.textSmClasses + ' ' + headerInsetClasses + ' ' + statusTextClasses"
        >
          {{ statusLabel }}
        </span>
        } @else if (isMember) {
        <span
          [class]="'block min-w-0 max-w-full truncate font-bold ' + layoutClasses.textSmClasses + ' ' + headerInsetClasses + ' ' + memberHeaderTextClasses"
        >
          Member
        </span>
        }
      </div>
      <div cardMetaRight [class]="'flex items-center ' + actionsGapClasses">
        @if (showReminder) {
        <app-prayer-item-reminder-bell-button
          [hasReminder]="hasReminder"
          [bandSize]="bandSize"
          [tourAnchorId]="reminderBellTourId"
          (reminder)="reminder.emit()"
        />
        }
        @if (isPersonal) {
        <button
          type="button"
          (click)="toggleAnswered.emit()"
          [attr.id]="personalAnsweredTourId"
          [title]="isAnswered ? 'Mark as unanswered' : 'Mark as answered'"
          [attr.aria-label]="isAnswered ? 'Mark as unanswered' : 'Mark as answered'"
          [class]="iconButtonBaseClasses + ' focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md cursor-pointer ' + layoutClasses.iconButtonPaddingClasses + ' ' + (isAnswered ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400')"
        >
          <svg [class]="layoutClasses.iconSizeClasses" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button
          type="button"
          (click)="edit.emit()"
          [attr.id]="personalEditTourId"
          aria-label="Edit personal prayer"
          title="Edit prayer"
          [class]="iconButtonBaseClasses + ' text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer ' + layoutClasses.iconButtonPaddingClasses"
        >
          <svg [class]="layoutClasses.iconSizeClasses" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        }
        @if (showDelete) {
        <button
          type="button"
          (click)="delete.emit()"
          [attr.id]="personalDeleteTourId"
          aria-label="Delete prayer request"
          title="Delete prayer request"
          [class]="iconButtonBaseClasses + ' text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md cursor-pointer ' + layoutClasses.iconButtonPaddingClasses"
        >
          <svg [class]="layoutClasses.iconSizeClasses" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
        }
      </div>
    </app-card-meta-header-band>
  `,
})
export class PrayerCardMetaHeaderComponent {
  readonly iconButtonBaseClasses = PRAYER_CARD_META_HEADER_ICON_BUTTON_BASE_CLASSES;
  /** Matches Planning Center member card border (`#0047AB`). */
  readonly memberHeaderTextClasses = 'text-[#0047AB] dark:text-[#4A90E2]';

  /** Override when the card shell uses non-standard horizontal padding (e.g. presentation p-8). */
  @Input() bleedClasses = PRAYER_CARD_HEADER_BLEED_CLASSES;
  @Input() headerInsetClasses = PRAYER_CARD_HEADER_INSET_CLASSES;
  @Input() actionsInsetClasses: string | null = null;
  @Input() bandSize: MetaHeaderBandSize = 'sm';

  @Input({ required: true }) prayerCreatedAt!: string;
  @Input() isPersonal = false;
  @Input() isMember = false;
  @Input() category: string | null = null;
  @Input() status = 'current';
  @Input() showStatus = false;
  /** When false, header band is two-column (actions only) — e.g. Planning Center member cards. */
  @Input() showCenterDateTime = true;
  @Input() showDelete = false;
  @Input() showReminder = false;
  @Input() hasReminder = false;
  @Input() reminderBellTourId: string | null = null;
  @Input() personalEditTourId: string | null = null;
  @Input() personalAnsweredTourId: string | null = null;
  @Input() personalDeleteTourId: string | null = null;
  @Input() centerDragHandle = false;
  @Input() centerDragHandleId: string | null = null;

  @Output() toggleAnswered = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() reminder = new EventEmitter<void>();
  @Output() pickerOpenChange = new EventEmitter<boolean>();

  get isAnswered(): boolean {
    return this.category === 'Answered';
  }

  get metaHeaderDate(): string {
    return formatPrayerCardShortDateParts(this.prayerCreatedAt).date;
  }

  get metaHeaderTime(): string {
    return formatPrayerCardShortDateParts(this.prayerCreatedAt).time;
  }

  get statusLabel(): string {
    return getPrayerStatusLabel(this.status);
  }

  get statusTextClasses(): string {
    return getPrayerStatusHeaderTextClasses(this.status);
  }

  get layoutClasses() {
    return getMetaHeaderBandLayoutClasses(this.bandSize);
  }

  get actionsGapClasses(): string {
    if (this.isPersonal) {
      return this.layoutClasses.actionsGapCompactClasses;
    }
    return this.layoutClasses.actionsGapClasses;
  }
}
