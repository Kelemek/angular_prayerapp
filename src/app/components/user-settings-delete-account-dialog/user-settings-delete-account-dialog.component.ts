import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-delete-account-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-settings-delete-account-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsDeleteAccountDialogComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
