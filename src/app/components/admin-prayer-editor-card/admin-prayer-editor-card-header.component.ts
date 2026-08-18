import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPrayerEditorCardComponent } from './admin-prayer-editor-card.component';

@Component({
  selector: 'app-admin-prayer-editor-card-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-card-header.component.html',
})
export class AdminPrayerEditorCardHeaderComponent {
  @Input({ required: true }) card!: AdminPrayerEditorCardComponent;
}
