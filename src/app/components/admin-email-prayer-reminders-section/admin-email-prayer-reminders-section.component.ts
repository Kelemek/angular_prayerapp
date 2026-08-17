import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { AdminSectionLoadingComponent } from '../admin-section-loading/admin-section-loading.component';
import {
  applyEmailPrayerReminderRow,
  clampReminderDays,
  DEFAULT_EMAIL_PRAYER_REMINDER_SETTINGS,
  emailSettingsErrorMessage,
  type EmailPrayerReminderSettings,
} from '../../lib/admin-email-reminders';
import { fetchEmailPrayerReminderSettings } from '../../lib/admin-email-reminders-fetch';
import { saveEmailPrayerReminderSettings } from '../../lib/admin-email-reminders-save';

@Component({
  selector: 'app-admin-email-prayer-reminders-section',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSectionLoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-prayer-reminders-section.component.html',
})
export class AdminEmailPrayerRemindersSectionComponent {
  @Output() saved = new EventEmitter<void>();
  @Output() settingsError = new EventEmitter<string | null>();

  sectionExpanded = false;
  private initialLoadDone = false;

  settings: EmailPrayerReminderSettings = {
    ...DEFAULT_EMAIL_PRAYER_REMINDER_SETTINGS,
  };

  loading = false;
  saving = false;
  success = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.initialLoadDone) {
      this.initialLoadDone = true;
      void this.loadSettings();
    }
    this.cdr.markForCheck();
  }

  onShellClick(): void {
    if (!this.sectionExpanded) {
      this.onSectionToggle();
    }
  }

  onTriggerClick(event: MouseEvent): void {
    event.stopPropagation();
    this.onSectionToggle();
  }

  stopPanelClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  async loadSettings(): Promise<void> {
    try {
      this.loading = true;
      this.settingsError.emit(null);
      this.cdr.markForCheck();

      const data = await fetchEmailPrayerReminderSettings(this.supabase.client);
      this.settings = applyEmailPrayerReminderRow(this.settings, data);
    } catch (err: unknown) {
      console.error('Error loading email settings:', err);
      this.settingsError.emit(
        `Failed to load email settings: ${emailSettingsErrorMessage(err)}`,
      );
      this.sectionExpanded = true;
      this.cdr.markForCheck();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async saveReminderSettings(): Promise<void> {
    try {
      this.saving = true;
      this.settingsError.emit(null);
      this.success = false;
      this.cdr.markForCheck();

      await saveEmailPrayerReminderSettings(this.supabase.client, this.settings);

      this.success = true;
      this.cdr.markForCheck();
      this.toast.success('Prayer reminder settings saved!');
      this.saved.emit();

      setTimeout(() => {
        this.success = false;
        this.cdr.markForCheck();
      }, 3000);
    } catch (err: unknown) {
      console.error('Error saving reminder settings:', err);
      this.settingsError.emit(
        `Failed to save reminder settings: ${emailSettingsErrorMessage(err)}`,
      );
      this.sectionExpanded = true;
      this.cdr.markForCheck();
      this.toast.error('Failed to save reminder settings');
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  validateReminderDays(): void {
    this.settings = {
      ...this.settings,
      reminderIntervalDays: clampReminderDays(this.settings.reminderIntervalDays),
    };
    this.cdr.markForCheck();
  }

  validateArchiveDays(): void {
    this.settings = {
      ...this.settings,
      daysBeforeArchive: clampReminderDays(this.settings.daysBeforeArchive),
    };
    this.cdr.markForCheck();
  }
}
