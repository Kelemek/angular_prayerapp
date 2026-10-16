import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';
import { UserSettingsSuccessAlertComponent } from '../user-settings-success-alert/user-settings-success-alert.component';

@Component({
  selector: 'app-user-settings-appearance-section',
  standalone: true,
  imports: [CommonModule, UserSettingsSuccessAlertComponent],
  templateUrl: './user-settings-appearance-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'settings-modal-section-group block',
  },
})
export class UserSettingsAppearanceSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
