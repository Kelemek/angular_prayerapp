import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { UserHourReminderService } from '../../services/user-hour-reminder.service';
import { UserSessionService } from '../../services/user-session.service';
import type { UserHourReminderKind, UserHourReminderSlot } from '../../types/user-hour-reminder';
import {
  buildReminderTimeOptions,
  deviceIanaTimezone,
  formatTime12,
  formatHourReminderSlotLabel,
  nextReminderQuarterSlot,
  parseReminderTimeOptionValue,
  reminderTimeOptionValue,
} from '../../lib/hour-reminders/hour-reminder-format';

const LOAD_ERROR: Record<UserHourReminderKind, string> = {
  prayer: 'Failed to load prayer reminders',
  memorization: 'Failed to load memorization reminders',
};

@Component({
  selector: 'app-hour-reminder-settings-section',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      [id]="tourSectionId"
      class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 space-y-2"
    >
      <div class="font-medium text-gray-800 dark:text-gray-100 text-sm sm:text-base">
        {{ title }}
      </div>
      <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{{ description }}</p>

      @if (loading) {
        <div
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
          role="status"
        >
          <svg
            class="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading reminders…
        </div>
      } @else if (slots.length === 0) {
        <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          No reminder times saved yet.
        </p>
      } @else {
        <ul class="flex flex-col gap-1.5 sm:gap-2" role="list">
          @for (slot of slots; track slot.id) {
            <li
              class="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all overflow-hidden"
            >
              <span
                class="flex-1 p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100"
                >{{ formatSlotLabel(slot) }}</span
              >
              <button
                type="button"
                (click)="removeSlot(slot.id)"
                [disabled]="saving"
                class="self-stretch flex items-center justify-center px-3 border-l border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                [attr.aria-label]="'Remove reminder ' + formatSlotLabel(slot)"
              >
                Remove
              </button>
            </li>
          }
        </ul>
      }

      <div [id]="tourControlsId" class="grid grid-cols-2 gap-1.5 sm:gap-2">
        <div class="relative min-w-0">
          <div
            [ngClass]="{
              'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30':
                showTimeDropdown,
              'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20':
                !showTimeDropdown
            }"
            class="flex w-full min-w-0 rounded-lg border-2 transition-all overflow-hidden"
          >
            <button
              type="button"
              [id]="hourSelectId"
              (click)="showTimeDropdown = !showTimeDropdown"
              [disabled]="saving"
              [attr.aria-expanded]="showTimeDropdown"
              aria-haspopup="listbox"
              [attr.aria-label]="hourSelectLabel"
              [title]="hourSelectLabel"
              class="w-full flex items-center justify-between gap-2 p-2 sm:p-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">{{
                formatTime12(selectedHour, selectedMinute)
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

          @if (showTimeDropdown) {
            <div>
              <div class="fixed inset-0 z-10" (click)="showTimeDropdown = false"></div>
              <div
                role="listbox"
                [attr.aria-label]="hourSelectLabel"
                class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 max-h-60 overflow-y-auto"
              >
                @for (opt of timeOptions; track opt.value) {
                  <button
                    type="button"
                    role="option"
                    [attr.aria-selected]="selectedTimeValue === opt.value"
                    (click)="setSelectedTime(opt.value)"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer"
                    [title]="'Set reminder time to ' + opt.label"
                  >
                    <span>{{ opt.label }}</span>
                    @if (selectedTimeValue === opt.value) {
                      <span class="text-blue-600 dark:text-blue-400">✓</span>
                    }
                  </button>
                }
              </div>
            </div>
          }
        </div>
        <button
          type="button"
          (click)="addSlot()"
          [disabled]="saving || !email.trim()"
          [title]="addButtonTitle"
          class="w-full min-w-0 flex flex-row items-center justify-center gap-2 p-2 sm:p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          @if (saving) {
            <svg
              class="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          }
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
          <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">{{
            saving ? 'Saving…' : 'Add reminder'
          }}</span>
        </button>
      </div>

      @if (error) {
        <div
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-2"
          role="alert"
        >
          <p class="text-xs sm:text-sm text-red-800 dark:text-red-200">{{ error }}</p>
        </div>
      }
      @if (success) {
        <div
          class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-2"
          role="status"
          aria-live="polite"
        >
          <p class="text-xs sm:text-sm text-green-800 dark:text-green-200">{{ success }}</p>
        </div>
      }
    </div>
  `,
})
export class HourReminderSettingsSectionComponent implements OnChanges {
  @Input({ required: true }) kind!: UserHourReminderKind;
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input({ required: true }) email = '';
  @Input() isOpen = false;
  @Input() tourSectionId = '';
  @Input() tourControlsId = '';
  @Input() hourSelectId = '';
  @Input() hourSelectLabel = 'Reminder time';
  @Input() addButtonTitle = 'Add a reminder for the selected time';

  readonly timeOptions = buildReminderTimeOptions();
  readonly formatTime12 = formatTime12;

  slots: UserHourReminderSlot[] = [];
  loading = false;
  saving = false;
  error: string | null = null;
  success: string | null = null;
  selectedHour = 9;
  selectedMinute = 0;
  showTimeDropdown = false;

  get selectedTimeValue(): string {
    return reminderTimeOptionValue(this.selectedHour, this.selectedMinute);
  }

  constructor(
    private reminders: UserHourReminderService,
    private userSession: UserSessionService,
    private cdr: ChangeDetectorRef
  ) {
    const next = nextReminderQuarterSlot();
    this.selectedHour = next.hour;
    this.selectedMinute = next.minute;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true || changes['email']) {
      if (this.isOpen) {
        this.reload();
      }
    }
  }

  formatSlotLabel(slot: UserHourReminderSlot): string {
    return formatHourReminderSlotLabel(slot);
  }

  setSelectedTime(value: string): void {
    const parsed = parseReminderTimeOptionValue(value);
    if (!parsed) return;
    this.selectedHour = parsed.hour;
    this.selectedMinute = parsed.minute;
    this.showTimeDropdown = false;
    this.cdr.markForCheck();
  }

  reload(): void {
    this.error = null;
    const modalEmail = this.email?.trim() ?? '';
    const session = this.userSession.getCurrentSession();
    const sessionEmail = session?.email?.trim() ?? '';
    const { slotsKey } = this.reminders.sessionCacheKeys(this.kind);
    const sessionCacheMatchesModal =
      sessionEmail === modalEmail && session?.[slotsKey] !== undefined;

    if (!modalEmail) {
      this.slots = [];
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    if (sessionCacheMatchesModal) {
      this.slots = [...session![slotsKey]!];
    } else {
      this.slots = [];
    }

    const needsBlockingLoad = !sessionCacheMatchesModal;
    this.loading = needsBlockingLoad;
    this.cdr.markForCheck();

    this.reminders
      .ensureLoaded(this.kind, true)
      .then((loaded) => {
        if ((this.email?.trim() ?? '') !== modalEmail) {
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        const currentSessionEmail =
          this.userSession.getCurrentSession()?.email?.trim() ?? '';
        if (currentSessionEmail !== modalEmail) {
          this.slots = [];
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.slots = [...loaded];
        this.loading = false;
        this.cdr.markForCheck();
      })
      .catch((err: unknown) => {
        console.error(`${this.kind} reminders load failed:`, err);
        this.error =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : LOAD_ERROR[this.kind];
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  async addSlot(): Promise<void> {
    if (!this.email?.trim()) {
      return;
    }
    this.saving = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
    try {
      const loaded = await this.reminders.addSlot(
        this.kind,
        this.email.trim(),
        deviceIanaTimezone(),
        this.selectedHour,
        this.selectedMinute
      );
      this.slots = [...loaded];
      this.success = '✅ Reminder saved.';
      setTimeout(() => {
        this.success = null;
        this.cdr.markForCheck();
      }, 2500);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: string }).code)
          : '';
      if (code === '23505') {
        this.error = 'You already have a reminder for that time and time zone.';
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

  async removeSlot(id: string): Promise<void> {
    if (!this.email?.trim()) {
      return;
    }
    this.saving = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
    try {
      const loaded = await this.reminders.removeSlot(this.kind, this.email.trim(), id);
      this.slots = [...loaded];
      this.success = '✅ Reminder removed.';
      setTimeout(() => {
        this.success = null;
        this.cdr.markForCheck();
      }, 2500);
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
}
