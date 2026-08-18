import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-prayer-encouragement-section',
  standalone: true,
  imports: [CommonModule, AsyncPipe, FormsModule],
  templateUrl: './user-settings-prayer-encouragement-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsPrayerEncouragementSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
