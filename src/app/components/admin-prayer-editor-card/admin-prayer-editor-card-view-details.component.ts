import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import { AdminPrayerEditorCardComponent } from './admin-prayer-editor-card.component';

@Component({
  selector: 'app-admin-prayer-editor-card-view-details',
  standalone: true,
  imports: [CommonModule, RichTextViewComponent],
  templateUrl: './admin-prayer-editor-card-view-details.component.html',
})
export class AdminPrayerEditorCardViewDetailsComponent {
  @Input({ required: true }) card!: AdminPrayerEditorCardComponent;
}
