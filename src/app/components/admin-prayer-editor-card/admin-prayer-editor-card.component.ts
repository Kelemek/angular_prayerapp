import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { splitSubscriberName, type SubscriberPickRow } from '../../lib/admin-subscriber-pick';
import {
  prayerEditorApprovalStatusColor,
  prayerEditorStatusColor,
  type PrayerEditorCardAction,
  type PrayerEditorEditForm,
  type PrayerEditorEditUpdateForm,
  type PrayerEditorNewUpdate,
  type PrayerEditorPrayer,
  type PrayerEditorUpdate,
} from '../../lib/admin-prayer-editor-types';
import { AdminPrayerEditorCardHeaderComponent } from './admin-prayer-editor-card-header.component';
import { AdminPrayerEditorCardExpandedComponent } from './admin-prayer-editor-card-expanded.component';
import { AdminPrayerEditorCardEditFormComponent } from './admin-prayer-editor-card-edit-form.component';
import { AdminPrayerEditorCardAddUpdateComponent } from './admin-prayer-editor-card-add-update.component';

@Component({
  selector: 'app-admin-prayer-editor-card',
  standalone: true,
  imports: [
    CommonModule,
    AdminPrayerEditorCardHeaderComponent,
    AdminPrayerEditorCardExpandedComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-card.component.html',
})
export class AdminPrayerEditorCardComponent {
  @Input({ required: true }) prayer!: PrayerEditorPrayer;
  @Input({ required: true }) index!: number;
  @Input() selected = false;
  @Input() expanded = false;
  @Input() isEditing = false;
  @Input() isAddingUpdate = false;
  @Input() anyPrayerEditing = false;
  @Input() editForm!: PrayerEditorEditForm;
  @Input() newUpdate!: PrayerEditorNewUpdate;
  @Input() editUpdateForm!: PrayerEditorEditUpdateForm;
  @Input() editingUpdateId: string | null = null;
  @Input() saving = false;
  @Input() savingUpdate = false;
  @Input() savingEditUpdate = false;
  @Input() deleting = false;

  @Output() action = new EventEmitter<PrayerEditorCardAction>();

  @ViewChild(AdminPrayerEditorCardEditFormComponent)
  editFormPanel?: AdminPrayerEditorCardEditFormComponent;
  @ViewChild(AdminPrayerEditorCardAddUpdateComponent)
  addUpdatePanel?: AdminPrayerEditorCardAddUpdateComponent;

  getStatusColor(status: string): string {
    return prayerEditorStatusColor(status);
  }

  getApprovalStatusColor(status: string): string {
    return prayerEditorApprovalStatusColor(status);
  }

  isUpdateFormValid(): boolean {
    return !!(
      this.newUpdate.content.trim() &&
      this.newUpdate.firstName.trim() &&
      this.newUpdate.lastName.trim() &&
      this.newUpdate.author_email.trim()
    );
  }

  isEditUpdateFormValid(): boolean {
    return !!(
      this.editUpdateForm.content.trim() &&
      this.editUpdateForm.author.trim() &&
      this.editUpdateForm.author_email.trim()
    );
  }

  resetAddUpdateSubscriberPick(): void {
    this.addUpdatePanel?.resetSubscriberPick();
  }

  flushEditDescriptionEditor(): void {
    this.editFormPanel?.flushDescriptionEditor();
  }

  onExpandClick(): void {
    this.action.emit({ type: 'toggleExpand' });
  }

  onSelectClick(): void {
    this.action.emit({ type: 'toggleSelect' });
  }

  onEditClick(): void {
    this.action.emit({ type: 'startEdit' });
  }

  onDeleteClick(): void {
    this.action.emit({ type: 'delete' });
  }

  onSaveEditClick(): void {
    this.action.emit({ type: 'saveEdit' });
  }

  onCancelEditClick(): void {
    this.action.emit({ type: 'cancelEdit' });
  }

  onStartAddUpdateClick(): void {
    this.action.emit({ type: 'startAddUpdate' });
  }

  onCancelAddUpdateClick(): void {
    this.action.emit({ type: 'cancelAddUpdate' });
  }

  onSaveNewUpdateClick(): void {
    this.action.emit({ type: 'saveNewUpdate' });
  }

  onAddUpdateSubscriberSelected(row: SubscriberPickRow): void {
    const { firstName, lastName } = splitSubscriberName(row.name);
    this.newUpdate.firstName = firstName;
    this.newUpdate.lastName = lastName;
    this.newUpdate.author_email = row.email.trim();
    this.action.emit({ type: 'addUpdateSubscriberSelected', row });
  }

  onDeleteUpdateClick(updateId: string, content: string): void {
    this.action.emit({ type: 'deleteUpdate', updateId, content });
  }

  onStartEditUpdateClick(update: PrayerEditorUpdate): void {
    this.action.emit({ type: 'startEditUpdate', update });
  }

  onCancelEditUpdateClick(): void {
    this.action.emit({ type: 'cancelEditUpdate' });
  }

  onSaveEditUpdateClick(updateId: string): void {
    this.action.emit({ type: 'saveEditUpdate', updateId });
  }
}
