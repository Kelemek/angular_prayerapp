import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';
import { UserSettingsSuccessAlertComponent } from '../user-settings-success-alert/user-settings-success-alert.component';

@Component({
  selector: 'app-user-settings-default-view-section',
  standalone: true,
  imports: [CommonModule, UserSettingsSuccessAlertComponent],
  templateUrl: './user-settings-default-view-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsDefaultViewSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
