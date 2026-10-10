import {
  Component,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import {
  AdminFilterSelectComponent,
  type AdminFilterSelectOption,
} from '../admin-filter-select/admin-filter-select.component';
import type { AdminPrayerEditorCardPanelContext } from '../../lib/admin-prayer-editor-card-panel-context';

const PRAYER_STATUS_EDIT_OPTIONS: readonly AdminFilterSelectOption[] = [
  { value: 'current', label: 'Current' },
  { value: 'answered', label: 'Answered' },
  { value: 'archived', label: 'Archived' },
];

@Component({
  selector: 'app-admin-prayer-editor-card-edit-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RichTextEditorComponent,
    AdminFilterSelectComponent,
  ],
  host: { class: 'block' },
  templateUrl: './admin-prayer-editor-card-edit-form.component.html',
})
export class AdminPrayerEditorCardEditFormComponent {
  readonly prayerStatusOptions = PRAYER_STATUS_EDIT_OPTIONS;

  @Input({ required: true }) ctx!: AdminPrayerEditorCardPanelContext;

  @ViewChild('editPrayerDescriptionEditor')
  editPrayerDescriptionEditor?: RichTextEditorComponent;

  flushDescriptionEditor(): void {
    this.editPrayerDescriptionEditor?.flushMarkdownToForm();
  }
}
