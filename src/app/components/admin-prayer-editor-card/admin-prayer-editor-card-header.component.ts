import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AdminPrayerEditorCardPanelContext } from '../../lib/admin-prayer-editor-card-panel-context';

@Component({
  selector: 'app-admin-prayer-editor-card-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-prayer-editor-card-header.component.html',
})
export class AdminPrayerEditorCardHeaderComponent {
  @Input({ required: true }) ctx!: AdminPrayerEditorCardPanelContext;
  @Input() selected = false;
  @Input() expanded = false;
  @Input() saving = false;
  @Input() deleting = false;
}
