import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AdminPrayerEditorCardPanelContext } from '../../lib/admin-prayer-editor-card-panel-context';
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
  templateUrl: './admin-prayer-editor-card-expanded.component.html',
})
export class AdminPrayerEditorCardExpandedComponent {
  @Input({ required: true }) ctx!: AdminPrayerEditorCardPanelContext;
  @Input() isEditing = false;
  @Input() saving = false;
  @Input() anyPrayerEditing = false;
  @Input() editingUpdateId: string | null = null;
  @Input() deleting = false;
  @Input() isAddingUpdate = false;
  @Input() savingUpdate = false;
  @Input() savingEditUpdate = false;

  @ViewChild(AdminPrayerEditorCardEditFormComponent)
  editFormPanel?: AdminPrayerEditorCardEditFormComponent;
  @ViewChild(AdminPrayerEditorCardAddUpdateComponent)
  addUpdatePanel?: AdminPrayerEditorCardAddUpdateComponent;

  flushEditDescriptionEditor(): void {
    this.editFormPanel?.flushDescriptionEditor();
  }

  resetAddUpdateSubscriberPick(): void {
    this.addUpdatePanel?.resetSubscriberPick();
  }
}
