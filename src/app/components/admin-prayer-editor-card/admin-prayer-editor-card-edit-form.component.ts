import {
  Component,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import type { AdminPrayerEditorCardPanelContext } from '../../lib/admin-prayer-editor-card-panel-context';

@Component({
  selector: 'app-admin-prayer-editor-card-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RichTextEditorComponent],
  host: { class: 'block' },
  templateUrl: './admin-prayer-editor-card-edit-form.component.html',
})
export class AdminPrayerEditorCardEditFormComponent {
  @Input({ required: true }) ctx!: AdminPrayerEditorCardPanelContext;

  @ViewChild('editPrayerDescriptionEditor')
  editPrayerDescriptionEditor?: RichTextEditorComponent;

  flushDescriptionEditor(): void {
    this.editPrayerDescriptionEditor?.flushMarkdownToForm();
  }
}
