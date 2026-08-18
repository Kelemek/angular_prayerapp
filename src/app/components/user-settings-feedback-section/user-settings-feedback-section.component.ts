import { CommonModule } from '@angular/common';
import { GitHubFeedbackFormComponent } from '../github-feedback-form/github-feedback-form.component';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { UserSettingsFacade } from '../../lib/user-settings-facade';

@Component({
  selector: 'app-user-settings-feedback-section',
  standalone: true,
  imports: [CommonModule, GitHubFeedbackFormComponent],
  templateUrl: './user-settings-feedback-section.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class UserSettingsFeedbackSectionComponent {
  @Input({ required: true }) host!: UserSettingsFacade;
}
