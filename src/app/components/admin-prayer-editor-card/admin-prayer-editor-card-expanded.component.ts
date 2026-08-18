import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPrayerEditorCardComponent } from './admin-prayer-editor-card.component';
import { AdminPrayerEditorCardEditFormComponent } from './admin-prayer-editor-card-edit-form.component';
import { AdminPrayerEditorCardViewDetailsComponent } from './admin-prayer-editor-card-view-details.component';
import { AdminPrayerEditorCardUpdatesComponent } from './admin-prayer-editor-card-updates.component';
import { AdminPrayerEditorCardAddUpdateComponent } from './admin-prayer-editor-card-add-update.component';

@Component({
  selector: 'app-admin-prayer-editor-card-expanded',
  standalone: true,
  imports: [
    CommonModule,
    AdminPrayerEditorCardEditFormComponent,
    AdminPrayerEditorCardViewDetailsComponent,
    AdminPrayerEditorCardUpdatesComponent,
    AdminPrayerEditorCardAddUpdateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-card-expanded.component.html',
})
export class AdminPrayerEditorCardExpandedComponent {
  @Input({ required: true }) card!: AdminPrayerEditorCardComponent;
}
