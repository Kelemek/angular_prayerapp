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
  PRAYER_CARD_HEADER_INSET_CLASSES,
  PRAYER_CARD_META_ACTIONS_GAP_CLASSES,
} from '../../lib/prayer-card-layout';

@Component({
  selector: 'app-prayer-card-meta-header',
  standalone: true,
  imports: [CommonModule, CardMetaHeaderBandComponent, PersonalCategoryPillComponent, PrayerItemReminderBellButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card-meta-header-band
      [centerDate]="metaHeaderDate"
      [centerTime]="metaHeaderTime"
      [centerDragHandle]="centerDragHandle"
      [centerDragHandleId]="centerDragHandleId"
    >
      <div cardMetaLeft class="w-full min-w-0">
        @if (isPersonal) {
          @if (category) {
          <app-personal-category-pill
            variant="header"
            [category]="category"
            (pickerOpenChange)="pickerOpenChange.emit($event)"
          />
          }
        } @else if (showStatus) {
        <span
          [class]="'block min-w-0 max-w-full truncate text-sm font-bold ' + headerInsetClasses + ' ' + statusTextClasses"
        >
          {{ statusLabel }}
        </span>
        }
      </div>
      <div cardMetaRight [class]="'flex items-center ' + actionsGapClasses">
        @if (showReminder) {
        <app-prayer-item-reminder-bell-button
          [hasReminder]="hasReminder"
          (reminder)="reminder.emit()"
        />
        }
        @if (isPersonal) {
        <button
          type="button"
          (click)="share.emit()"
          aria-label="Share personal prayer"
          title="Share prayer to public"
          class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1.5 sm:p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        </button>
        <button
          type="button"
          (click)="edit.emit()"
          [attr.id]="personalEditTourId"
          aria-label="Edit personal prayer"
          title="Edit prayer"
          class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1.5 sm:p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
          class="inline-flex items-center justify-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1.5 sm:p-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
  readonly headerInsetClasses = PRAYER_CARD_HEADER_INSET_CLASSES;
  readonly actionsGapClasses = PRAYER_CARD_META_ACTIONS_GAP_CLASSES;

  @Input({ required: true }) prayerCreatedAt!: string;
  @Input() isPersonal = false;
  @Input() category: string | null = null;
  @Input() status = 'current';
  @Input() showStatus = false;
  @Input() showDelete = false;
  @Input() showReminder = false;
  @Input() hasReminder = false;
  @Input() personalEditTourId: string | null = null;
  @Input() personalDeleteTourId: string | null = null;
  @Input() centerDragHandle = false;
  @Input() centerDragHandleId: string | null = null;

  @Output() share = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() reminder = new EventEmitter<void>();
  @Output() pickerOpenChange = new EventEmitter<boolean>();

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
}
