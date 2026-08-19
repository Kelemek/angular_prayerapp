import { Component, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { PrayerService, PrayerRequest } from '../../services/prayer.service';
import { SupabaseService } from '../../services/supabase.service';
import {
  canGoNextPrayerArchiveTimelineMonth,
  canGoPreviousPrayerArchiveTimelineMonth,
  formatPrayerArchiveTimelineDayLabel,
  prayerArchiveTimelineLocalDateAtMidnight,
  prayerArchiveTimelineLocalDateString,
  prayerArchiveTimelineMonthDisplay,
  prayerArchiveTimelineMonthKey,
  prayerArchiveTimelineNextDailyRunAfterUtc,
} from '../../lib/prayer-archive-timeline-calendar';
import {
  buildPrayerArchiveTimelineEvents,
  computePrayerArchiveTimelineMonthBounds,
  filterPrayerArchiveTimelineEventsForMonth,
  groupPrayerArchiveTimelineEventsByDay,
} from '../../lib/prayer-archive-timeline-events';
import {
  prayerArchiveTimelineEventBorderClass,
  prayerArchiveTimelineEventDotClass,
  prayerArchiveTimelineEventLabelClass,
  prayerArchiveTimelineMonthNavButtonClass,
} from '../../lib/prayer-archive-timeline-ui';
import type {
  PrayerArchiveTimelineDay,
  PrayerArchiveTimelineEvent,
  PrayerArchiveTimelineEventType,
} from '../../lib/prayer-archive-timeline-types';
import {
  PRAYER_ARCHIVE_TIMELINE_DEFAULT_DAYS_BEFORE_ARCHIVE as DEFAULT_DAYS_BEFORE_ARCHIVE,
  PRAYER_ARCHIVE_TIMELINE_DEFAULT_REMINDER_INTERVAL_DAYS as DEFAULT_REMINDER_INTERVAL_DAYS,
  PRAYER_ARCHIVE_TIMELINE_REMINDER_JOB_HOUR_UTC as REMINDER_JOB_HOUR_UTC,
  PRAYER_ARCHIVE_TIMELINE_REMINDER_JOB_MINUTE_UTC as REMINDER_JOB_MINUTE_UTC,
} from '../../lib/prayer-archive-timeline-types';

@Component({
  selector: 'app-prayer-archive-timeline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prayer-archive-timeline.component.html',
  styleUrl: './prayer-archive-timeline.component.css',
})
export class PrayerArchiveTimelineComponent {
  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  reminderIntervalDays = DEFAULT_REMINDER_INTERVAL_DAYS;
  daysBeforeArchive = DEFAULT_DAYS_BEFORE_ARCHIVE;
  private readonly reminderJobHourUtc = REMINDER_JOB_HOUR_UTC;
  private readonly reminderJobMinuteUtc = REMINDER_JOB_MINUTE_UTC;

  timelineEvents: PrayerArchiveTimelineDay[] = [];

  userTimezone: string;

  currentMonth: Date;
  private allPrayers: PrayerRequest[] = [];
  private allEvents: PrayerArchiveTimelineEvent[] = [];
  private minMonth: Date | null = null;
  private maxMonth: Date | null = null;

  constructor(
    private prayerService: PrayerService,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef
  ) {
    this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const now = new Date();
    this.currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  get monthKey(): string {
    return prayerArchiveTimelineMonthKey(this.currentMonth);
  }

  get monthDisplay(): string {
    return prayerArchiveTimelineMonthDisplay(this.currentMonth);
  }

  get canGoPrevious(): boolean {
    return canGoPreviousPrayerArchiveTimelineMonth(this.currentMonth, this.minMonth);
  }

  get canGoNext(): boolean {
    return canGoNextPrayerArchiveTimelineMonth(this.currentMonth, this.maxMonth);
  }

  eventDotClass(eventType: PrayerArchiveTimelineEventType): string {
    return prayerArchiveTimelineEventDotClass(eventType);
  }

  eventBorderClass(eventType: PrayerArchiveTimelineEventType): string {
    return prayerArchiveTimelineEventBorderClass(eventType);
  }

  eventLabelClass(eventType: PrayerArchiveTimelineEventType): string {
    return prayerArchiveTimelineEventLabelClass(eventType);
  }

  monthNavButtonClass(enabled: boolean): string {
    return prayerArchiveTimelineMonthNavButtonClass(enabled);
  }

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.loadSettings();
      this.prayerService.allPrayers$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((prayers: PrayerRequest[]) => {
          this.allPrayers = prayers;
          this.filterCurrentMonth().catch((err) =>
            console.error('Error filtering prayers:', err)
          );
        });
    }
    this.cdr.markForCheck();
  }

  private async loadSettings(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select('reminder_interval_days, days_before_archive')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.reminder_interval_days !== null && data.reminder_interval_days !== undefined) {
          this.reminderIntervalDays = data.reminder_interval_days;
        }
        if (data.days_before_archive !== null && data.days_before_archive !== undefined) {
          this.daysBeforeArchive = data.days_before_archive;
        }
      }

      this.filterCurrentMonth();
    } catch (err) {
      console.error('Error loading timeline settings:', err);
    }
  }

  previousMonth(): void {
    if (!this.canGoPrevious) return;
    const scrollY = window.scrollY;
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.filterCurrentMonth().then(() => {
      window.scrollTo(0, scrollY);
    });
  }

  nextMonth(): void {
    if (!this.canGoNext) return;
    const scrollY = window.scrollY;
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.filterCurrentMonth().then(() => {
      window.scrollTo(0, scrollY);
    });
  }

  private async filterCurrentMonth(): Promise<void> {
    this.processPrayers(this.allPrayers);

    const bounds = computePrayerArchiveTimelineMonthBounds(this.allEvents, this.userTimezone);
    this.minMonth = bounds.minMonth;
    this.maxMonth = bounds.maxMonth;

    const monthEvents = filterPrayerArchiveTimelineEventsForMonth(
      this.allEvents,
      this.currentMonth,
      this.userTimezone
    );
    this.timelineEvents = groupPrayerArchiveTimelineEventsByDay(monthEvents, this.userTimezone);

    this.cdr.markForCheck();
  }

  /** Spec and regression tests call through private calendar helpers. */
  private getLocalDateString(date: Date): string {
    return prayerArchiveTimelineLocalDateString(date, this.userTimezone);
  }

  private getLocalDateAtMidnight(utcDate: Date): Date {
    return prayerArchiveTimelineLocalDateAtMidnight(utcDate, this.userTimezone);
  }

  private getNextDailyRunAfterUtc(
    base: Date,
    runHourUtc: number,
    runMinuteUtc: number
  ): Date {
    return prayerArchiveTimelineNextDailyRunAfterUtc(base, runHourUtc, runMinuteUtc);
  }

  private processPrayers(prayers: PrayerRequest[]): void {
    this.allEvents = buildPrayerArchiveTimelineEvents(prayers, this.timelineConfig());
  }

  private groupEventsByDate(events: PrayerArchiveTimelineEvent[]): PrayerArchiveTimelineDay[] {
    return groupPrayerArchiveTimelineEventsByDay(events, this.userTimezone);
  }

  private formatDate(date: Date): string {
    return formatPrayerArchiveTimelineDayLabel(date, this.userTimezone);
  }

  private timelineConfig() {
    return {
      userTimezone: this.userTimezone,
      reminderIntervalDays: this.reminderIntervalDays,
      daysBeforeArchive: this.daysBeforeArchive,
      reminderJobHourUtc: this.reminderJobHourUtc,
      reminderJobMinuteUtc: this.reminderJobMinuteUtc,
    };
  }
}
