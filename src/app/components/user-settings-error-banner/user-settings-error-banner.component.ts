import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-error-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-settings-error-banner.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsErrorBannerComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
