import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-prayer-item-reminder-bell-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="reminder.emit()"
      [attr.aria-label]="ariaLabel"
      [attr.title]="title"
      class="inline-flex items-center justify-center p-1.5 sm:p-1 rounded-md text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      @if (hasReminder) {
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
        width="16"
        height="16"
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
  @Input() hasReminder = false;
  /** `prayer` uses prayer-card copy; `prompt` uses shorter prompt-card copy. */
  @Input() itemLabel: 'prayer' | 'prompt' = 'prayer';

  @Output() reminder = new EventEmitter<void>();

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
