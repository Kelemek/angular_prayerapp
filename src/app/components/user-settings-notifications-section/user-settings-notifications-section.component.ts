import { CommonModule } from '@angular/common';
import { EnabledDisabledToggleComponent } from '../enabled-disabled-toggle/enabled-disabled-toggle.component';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';
import { UserSettingsSuccessAlertComponent } from '../user-settings-success-alert/user-settings-success-alert.component';

@Component({
  selector: 'app-user-settings-notifications-section',
  standalone: true,
  imports: [
    CommonModule,
    EnabledDisabledToggleComponent,
    UserSettingsSuccessAlertComponent,
  ],
  templateUrl: './user-settings-notifications-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'settings-modal-section-group block',
  },
})
export class UserSettingsNotificationsSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
