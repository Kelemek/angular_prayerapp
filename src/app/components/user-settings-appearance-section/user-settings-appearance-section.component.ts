import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-appearance-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-settings-appearance-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: {
    class: 'settings-modal-section-group block',
  },
})
export class UserSettingsAppearanceSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
