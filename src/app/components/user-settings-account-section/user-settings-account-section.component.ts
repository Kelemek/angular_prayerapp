import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-account-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-settings-account-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsAccountSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
