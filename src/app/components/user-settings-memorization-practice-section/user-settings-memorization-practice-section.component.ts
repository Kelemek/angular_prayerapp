import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-memorization-practice-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-settings-memorization-practice-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsMemorizationPracticeSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
