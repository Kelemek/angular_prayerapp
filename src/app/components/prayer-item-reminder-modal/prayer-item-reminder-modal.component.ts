import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { PrayerItemReminderService } from '../../services/prayer-item-reminder.service';
import {
  buildReminderTimeOptions,
  deviceIanaTimezone,
  formatTime12,
  nextReminderQuarterSlot,
  parseReminderTimeOptionValue,
} from '../../lib/hour-reminders/hour-reminder-format';
import type {
  PrayerItemReminder,
  PrayerItemReminderKind,
  PrayerItemReminderMode,
} from '../../types/prayer-item-reminder';

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const DATE_OPTIONS_DAYS = 90;

@Component({
  selector: 'app-prayer-item-reminder-modal',
  standalone: true,
  imports: [NgClass, NgStyle, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
      <app-modal-shell
        title="Prayer reminder"
        titleId="prayer-item-reminder-modal-title"
        closeAriaLabel="Close prayer reminder dialog"
        (close)="close.emit()"
      >
        <div class="p-6 space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Remind yourself about
            <span class="font-medium text-gray-800 dark:text-gray-100"
              >Prayer for {{ prayerFor }}</span
            >. Times use your device time zone in 15-minute steps.
          </p>

          @if (reminders.length > 0) {
            <ul class="flex flex-col gap-1.5 sm:gap-2" role="list">
              @for (r of reminders; track r.id) {
                <li
                  class="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all overflow-hidden"
                >
                  <span
                    class="flex-1 p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100"
                    >{{ formatReminder(r) }}</span
                  >
                  <button
                    type="button"
                    (click)="remove(r.id)"
                    [disabled]="saving"
                    class="self-stretch flex items-center justify-center px-3 border-l border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    [attr.aria-label]="'Remove reminder ' + formatReminder(r)"
                  >
                    Remove
                  </button>
                </li>
              }
            </ul>
          }

          <div class="space-y-3 modal-chrome-border-t pt-4">
            <div class="flex flex-wrap gap-1.5 sm:gap-2" role="group" aria-label="Reminder type">
              @for (m of modes; track m.value) {
                <button
                  type="button"
                  (click)="setMode(m.value)"
                  class="px-3 py-1.5 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all cursor-pointer"
                  [ngClass]="
                    mode === m.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-gray-800 dark:text-gray-100'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  "
                >
                  {{ m.label }}
                </button>
              }
            </div>

            @if (mode === 'once') {
              <div class="relative min-w-0">
                <div
                  [ngClass]="dropdownShellClass(showDateDropdown)"
                  class="flex w-full min-w-0 rounded-lg border-2 transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    (click)="toggleDateDropdown($event)"
                    [disabled]="saving"
                    [attr.aria-expanded]="showDateDropdown"
                    aria-haspopup="listbox"
                    aria-label="Reminder date"
                    class="w-full flex items-center justify-between gap-2 p-2 sm:p-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">{{
                      selectedDateLabel
                    }}</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="text-gray-600 dark:text-gray-400 transition-transform shrink-0"
                      [class.rotate-180]="showDateDropdown"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            }

            @if (mode === 'weekly') {
              <div class="relative min-w-0">
                <div
                  [ngClass]="dropdownShellClass(showWeekdayDropdown)"
                  class="flex w-full min-w-0 rounded-lg border-2 transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    (click)="toggleWeekdayDropdown($event)"
                    [disabled]="saving"
                    [attr.aria-expanded]="showWeekdayDropdown"
                    aria-haspopup="listbox"
                    aria-label="Reminder weekday"
                    class="w-full flex items-center justify-between gap-2 p-2 sm:p-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">{{
                      selectedWeekdayLabel
                    }}</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="text-gray-600 dark:text-gray-400 transition-transform shrink-0"
                      [class.rotate-180]="showWeekdayDropdown"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            }

            <div class="grid grid-cols-2 gap-1.5 sm:gap-2">
              <div class="relative min-w-0">
                <div
                  [ngClass]="dropdownShellClass(showTimeDropdown)"
                  class="flex w-full min-w-0 rounded-lg border-2 transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    (click)="toggleTimeDropdown($event)"
                    [disabled]="saving"
                    [attr.aria-expanded]="showTimeDropdown"
                    aria-haspopup="listbox"
                    aria-label="Reminder time"
                    class="w-full flex items-center justify-between gap-2 p-2 sm:p-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">{{
                      selectedTimeLabel
                    }}</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="text-gray-600 dark:text-gray-400 transition-transform shrink-0"
                      [class.rotate-180]="showTimeDropdown"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="button"
                (click)="add()"
                [disabled]="saving || !email.trim()"
                title="Add a reminder for the selected options"
                class="w-full min-w-0 flex flex-row items-center justify-center gap-2 p-2 sm:p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (!saving) {
                  <svg
                    width="18"
                    height="18"
                    class="text-gray-600 dark:text-gray-400 sm:w-5 sm:h-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                } @else {
                  <svg
                    width="18"
                    height="18"
                    class="text-gray-600 dark:text-gray-400 sm:w-5 sm:h-5 animate-spin shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                      opacity="0.25"
                    ></circle>
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      opacity="0.75"
                    ></path>
                  </svg>
                }
                <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">{{
                  saving ? 'Saving…' : 'Add reminder'
                }}</span>
              </button>
            </div>
          </div>

          @if (error) {
            <div
              class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-2"
              role="alert"
            >
              <p class="text-xs sm:text-sm text-red-800 dark:text-red-200">{{ error }}</p>
            </div>
          }
        </div>
      </app-modal-shell>

      @if (showDateDropdown || showWeekdayDropdown || showTimeDropdown) {
        <div class="fixed inset-0 z-[60]" (click)="closeAllDropdowns()"></div>
      }
      @if (showDateDropdown) {
        <div
          role="listbox"
          aria-label="Reminder date"
          class="fixed z-[70] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-y-auto"
          [ngStyle]="dropdownPanelStyle"
        >
          @for (opt of dateOptions; track opt.value) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="localDate === opt.value"
              (click)="setLocalDate(opt.value)"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>{{ opt.label }}</span>
              @if (localDate === opt.value) {
                <span class="text-blue-600 dark:text-blue-400">✓</span>
              }
            </button>
          }
        </div>
      }
      @if (showWeekdayDropdown) {
        <div
          role="listbox"
          aria-label="Reminder weekday"
          class="fixed z-[70] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-y-auto"
          [ngStyle]="dropdownPanelStyle"
        >
          @for (d of weekdays; track d.value) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="localWeekday === d.value"
              (click)="setLocalWeekday(d.value)"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>{{ d.label }}</span>
              @if (localWeekday === d.value) {
                <span class="text-blue-600 dark:text-blue-400">✓</span>
              }
            </button>
          }
        </div>
      }
      @if (showTimeDropdown) {
        <div
          role="listbox"
          aria-label="Reminder time"
          class="fixed z-[70] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 overflow-y-auto"
          [ngStyle]="dropdownPanelStyle"
        >
          @for (opt of timeOptions; track opt.value) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="selectedTimeValue === opt.value"
              (click)="setSelectedTime(opt.value)"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>{{ opt.label }}</span>
              @if (selectedTimeValue === opt.value) {
                <span class="text-blue-600 dark:text-blue-400">✓</span>
              }
            </button>
          }
        </div>
      }
    }
  `,
})
export class PrayerItemReminderModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() email = '';
  @Input() prayerId = '';
  @Input() prayerKind: PrayerItemReminderKind = 'community';
  @Input() prayerFor = '';
  @Input() titleSnapshot = '';
  @Input() reminders: PrayerItemReminder[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() remindersChange = new EventEmitter<PrayerItemReminder[]>();

  readonly modes: { value: PrayerItemReminderMode; label: string }[] = [
    { value: 'once', label: 'Once' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
  ];
  readonly weekdays = WEEKDAYS;
  readonly timeOptions = buildReminderTimeOptions();
  dateOptions: { value: string; label: string }[] = buildUpcomingDateOptions(
    DATE_OPTIONS_DAYS
  );

  mode: PrayerItemReminderMode = 'once';
  localDate = '';
  localWeekday = new Date().getDay();
  selectedTimeValue = nextReminderQuarterSlot().value;
  saving = false;
  error: string | null = null;
  showDateDropdown = false;
  showWeekdayDropdown = false;
  showTimeDropdown = false;
  dropdownPanelStyle: Record<string, string> = {};

  constructor(
    private remindersService: PrayerItemReminderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.error = null;
      this.closeAllDropdowns();
      this.refreshDateOptions();
      this.selectedTimeValue = nextReminderQuarterSlot().value;
      this.cdr.markForCheck();
    }
  }

  private refreshDateOptions(): void {
    this.dateOptions = buildUpcomingDateOptions(DATE_OPTIONS_DAYS);
    const today = this.todayLocalDateString();
    if (!this.localDate || !this.dateOptions.some((o) => o.value === this.localDate)) {
      this.localDate = today;
    }
  }

  get selectedDateLabel(): string {
    const found = this.dateOptions.find((o) => o.value === this.localDate)?.label;
    return found ?? (this.localDate || 'Choose a date');
  }

  get selectedWeekdayLabel(): string {
    return (
      WEEKDAYS.find((d) => d.value === this.localWeekday)?.label ?? 'Choose a day'
    );
  }

  get selectedTimeLabel(): string {
    const parsed = parseReminderTimeOptionValue(this.selectedTimeValue);
    if (!parsed) return 'Choose a time';
    return formatTime12(parsed.hour, parsed.minute);
  }

  dropdownShellClass(open: boolean): string {
    return open
      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30'
      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20';
  }

  setMode(mode: PrayerItemReminderMode): void {
    this.mode = mode;
    this.closeAllDropdowns();
    this.cdr.markForCheck();
  }

  toggleDateDropdown(event: Event): void {
    if (this.showDateDropdown) {
      this.closeAllDropdowns();
      return;
    }
    this.openDropdown('date', event);
  }

  toggleWeekdayDropdown(event: Event): void {
    if (this.showWeekdayDropdown) {
      this.closeAllDropdowns();
      return;
    }
    this.openDropdown('weekday', event);
  }

  toggleTimeDropdown(event: Event): void {
    if (this.showTimeDropdown) {
      this.closeAllDropdowns();
      return;
    }
    this.openDropdown('time', event);
  }

  setLocalDate(value: string): void {
    this.localDate = value;
    this.closeAllDropdowns();
    this.cdr.markForCheck();
  }

  setLocalWeekday(value: number): void {
    this.localWeekday = value;
    this.closeAllDropdowns();
    this.cdr.markForCheck();
  }

  setSelectedTime(value: string): void {
    this.selectedTimeValue = value;
    this.closeAllDropdowns();
    this.cdr.markForCheck();
  }

  closeAllDropdowns(): void {
    this.showDateDropdown = false;
    this.showWeekdayDropdown = false;
    this.showTimeDropdown = false;
    this.dropdownPanelStyle = {};
    this.cdr.markForCheck();
  }

  private openDropdown(
    kind: 'date' | 'weekday' | 'time',
    event: Event
  ): void {
    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLElement)) {
      return;
    }
    this.showDateDropdown = kind === 'date';
    this.showWeekdayDropdown = kind === 'weekday';
    this.showTimeDropdown = kind === 'time';
    this.dropdownPanelStyle = buildFixedDropdownPanelStyle(trigger);
    this.cdr.markForCheck();
  }

  formatReminder(r: PrayerItemReminder): string {
    const time = formatTime12(r.local_hour, r.local_minute ?? 0);
    if (r.mode === 'once') {
      const dateLabel =
        this.dateOptions.find((o) => o.value === r.local_date)?.label ??
        r.local_date ??
        '';
      return `Once · ${dateLabel} · ${time}`;
    }
    if (r.mode === 'daily') {
      return `Daily · ${time}`;
    }
    const day =
      WEEKDAYS.find((d) => d.value === r.local_weekday)?.label ?? 'Weekly';
    return `Weekly · ${day} · ${time}`;
  }

  async add(): Promise<void> {
    if (!this.email.trim() || !this.prayerId) return;
    const parsed = parseReminderTimeOptionValue(this.selectedTimeValue);
    if (!parsed) {
      this.error = 'Choose a valid reminder time.';
      this.cdr.markForCheck();
      return;
    }
    if (this.mode === 'once') {
      if (!this.localDate) {
        this.error = 'Choose a date for a one-time reminder.';
        this.cdr.markForCheck();
        return;
      }
      if (this.isOnceInPast(this.localDate, parsed.hour, parsed.minute)) {
        this.error = 'That date and time is already in the past.';
        this.cdr.markForCheck();
        return;
      }
    }

    this.saving = true;
    this.error = null;
    this.closeAllDropdowns();
    this.cdr.markForCheck();
    try {
      const all = await this.remindersService.addReminder(this.email.trim(), {
        prayer_kind: this.prayerKind,
        prayer_id: this.prayerId,
        title_snapshot: this.titleSnapshot || `Prayer for ${this.prayerFor}`,
        prayer_for_snapshot: this.prayerFor,
        mode: this.mode,
        iana_timezone: deviceIanaTimezone(),
        local_hour: parsed.hour,
        local_minute: parsed.minute,
        local_date: this.mode === 'once' ? this.localDate : null,
        local_weekday: this.mode === 'weekly' ? this.localWeekday : null,
      });
      this.remindersChange.emit(all);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === '23505') {
        this.error = 'You already have a reminder for that schedule.';
      } else {
        this.error =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : 'Could not save reminder.';
      }
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  async remove(id: string): Promise<void> {
    if (!this.email.trim()) return;
    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();
    try {
      const all = await this.remindersService.removeReminder(this.email.trim(), id);
      this.remindersChange.emit(all);
    } catch (err: unknown) {
      this.error =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Could not remove reminder.';
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  private todayLocalDateString(): string {
    return formatLocalDateValue(new Date());
  }

  private isOnceInPast(date: string, hour: number, minute: number): boolean {
    const [y, mo, d] = date.split('-').map(Number);
    if (!y || !mo || !d) return true;
    const target = new Date(y, mo - 1, d, hour, minute, 0, 0);
    return target.getTime() <= Date.now();
  }
}

function buildFixedDropdownPanelStyle(
  trigger: HTMLElement
): Record<string, string> {
  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const maxHeight = 240;
  const viewportPad = 8;
  const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
  const spaceAbove = rect.top - gap - viewportPad;
  const openUp = spaceBelow < Math.min(maxHeight, 160) && spaceAbove > spaceBelow;
  const available = Math.max(120, openUp ? spaceAbove : spaceBelow);
  const height = Math.min(maxHeight, available);
  const top = openUp
    ? Math.max(viewportPad, rect.top - gap - height)
    : rect.bottom + gap;

  return {
    top: `${top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${height}px`,
  };
}

function formatLocalDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildUpcomingDateOptions(
  days: number
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = formatLocalDateValue(d);
    const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
    const monthDay = d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const label =
      i === 0
        ? `Today · ${monthDay}`
        : i === 1
          ? `Tomorrow · ${monthDay}`
          : `${weekday}, ${monthDay}`;
    options.push({ value, label });
  }
  return options;
}
