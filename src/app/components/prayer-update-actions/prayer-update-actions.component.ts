import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PrayerUpdateRecord } from '../../lib/prayer-update-header';
import { PRAYER_CARD_META_ACTIONS_GAP_CLASSES, PRAYER_CARD_META_HEADER_ICON_BUTTON_BASE_CLASSES, PRAYER_CARD_META_HEADER_ICON_BUTTON_PADDING_CLASSES, PRAYER_CARD_META_HEADER_ICON_SIZE_CLASSES } from '../../lib/prayer-card-layout';

export type PrayerUpdateActionsMode = 'personal' | 'member' | 'readonly';

@Component({
  selector: 'app-prayer-update-actions',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center ' + PRAYER_CARD_META_ACTIONS_GAP_CLASSES,
  },
  template: `
    @if (mode === 'personal') {
    <button
      type="button"
      (click)="edit.emit()"
      aria-label="Edit prayer update"
      title="Edit update"
      [class]="iconButtonBaseClasses + ' text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer ' + iconButtonPaddingClasses"
    >
      <svg [class]="iconSizeClasses" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    </button>
    }
    @if (mode === 'member') {
    <button
      type="button"
      (click)="toggleAnswered.emit()"
      [title]="update.is_answered ? 'Mark as unanswered' : 'Mark as answered'"
      [attr.aria-label]="update.is_answered ? 'Mark as unanswered' : 'Mark as answered'"
      [class]="iconButtonBaseClasses + ' focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md cursor-pointer ' + iconButtonPaddingClasses + ' ' + (update.is_answered ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400')"
    >
      <svg [class]="iconSizeClasses" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
    <button
      type="button"
      (click)="edit.emit()"
      aria-label="Edit member update"
      title="Edit update"
      [class]="iconButtonBaseClasses + ' text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md cursor-pointer ' + iconButtonPaddingClasses"
    >
      <svg [class]="iconSizeClasses" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    </button>
    }
    @if (showDelete) {
    <button
      type="button"
      (click)="delete.emit()"
      aria-label="Delete prayer update"
      title="Delete this update"
      [class]="iconButtonBaseClasses + ' text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md cursor-pointer ' + iconButtonPaddingClasses"
    >
      <svg [class]="iconSizeClasses" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </button>
    }
  `,
})
export class PrayerUpdateActionsComponent {
  readonly iconButtonBaseClasses = PRAYER_CARD_META_HEADER_ICON_BUTTON_BASE_CLASSES;
  readonly iconSizeClasses = PRAYER_CARD_META_HEADER_ICON_SIZE_CLASSES;
  readonly iconButtonPaddingClasses =
    PRAYER_CARD_META_HEADER_ICON_BUTTON_PADDING_CLASSES;

  @Input({ required: true }) update!: PrayerUpdateRecord;
  @Input() mode: PrayerUpdateActionsMode = 'readonly';
  @Input() showDelete = false;

  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() toggleAnswered = new EventEmitter<void>();
}
