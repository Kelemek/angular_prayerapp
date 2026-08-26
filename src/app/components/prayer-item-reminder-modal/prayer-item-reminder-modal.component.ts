import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { PrayerItemReminderService } from '../../services/prayer-item-reminder.service';
import {
  buildReminderTimeOptions,
  nextReminderQuarterSlot,
} from '../../lib/hour-reminders/hour-reminder-format';
import {
  addPrayerItemReminderFromModal,
  removePrayerItemReminderFromModal,
} from '../../lib/prayer-item-reminder-modal-submit';
import {
  buildPrayerItemReminderDateOptions,
  buildPrayerItemReminderDropdownPanelStyle,
  formatPrayerItemReminderLine,
  prayerItemReminderAddErrorMessage,
  prayerItemReminderDateLabel,
  prayerItemReminderDropdownShellClass,
  prayerItemReminderRemoveErrorMessage,
  prayerItemReminderTimeLabel,
  prayerItemReminderWeekdayLabel,
  PRAYER_ITEM_REMINDER_DATE_OPTIONS_DAYS,
  PRAYER_ITEM_REMINDER_WEEKDAYS,
  refreshPrayerItemReminderLocalDate,
  validatePrayerItemReminderAddInput,
} from '../../lib/prayer-item-reminder-modal-ui';
import {
  isInsideCdkVirtualScrollContent,
  portalPrayerCardModalsHostToBody,
  restorePrayerCardModalsHostFromBody,
  type PrayerCardModalsPortalAnchor,
} from '../../lib/prayer-card-modals-portal';
import type {
  PrayerItemReminder,
  PrayerItemReminderKind,
  PrayerItemReminderMode,
} from '../../types/prayer-item-reminder';

@Component({
  selector: 'app-prayer-item-reminder-modal',
  standalone: true,
  imports: [NgClass, NgStyle, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prayer-item-reminder-modal.component.html',
})
export class PrayerItemReminderModalComponent implements OnChanges, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private portalAnchor: PrayerCardModalsPortalAnchor | null = null;

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
  readonly weekdays = PRAYER_ITEM_REMINDER_WEEKDAYS;
  readonly timeOptions = buildReminderTimeOptions();
  dateOptions: { value: string; label: string }[] = buildPrayerItemReminderDateOptions(
    PRAYER_ITEM_REMINDER_DATE_OPTIONS_DAYS
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
  /** Deferred so the opening click does not hit the dismiss layer in the same frame. */
  dropdownDismissLayerReady = false;

  constructor(
    private remindersService: PrayerItemReminderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      this.syncBodyPortal();
    }
    if (changes['isOpen']?.currentValue === true) {
      this.error = null;
      this.closeAllDropdowns();
      this.refreshDateOptions();
      this.selectedTimeValue = nextReminderQuarterSlot().value;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    restorePrayerCardModalsHostFromBody(
      this.host.nativeElement,
      this.portalAnchor
    );
    this.portalAnchor = null;
  }

  private syncBodyPortal(): void {
    const host = this.host.nativeElement;
    const shouldManagePortal =
      this.portalAnchor !== null ||
      isInsideCdkVirtualScrollContent(host);

    if (!shouldManagePortal) {
      return;
    }

    if (this.isOpen) {
      this.portalAnchor = portalPrayerCardModalsHostToBody(
        host,
        this.portalAnchor
      );
      return;
    }

    restorePrayerCardModalsHostFromBody(host, this.portalAnchor);
    this.portalAnchor = null;
  }

  private refreshDateOptions(): void {
    this.dateOptions = buildPrayerItemReminderDateOptions(
      PRAYER_ITEM_REMINDER_DATE_OPTIONS_DAYS
    );
    this.localDate = refreshPrayerItemReminderLocalDate(
      this.dateOptions,
      this.localDate
    );
  }

  get selectedDateLabel(): string {
    return prayerItemReminderDateLabel(this.dateOptions, this.localDate);
  }

  get selectedWeekdayLabel(): string {
    return prayerItemReminderWeekdayLabel(this.localWeekday);
  }

  get selectedTimeLabel(): string {
    return prayerItemReminderTimeLabel(this.selectedTimeValue);
  }

  dropdownShellClass(open: boolean): string {
    return prayerItemReminderDropdownShellClass(open);
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
    this.dropdownDismissLayerReady = false;
    this.cdr.markForCheck();
  }

  private openDropdown(kind: 'date' | 'weekday' | 'time', event: Event): void {
    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLElement)) {
      return;
    }
    this.showDateDropdown = kind === 'date';
    this.showWeekdayDropdown = kind === 'weekday';
    this.showTimeDropdown = kind === 'time';
    this.dropdownPanelStyle = buildPrayerItemReminderDropdownPanelStyle(trigger);
    this.dropdownDismissLayerReady = false;
    this.cdr.markForCheck();
    requestAnimationFrame(() => {
      if (
        !this.showDateDropdown &&
        !this.showWeekdayDropdown &&
        !this.showTimeDropdown
      ) {
        return;
      }
      this.dropdownDismissLayerReady = true;
      this.cdr.markForCheck();
    });
  }

  formatReminder(r: PrayerItemReminder): string {
    return formatPrayerItemReminderLine(r, this.dateOptions);
  }

  async add(): Promise<void> {
    if (!this.email.trim() || !this.prayerId) return;

    const validationError = validatePrayerItemReminderAddInput(
      this.mode,
      this.localDate,
      this.selectedTimeValue
    );
    if (validationError) {
      this.error = validationError;
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.error = null;
    this.closeAllDropdowns();
    this.cdr.markForCheck();
    try {
      const all = await addPrayerItemReminderFromModal(
        this.remindersService,
        {
          email: this.email,
          prayerId: this.prayerId,
          prayerKind: this.prayerKind,
          prayerFor: this.prayerFor,
          titleSnapshot: this.titleSnapshot,
        },
        {
          mode: this.mode,
          localDate: this.localDate,
          localWeekday: this.localWeekday,
          selectedTimeValue: this.selectedTimeValue,
        }
      );
      this.remindersChange.emit(all);
    } catch (err: unknown) {
      this.error = prayerItemReminderAddErrorMessage(err);
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
      const all = await removePrayerItemReminderFromModal(
        this.remindersService,
        this.email,
        id
      );
      this.remindersChange.emit(all);
    } catch (err: unknown) {
      this.error = prayerItemReminderRemoveErrorMessage(err);
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
