import {
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { EmailTemplatesManagerComponent } from '../email-templates-manager/email-templates-manager.component';
import { EmailSubscribersComponent } from '../email-subscribers/email-subscribers.component';
import { AdminSubscriberEmailBroadcastComponent } from '../admin-subscriber-email-broadcast/admin-subscriber-email-broadcast.component';
import { HourlyReminderTemplateSectionComponent } from '../hourly-reminder-template-section/hourly-reminder-template-section.component';
import { AdminEmailPrayerRemindersSectionComponent } from '../admin-email-prayer-reminders-section/admin-email-prayer-reminders-section.component';

@Component({
  selector: 'app-email-settings',
  standalone: true,
  imports: [
    EmailTemplatesManagerComponent,
    EmailSubscribersComponent,
    AdminSubscriberEmailBroadcastComponent,
    HourlyReminderTemplateSectionComponent,
    AdminEmailPrayerRemindersSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-settings.component.html',
  styles: [`:host { display: block; }`],
})
export class EmailSettingsComponent {
  @ViewChild(EmailSubscribersComponent) emailSubscribers?: EmailSubscribersComponent;

  @Output() onSave = new EventEmitter<void>();

  readonly hourlyReminderTemplateOptions = [
    { value: 'user_hourly_prayer_reminder', label: 'Simple nudge (default)' },
    {
      value: 'user_hourly_prayer_reminder_with_spotlight',
      label:
        'Spotlight mix — all current community + your personal (non-answered)',
    },
  ] as const;

  readonly hourlyMemorizationReminderTemplateOptions = [
    { value: 'user_hourly_memorization_reminder', label: 'Simple nudge (default)' },
    {
      value: 'user_hourly_memorization_reminder_with_spotlight',
      label: 'Spotlight — item needing the most practice',
    },
  ] as const;

  readonly hourlyPrayerAllowedKeys = [
    'user_hourly_prayer_reminder',
    'user_hourly_prayer_reminder_with_spotlight',
  ] as const;

  readonly hourlyMemorizationAllowedKeys = [
    'user_hourly_memorization_reminder',
    'user_hourly_memorization_reminder_with_spotlight',
  ] as const;

  error: string | null = null;

  prepareEmailSubscribersTour(): void {
    this.emailSubscribers?.prepareTourInitialState();
  }

  prepareEmailSubscribersOverviewTour(): Promise<void> {
    return this.emailSubscribers?.prepareOverviewTourListState() ?? Promise.resolve();
  }

  openAddSubscriberFormForTour(): void {
    this.emailSubscribers?.openAddFormForTour();
  }

  showPlanningCenterTabForTour(): void {
    this.emailSubscribers?.showPlanningCenterTabForTour();
  }

  runPlanningCenterSearchTourDemo(): Promise<void> {
    return this.emailSubscribers?.runPlanningCenterSearchTourDemo() ?? Promise.resolve();
  }

  selectTourPlanningCenterMatchFromDemoResults(): void {
    this.emailSubscribers?.selectTourPlanningCenterMatchFromDemoResults();
  }

  applyTourDemoPlanningCenterAdd(): void {
    this.emailSubscribers?.applyTourDemoPlanningCenterAdd();
  }

  clearEmailSubscribersTourDemoForm(): void {
    this.emailSubscribers?.clearEmailSubscribersTourDemoForm();
  }
}
