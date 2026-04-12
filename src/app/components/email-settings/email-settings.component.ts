import { Component, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { EmailTemplatesManagerComponent } from '../email-templates-manager/email-templates-manager.component';
import { EmailSubscribersComponent } from '../email-subscribers/email-subscribers.component';

@Component({
  selector: 'app-email-settings',
  standalone: true,
  imports: [FormsModule, EmailTemplatesManagerComponent, EmailSubscribersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      @if (error) {
        <div class="mb-4">
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4" role="alert" aria-live="assertive" aria-atomic="true">
            <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
          </div>
        </div>
      }

      <!-- Email Subscribers Component -->
      <div class="mb-4">
        <app-email-subscribers></app-email-subscribers>
      </div>

      <!-- Prayer Update Reminders Section -->
      <div class="mb-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40">
        <button
          type="button"
          id="email-reminders-settings-trigger"
          class="w-full flex items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
          (click)="onRemindersSectionToggle()"
          [attr.aria-expanded]="remindersSectionExpanded"
          aria-controls="email-reminders-panel"
        >
          <span class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
            <svg class="text-blue-600 dark:text-blue-400 shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Prayer Update Reminders
          </span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
            [class.rotate-180]="remindersSectionExpanded"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        @if (remindersSectionExpanded) {
        <div
          id="email-reminders-panel"
          role="region"
          aria-labelledby="email-reminders-settings-trigger"
          class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
        >
        @if (loading) {
        <div class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Loading reminder settings...</p>
        </div>
        }

        @if (!loading) {
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Automatically send email reminders to prayer requesters and optionally archive prayers without updates.
        </p>

        <div class="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <!-- Enable Reminders Checkbox -->
          <label class="flex items-start cursor-pointer mb-4">
            <input
              type="checkbox"
              [(ngModel)]="enableReminders"
              id="enableReminders"
              name="enableReminders"
              aria-label="Enable prayer update reminders"
              class="mt-0.5 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
            />
            <span class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Enable prayer update reminders</span>
          </label>

          @if (enableReminders) {
            <!-- Reminder Interval Days -->
            <div class="ml-6 mb-4 pb-4 border-b border-gray-300 dark:border-gray-600">
              <label for="reminder-interval-days" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Days of inactivity before sending reminder email
              </label>
              <div class="flex items-center gap-3">
                <input
                  id="reminder-interval-days"
                  type="number"
                  min="1"
                  max="90"
                  [(ngModel)]="reminderIntervalDays"
                  name="reminderIntervalDays"
                  (ngModelChange)="validateReminderDays()"
                  aria-label="Days before sending reminder"
                  aria-describedby="reminderDaysHelp"
                  class="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">days</span>
              </div>
              <p id="reminderDaysHelp" class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Send reminder email after this many days without any updates to the prayer.
              </p>
            </div>

            <!-- Auto-Archive Setting -->
            <div class="ml-6">
              <label class="flex items-start cursor-pointer mb-3">
                <input
                  type="checkbox"
                  [(ngModel)]="enableAutoArchive"
                  id="enableAutoArchive"
                  name="enableAutoArchive"
                  aria-label="Auto-archive prayers after reminder"
                  class="mt-0.5 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                />
                <span class="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Auto-archive prayers after reminder if still no update</span>
              </label>
              
              @if (enableAutoArchive) {
                <div class="ml-6 mb-3">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Days after reminder email before auto-archiving
                  </label>
                  <div class="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      [(ngModel)]="daysBeforeArchive"
                      (ngModelChange)="validateArchiveDays()"
                      class="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span class="text-sm text-gray-700 dark:text-gray-300">days</span>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    After the reminder email is sent, if no update is received within this many days, the prayer will be automatically archived.
                  </p>
                  <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                    <p class="text-xs text-blue-800 dark:text-blue-200">
                      <strong>Example:</strong> With {{ reminderIntervalDays }} days for reminder and {{ daysBeforeArchive }} days for archive, a prayer with no updates will receive a reminder after {{ reminderIntervalDays }} days, then be archived {{ daysBeforeArchive }} days later (total of {{ reminderIntervalDays + daysBeforeArchive }} days) if still no update.
                    </p>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        @if (successReminders) {
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 mb-4" role="status" aria-live="polite" aria-atomic="true">
            <p class="text-sm text-green-800 dark:text-green-200">
              Reminder settings saved successfully!
            </p>
          </div>
        }

        <div class="flex justify-end">
          <button
            (click)="saveReminderSettings()"
            [disabled]="savingReminders"
            class="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Save reminder settings"
          >
            @if (savingReminders) {
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            }
            @if (!savingReminders) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            }
            {{ savingReminders ? 'Saving...' : 'Save Reminder Settings' }}
          </button>
        </div>
        }
        </div>
        }
      </div>
      </div>

      <!-- Email Templates Manager -->
      <div class="mb-4">
        <app-email-templates-manager></app-email-templates-manager>
      </div>
    </div>
  `,
  styles: []
})
export class EmailSettingsComponent {
  @Output() onSave = new EventEmitter<void>();

  remindersSectionExpanded = false;
  private remindersInitialLoadDone = false;

  enableReminders = false;
  reminderIntervalDays = 7;
  enableAutoArchive = false;
  daysBeforeArchive = 7;
  
  loading = false;
  savingReminders = false;
  error: string | null = null;
  successVerification = false;
  successReminders = false;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  onRemindersSectionToggle(): void {
    this.remindersSectionExpanded = !this.remindersSectionExpanded;
    if (this.remindersSectionExpanded && !this.remindersInitialLoadDone) {
      this.remindersInitialLoadDone = true;
      void this.loadSettings();
    }
    this.cdr.markForCheck();
  }

  async loadSettings() {
    try {
      this.loading = true;
      this.cdr.markForCheck();
      this.error = null;

      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select('enable_reminders, reminder_interval_days, enable_auto_archive, days_before_archive')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.enable_reminders !== null && data.enable_reminders !== undefined) {
          this.enableReminders = data.enable_reminders;
        }
        if (data.reminder_interval_days !== null && data.reminder_interval_days !== undefined) {
          this.reminderIntervalDays = data.reminder_interval_days;
        }
        if (data.enable_auto_archive !== null && data.enable_auto_archive !== undefined) {
          this.enableAutoArchive = data.enable_auto_archive;
        }
        if (data.days_before_archive !== null && data.days_before_archive !== undefined) {
          this.daysBeforeArchive = data.days_before_archive;
        }
      }
    } catch (err: unknown) {
      console.error('Error loading email settings:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = `Failed to load email settings: ${message}`;
      this.remindersSectionExpanded = true;
      this.cdr.markForCheck();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async saveReminderSettings() {
    try {
      this.savingReminders = true;
      this.cdr.markForCheck();
      this.error = null;
      this.successReminders = false;

      const { error } = await this.supabase.client
        .from('admin_settings')
        .upsert({
          id: 1,
          enable_reminders: this.enableReminders,
          reminder_interval_days: this.reminderIntervalDays,
          enable_auto_archive: this.enableAutoArchive,
          days_before_archive: this.daysBeforeArchive
        })
        .select();

      if (error) throw error;

      this.successReminders = true;
      this.cdr.markForCheck();
      this.toast.success('Prayer reminder settings saved!');
      this.onSave.emit();

      setTimeout(() => {
        this.successReminders = false;
        this.cdr.markForCheck();
      }, 3000);
    } catch (err: unknown) {
      console.error('Error saving reminder settings:', err);
      const message = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : 'Unknown error';
      this.error = `Failed to save reminder settings: ${message}`;
      this.remindersSectionExpanded = true;
      this.cdr.markForCheck();
      this.toast.error('Failed to save reminder settings');
    } finally {
      this.savingReminders = false;
      this.cdr.markForCheck();
    }
  }

  validateReminderDays() {
    if (this.reminderIntervalDays < 1) {
      this.reminderIntervalDays = 1;
    } else if (this.reminderIntervalDays > 90) {
      this.reminderIntervalDays = 90;
    }
  }

  validateArchiveDays() {
    if (this.daysBeforeArchive < 1) {
      this.daysBeforeArchive = 1;
    } else if (this.daysBeforeArchive > 90) {
      this.daysBeforeArchive = 90;
    }
  }
}
