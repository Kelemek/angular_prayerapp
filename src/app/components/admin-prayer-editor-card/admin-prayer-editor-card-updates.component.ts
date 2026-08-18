import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import { AdminPrayerEditorCardComponent } from './admin-prayer-editor-card.component';

@Component({
  selector: 'app-admin-prayer-editor-card-updates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RichTextEditorComponent,
    RichTextViewComponent,
  ],
  templateUrl: './admin-prayer-editor-card-updates.component.html',
})
export class AdminPrayerEditorCardUpdatesComponent {
  @Input({ required: true }) card!: AdminPrayerEditorCardComponent;
  @Input() editingUpdateId: string | null = null;
  @Input() savingEditUpdate = false;
  @Input() deleting = false;
}
