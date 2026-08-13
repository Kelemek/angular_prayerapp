import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  PRAYER_CARD_META_HEADER_ICON_BUTTON_BASE_CLASSES,
  getMetaHeaderBandLayoutClasses,
  type MetaHeaderBandSize,
} from '../../lib/prayer-card-layout';

@Component({
  selector: 'app-prayer-item-reminder-bell-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'contents',
  },
  template: `
    <button
      type="button"
      (click)="reminder.emit()"
      [attr.id]="tourAnchorId"
      [attr.aria-label]="ariaLabel"
      [attr.title]="title"
      [class]="
        iconButtonBaseClasses +
        ' text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer ' +
        layoutClasses.iconButtonPaddingClasses
      "
    >
      @if (hasReminder) {
      <svg [class]="layoutClasses.iconSizeClasses" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path
          d="M13.73 21a2 2 0 0 1-3.46 0"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      } @else {
      <svg
        [class]="layoutClasses.iconSizeClasses"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      }
    </button>
  `,
})
export class PrayerItemReminderBellButtonComponent {
  readonly iconButtonBaseClasses = PRAYER_CARD_META_HEADER_ICON_BUTTON_BASE_CLASSES;

  @Input() hasReminder = false;
  @Input() bandSize: MetaHeaderBandSize = 'sm';
  /** `prayer` uses prayer-card copy; `prompt` uses shorter prompt-card copy. */
  @Input() itemLabel: 'prayer' | 'prompt' = 'prayer';
  /** Optional stable id for driver.js help tours. */
  @Input() tourAnchorId: string | null = null;

  @Output() reminder = new EventEmitter<void>();

  get layoutClasses() {
    return getMetaHeaderBandLayoutClasses(this.bandSize);
  }

  get ariaLabel(): string {
    if (this.itemLabel === 'prompt') {
      return this.hasReminder ? 'Edit reminder' : 'Set reminder';
    }
    return this.hasReminder ? 'Manage prayer reminders' : 'Add prayer reminder';
  }

  get title(): string {
    return this.ariaLabel;
  }
}
