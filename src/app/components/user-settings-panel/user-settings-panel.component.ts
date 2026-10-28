import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPendingBadgeComponent } from '../admin-pending-badge/admin-pending-badge.component';
import { AdminPendingCountService } from '../../services/admin-pending-count.service';
import { HourReminderSettingsSectionComponent } from '../hour-reminder-settings-section/hour-reminder-settings-section.component';
import { UserSettingsPrintSectionComponent } from '../user-settings-print-section/user-settings-print-section.component';
import { UserSettingsAppearanceSectionComponent } from '../user-settings-appearance-section/user-settings-appearance-section.component';
import { UserSettingsNotificationsSectionComponent } from '../user-settings-notifications-section/user-settings-notifications-section.component';
import { UserSettingsPrayerEncouragementSectionComponent } from '../user-settings-prayer-encouragement-section/user-settings-prayer-encouragement-section.component';
import { UserSettingsDefaultViewSectionComponent } from '../user-settings-default-view-section/user-settings-default-view-section.component';
import { UserSettingsMemorizationPracticeSectionComponent } from '../user-settings-memorization-practice-section/user-settings-memorization-practice-section.component';
import { UserSettingsErrorBannerComponent } from '../user-settings-error-banner/user-settings-error-banner.component';
import { UserSettingsFeedbackSectionComponent } from '../user-settings-feedback-section/user-settings-feedback-section.component';
import { UserSettingsAccountSectionComponent } from '../user-settings-account-section/user-settings-account-section.component';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';
import { getWebBuildLabel } from '../../../lib/web-build-info';

@Component({
  selector: 'app-user-settings-panel',
  standalone: true,
  imports: [
    CommonModule,
    HourReminderSettingsSectionComponent,
    UserSettingsPrintSectionComponent,
    UserSettingsAppearanceSectionComponent,
    UserSettingsNotificationsSectionComponent,
    UserSettingsPrayerEncouragementSectionComponent,
    UserSettingsDefaultViewSectionComponent,
    UserSettingsMemorizationPracticeSectionComponent,
    UserSettingsErrorBannerComponent,
    UserSettingsFeedbackSectionComponent,
    UserSettingsAccountSectionComponent,
    AdminPendingBadgeComponent,
  ],
  templateUrl: './user-settings-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'flex min-h-0 flex-1 flex-col',
  },
})
export class UserSettingsPanelComponent {
  @Input({ required: true }) host!: UserSettingsFacade;

  private readonly pendingCounts = inject(AdminPendingCountService);
  readonly pendingApprovalItemCount$ = this.pendingCounts.pendingApprovalItemCount$;

  constructor() {
    // Settings mounts this panel on every open, so this is the open-time refresh.
    void this.pendingCounts.refresh();
  }

  readonly webBuildLabel = getWebBuildLabel();
}
