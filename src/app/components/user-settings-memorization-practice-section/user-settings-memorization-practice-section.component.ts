import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';
import { UserSettingsSuccessAlertComponent } from '../user-settings-success-alert/user-settings-success-alert.component';

@Component({
  selector: 'app-user-settings-memorization-practice-section',
  standalone: true,
  imports: [CommonModule, UserSettingsSuccessAlertComponent],
  templateUrl: './user-settings-memorization-practice-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsMemorizationPracticeSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
