import { CommonModule } from '@angular/common';
import { EnabledDisabledToggleComponent } from '../enabled-disabled-toggle/enabled-disabled-toggle.component';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-notifications-section',
  standalone: true,
  imports: [CommonModule, EnabledDisabledToggleComponent],
  templateUrl: './user-settings-notifications-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsNotificationsSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
