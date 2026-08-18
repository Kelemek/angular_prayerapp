import {
  ChangeDetectionStrategy,
  Component,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { AdminPrayerEditorCardComponent } from './admin-prayer-editor-card.component';

@Component({
  selector: 'app-admin-prayer-editor-card-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RichTextEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-card-edit-form.component.html',
})
export class AdminPrayerEditorCardEditFormComponent {
  @Input({ required: true }) card!: AdminPrayerEditorCardComponent;

  @ViewChild('editPrayerDescriptionEditor')
  editPrayerDescriptionEditor?: RichTextEditorComponent;

  flushDescriptionEditor(): void {
    this.editPrayerDescriptionEditor?.flushMarkdownToForm();
  }
}
