import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-prayer-editor-bulk-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-bulk-bar.component.html',
})
export class AdminPrayerEditorBulkBarComponent {
  @Input() displayCount = 0;
  @Input() selectedCount = 0;
  @Input() allSelected = false;
  @Input() bulkStatus = '';
  @Input() updatingStatus = false;
  @Input() deleting = false;

  @Output() toggleSelectAll = new EventEmitter<void>();
  @Output() bulkStatusChange = new EventEmitter<string>();
  @Output() updateSelected = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
}
