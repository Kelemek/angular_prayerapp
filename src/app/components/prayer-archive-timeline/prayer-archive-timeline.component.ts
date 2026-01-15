import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrayerService, PrayerRequest } from '../../services/prayer.service';
import { SupabaseService } from '../../services/supabase.service';

interface TimelineEvent {
  date: Date;
  prayer: {
    id: string;
    title: string;
  };
  eventType: 'reminder-sent' | 'reminder-upcoming' | 'archive-past' | 'archive-upcoming' | 'archived';
  daysUntil: number;
}

interface TimelineDay {
  date: Date;
  dateStr: string;
  events: TimelineEvent[];
}

@Component({
  selector: 'app-prayer-archive-timeline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <svg class="text-orange-600 dark:text-orange-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">Prayer Timeline</h3>
        </div>
        <button
          (click)="refreshData()"
          class="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          [disabled]="isLoading"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.animate-spin]="isLoading">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>
          </svg>
          {{ isLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <!-- Settings Info -->
      <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div class="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <p>
            <span class="font-semibold">Reminder Interval:</span> {{ reminderIntervalDays }} days of inactivity
          </p>
          <p>
            <span class="font-semibold">Archive Threshold:</span> {{ daysBeforeArchive }} days after reminder sent
          </p>
          <p>
            <span class="font-semibold">Timezone:</span> {{ userTimezone }}
          </p>
        </div>
      </div>

      <!-- Unified Timeline -->
      @if (timelineEvents.length > 0) {
        <div class="mt-8">
          <!-- Month Navigation -->
          <div class="flex items-center justify-between mb-6">
            <button
              (click)="previousMonth()"
              [disabled]="!canGoPrevious"
              class="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
              [ngClass]="canGoPrevious
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer' 
                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Previous
            </button>
            
            <div class="text-center">
              <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">{{ monthDisplay }}</h3>
            </div>
            
            <button
              (click)="nextMonth()"
              [disabled]="!canGoNext"
              class="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
              [ngClass]="canGoNext
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer' 
                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'"
            >
              Next
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          <h4 class="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6">Prayer Lifecycle Timeline</h4>
          <div class="relative">
            <!-- Timeline line -->
            <div class="absolute left-[11px] top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 via-blue-400 to-green-400 dark:from-orange-600 dark:via-blue-600 dark:to-green-600"></div>

            <!-- Timeline events -->
            @for (day of timelineEvents; track day.dateStr) {
              <div class="mb-8">
                <h5 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 ml-14">{{ day.dateStr }}</h5>
                
                @for (event of day.events; track event.prayer.id + event.eventType) {
                  <div class="relative mb-4">
                    <!-- Timeline dot positioned on the line -->
                    <div class="absolute left-[1px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2"
                        [ngClass]="{
                          'bg-blue-500 border-blue-600 dark:bg-blue-600 dark:border-blue-700': event.eventType === 'reminder-upcoming',
                          'bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-700': event.eventType === 'reminder-sent',
                          'bg-red-500 border-red-600 dark:bg-red-600 dark:border-red-700': event.eventType === 'archive-upcoming',
                          'bg-gray-500 border-gray-600 dark:bg-gray-600 dark:border-gray-700': event.eventType === 'archive-past' || event.eventType === 'archived'
                        }">
                    </div>

                    <!-- Event content -->
                    <div class="ml-14 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border"
                      [ngClass]="{
                        'border-blue-200 dark:border-blue-600': event.eventType === 'reminder-upcoming',
                        'border-green-200 dark:border-green-600': event.eventType === 'reminder-sent',
                        'border-red-200 dark:border-red-600': event.eventType === 'archive-upcoming',
                        'border-gray-300 dark:border-gray-600': event.eventType === 'archive-past' || event.eventType === 'archived'
                      }">
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <p class="font-semibold text-gray-800 dark:text-gray-100">{{ event.prayer.title }}</p>
                          <div class="flex items-center gap-2 mt-1"
                            [ngClass]="{
                              'text-blue-700 dark:text-blue-400': event.eventType === 'reminder-upcoming',
                              'text-green-700 dark:text-green-400': event.eventType === 'reminder-sent',
                              'text-red-700 dark:text-red-400': event.eventType === 'archive-upcoming',
                              'text-gray-700 dark:text-gray-400': event.eventType === 'archive-past' || event.eventType === 'archived'
                            }">
                            @switch (event.eventType) {
                              @case ('reminder-upcoming') {
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span class="text-sm">Reminder sending</span>
                              }
                              @case ('reminder-sent') {
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
                                </svg>
                                <span class="text-sm">Reminder sent</span>
                              }
                              @case ('archive-upcoming') {
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z"></path>
                                </svg>
                                <span class="text-sm">Will archive</span>
                              }
                              @case ('archive-past') {
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
                                </svg>
                                <span class="text-sm">Prayer archived</span>
                              }
                              @case ('archived') {
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z"></path>
                                </svg>
                                <span class="text-sm">Archived</span>
                              }
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
            <path d="M21 3v5h-5"></path>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
            <path d="M3 21v-5h5"></path>
          </svg>
          <p>No prayer events scheduled for the selected timeframe</p>
        </div>
      }

      <!-- Bottom Navigation -->
      <div class="mt-8 flex items-center justify-between gap-4">
        <button
          (click)="previousMonth()"
          [disabled]="!canGoPrevious"
          class="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
          [ngClass]="canGoPrevious
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer' 
            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Previous
        </button>

        <div class="flex-1"></div>

        <button
          (click)="nextMonth()"
          [disabled]="!canGoNext"
          class="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
          [ngClass]="canGoNext
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer' 
            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'"
        >
          Next
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Legend -->
      <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">Legend</p>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="flex items-center gap-2">
            <svg class="text-blue-600 dark:text-blue-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="text-gray-600 dark:text-gray-400">Upcoming reminder</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="text-green-600 dark:text-green-400" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
            </svg>
            <span class="text-gray-600 dark:text-gray-400">Reminder sent</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="text-red-600 dark:text-red-400" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z"></path>
            </svg>
            <span class="text-gray-600 dark:text-gray-400">Upcoming archive</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="text-gray-600 dark:text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
            </svg>
            <span class="text-gray-600 dark:text-gray-400">Prayer archived</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    :host ::ng-deep .animate-spin {
      animation: spin 1s linear infinite;
    }
  `]
})
export class PrayerArchiveTimelineComponent implements OnInit {
  isLoading = false;
  reminderIntervalDays = 30;
  daysBeforeArchive = 30;

  timelineEvents: TimelineDay[] = [];
  
  // Timezone
  userTimezone: string;
  
  // Month pagination
  currentMonth = new Date();
  private allPrayers: PrayerRequest[] = [];
  private allEvents: TimelineEvent[] = [];
  private minMonth: Date | null = null;
  private maxMonth: Date | null = null;

  constructor(
    private prayerService: PrayerService,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {
    // Detect user's timezone
    this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  get monthKey(): string {
    return `${this.currentMonth.getFullYear()}-${String(this.currentMonth.getMonth() + 1).padStart(2, '0')}`;
  }
  
  get monthDisplay(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  
  get canGoPrevious(): boolean {
    if (!this.minMonth) return false;
    const currentYear = this.currentMonth.getFullYear();
    const currentMonth = this.currentMonth.getMonth();
    const minYear = this.minMonth.getFullYear();
    const minMonthValue = this.minMonth.getMonth();
    
    return currentYear > minYear || (currentYear === minYear && currentMonth > minMonthValue);
  }

  get canGoNext(): boolean {
    if (!this.maxMonth) return false;
    const currentYear = this.currentMonth.getFullYear();
    const currentMonth = this.currentMonth.getMonth();
    const maxYear = this.maxMonth.getFullYear();
    const maxMonthValue = this.maxMonth.getMonth();
    
    return currentYear < maxYear || (currentYear === maxYear && currentMonth < maxMonthValue);
  }

  ngOnInit(): void {
    // Load settings from database
    this.loadSettings();
    
    this.prayerService.allPrayers$.subscribe((prayers: PrayerRequest[]) => {
      this.allPrayers = prayers;
      this.filterCurrentMonth().catch(err => console.error('Error filtering prayers:', err));
    });
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
      
      // Refresh timeline with updated settings
      this.filterCurrentMonth();
    } catch (err) {
      console.error('Error loading timeline settings:', err);
      // Use defaults if load fails
    }
  }

  refreshData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    
    // Reload both settings and prayers
    Promise.all([
      this.loadSettings(),
      this.prayerService.loadPrayers(true)
    ]).finally(() => {
      this.isLoading = false;
      this.cdr.markForCheck();
    });
  }

  previousMonth(): void {
    if (!this.canGoPrevious) return;
    const scrollY = window.scrollY;
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.currentMonth = new Date(this.currentMonth);
    this.filterCurrentMonth().then(() => {
      window.scrollTo(0, scrollY);
    });
  }
  
  nextMonth(): void {
    if (!this.canGoNext) return;
    const scrollY = window.scrollY;
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.currentMonth = new Date(this.currentMonth);
    this.filterCurrentMonth().then(() => {
      window.scrollTo(0, scrollY);
    });
  }

  private async filterCurrentMonth(): Promise<void> {
    // Process ALL prayers first (this calculates reminder/archive dates)
    await this.processPrayers(this.allPrayers);
    
    // Calculate min and max months from all events
    if (this.allEvents.length > 0) {
      const months = this.allEvents.map(e => new Date(e.date.getFullYear(), e.date.getMonth(), 1));
      this.minMonth = new Date(Math.min(...months.map(d => d.getTime())));
      this.maxMonth = new Date(Math.max(...months.map(d => d.getTime())));
    } else {
      this.minMonth = null;
      this.maxMonth = null;
    }
    
    // Then filter timeline events by the target month using timezone-aware comparison
    const targetYear = this.currentMonth.getFullYear();
    const targetMonth = String(this.currentMonth.getMonth() + 1).padStart(2, '0');
    const targetYearMonth = `${targetYear}-${targetMonth}`;
    
    this.timelineEvents = this.groupEventsByDate(
      this.allEvents.filter(event => {
        const eventYearMonth = this.getLocalDateString(event.date).substring(0, 7);
        return eventYearMonth === targetYearMonth;
      })
    );
    
    this.cdr.markForCheck();
  }

  /**
   * Convert UTC Date to local date string in user's timezone
   * Returns YYYY-MM-DD format
   */
  private getLocalDateString(date: Date): string {
    return new Date(date).toLocaleDateString('en-CA', { timeZone: this.userTimezone });
  }

  /**
   * Convert a UTC date to a local date at midnight (00:00:00 in local timezone)
   * This ensures events from UTC timestamps are properly placed in the correct local date
   * Uses UTC date creation to avoid timezone offset issues
   */
  private getLocalDateAtMidnight(utcDate: Date): Date {
    const localDateStr = this.getLocalDateString(utcDate);
    // Parse YYYY-MM-DD format
    const [year, month, day] = localDateStr.split('-').map(Number);
    // Create UTC date representing midnight on that day in local time
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  }

  private async processPrayers(prayers: PrayerRequest[]): Promise<void> {
    const allEvents: TimelineEvent[] = [];

    const today = new Date();
    const todayLocalStr = this.getLocalDateString(today);
    const [todayYear, todayMonth, todayDay] = todayLocalStr.split('-').map(Number);
    const todayLocal = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay, 0, 0, 0));

    for (const prayer of prayers) {
      // Check if prayer is archived
      if (prayer.status === 'archived' && prayer.updated_at) {
        const archivedDate = this.getLocalDateAtMidnight(new Date(prayer.updated_at));
        
        allEvents.push({
          date: archivedDate,
          prayer: { id: prayer.id, title: prayer.title },
          eventType: 'archived',
          daysUntil: 0
        });
        continue; // Don't process reminder/archive events for already-archived prayers
      }

      // Get the most recent update for this prayer
      let lastActivityDate: Date | null = null;
      try {
        const { data: updates, error } = await this.supabase.client
          .from('prayer_updates')
          .select('created_at')
          .eq('prayer_id', prayer.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && updates && updates.length > 0) {
          lastActivityDate = new Date(updates[0].created_at);
        }
      } catch (err) {
        console.error(`Error fetching updates for prayer ${prayer.id}:`, err);
      }

      const lastReminderSent = prayer.last_reminder_sent;
      
      if (lastReminderSent) {
        const lastReminderDate = this.getLocalDateAtMidnight(new Date(lastReminderSent));
        
        // Check if there's an update after the reminder was sent (timer reset)
        let hasUpdateAfterReminder = false;
        if (lastActivityDate) {
          const lastActivityLocalDate = this.getLocalDateAtMidnight(lastActivityDate);
          if (lastActivityLocalDate > lastReminderDate) {
            hasUpdateAfterReminder = true;
          }
        }

        if (!hasUpdateAfterReminder) {
          // Archive event (30 days after reminder sent)
          const archiveDate = new Date(lastReminderDate);
          archiveDate.setDate(archiveDate.getDate() + this.daysBeforeArchive);
          
          const archiveDaysUntil = Math.ceil((archiveDate.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24));
          
          if (archiveDaysUntil <= 0) {
            allEvents.push({
              date: archiveDate,
              prayer: { id: prayer.id, title: prayer.title },
              eventType: 'archive-past',
              daysUntil: 0
            });
          } else {
            allEvents.push({
              date: archiveDate,
              prayer: { id: prayer.id, title: prayer.title },
              eventType: 'archive-upcoming',
              daysUntil: archiveDaysUntil
            });
          }
        }
        
        // Reminder sent event
        allEvents.push({
          date: lastReminderDate,
          prayer: { id: prayer.id, title: prayer.title },
          eventType: 'reminder-sent',
          daysUntil: 0
        });
      } else {
        // Calculate next reminder based on last activity (update or creation)
        // This matches the backend logic which resets timer on updates
        let baseDate: Date;
        if (lastActivityDate) {
          baseDate = this.getLocalDateAtMidnight(lastActivityDate);
        } else {
          baseDate = this.getLocalDateAtMidnight(new Date(prayer.created_at));
        }
        
        const nextReminderDate = new Date(baseDate);
        nextReminderDate.setDate(nextReminderDate.getDate() + this.reminderIntervalDays);
        
        const reminderDaysUntil = Math.ceil((nextReminderDate.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24));
        
        if (reminderDaysUntil <= 0) {
          // Show as sent if due
          allEvents.push({
            date: nextReminderDate,
            prayer: { id: prayer.id, title: prayer.title },
            eventType: 'reminder-sent',
            daysUntil: 0
          });
          
          // If reminder was sent, also add archive event (30 days later)
          const archiveDate = new Date(nextReminderDate);
          archiveDate.setDate(archiveDate.getDate() + this.daysBeforeArchive);
          
          const archiveDaysUntil = Math.ceil((archiveDate.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24));
          
          if (archiveDaysUntil <= 0) {
            allEvents.push({
              date: archiveDate,
              prayer: { id: prayer.id, title: prayer.title },
              eventType: 'archive-past',
              daysUntil: 0
            });
          } else {
            allEvents.push({
              date: archiveDate,
              prayer: { id: prayer.id, title: prayer.title },
              eventType: 'archive-upcoming',
              daysUntil: archiveDaysUntil
            });
          }
        } else {
          // Show as upcoming
          allEvents.push({
            date: nextReminderDate,
            prayer: { id: prayer.id, title: prayer.title },
            eventType: 'reminder-upcoming',
            daysUntil: reminderDaysUntil
          });
        }
      }
    }
    
    this.allEvents = allEvents;
  }

  private groupEventsByDate(events: TimelineEvent[]): TimelineDay[] {
    const groupedByDate = new Map<string, TimelineEvent[]>();
    
    events.forEach(event => {
      const dateKey = event.date.toISOString().split('T')[0];
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey)!.push(event);
    });
    
    return Array.from(groupedByDate.entries())
      .map(([dateStr, dayEvents]) => {
        const date = new Date(dateStr);
        return {
          date,
          dateStr: this.formatDate(date),
          events: dayEvents.sort((a, b) => {
            const typeOrder = { 'reminder-upcoming': 1, 'reminder-sent': 2, 'archive-upcoming': 3, 'archive-past': 4, 'archived': 4 };
            return typeOrder[a.eventType] - typeOrder[b.eventType];
          })
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private formatDate(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateFormatted = new Date(date);
    dateFormatted.setHours(0, 0, 0, 0);
    
    // Compare using local timezone strings
    const dateLocalStr = this.getLocalDateString(dateFormatted);
    const todayLocalStr = this.getLocalDateString(today);
    const tomorrowLocalStr = this.getLocalDateString(tomorrow);
    
    if (dateLocalStr === todayLocalStr) {
      return 'Today';
    } else if (dateLocalStr === tomorrowLocalStr) {
      return 'Tomorrow';
    } else {
      return dateFormatted.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        timeZone: this.userTimezone 
      });
    }
  }
}
