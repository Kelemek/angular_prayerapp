import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-print-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-settings-print-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsPrintSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
