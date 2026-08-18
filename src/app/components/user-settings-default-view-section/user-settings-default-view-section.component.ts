import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-default-view-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-settings-default-view-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsDefaultViewSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
