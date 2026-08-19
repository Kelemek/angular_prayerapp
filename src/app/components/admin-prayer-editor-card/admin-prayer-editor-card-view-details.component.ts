import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import type { AdminPrayerEditorCardPanelContext } from '../../lib/admin-prayer-editor-card-panel-context';

@Component({
  selector: 'app-admin-prayer-editor-card-view-details',
  standalone: true,
  imports: [CommonModule, RichTextViewComponent],
  host: { class: 'block' },
  templateUrl: './admin-prayer-editor-card-view-details.component.html',
})
export class AdminPrayerEditorCardViewDetailsComponent {
  @Input({ required: true }) ctx!: AdminPrayerEditorCardPanelContext;
}
