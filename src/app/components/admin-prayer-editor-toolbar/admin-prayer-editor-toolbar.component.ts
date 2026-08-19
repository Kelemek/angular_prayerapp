import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PRAYER_EDITOR_MAIN_SEARCH_DEBOUNCE_MS,
  PRAYER_EDITOR_MAIN_SEARCH_MIN_CHARS,
  PRAYER_EDITOR_MAIN_SEARCH_RESULT_LIMIT,
} from '../../lib/admin-prayer-editor-search';
import { AdminFilterSelectComponent } from '../admin-filter-select/admin-filter-select.component';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'current', label: 'Current' },
  { value: 'answered', label: 'Answered' },
  { value: 'archived', label: 'Archived' },
] as const;

const APPROVAL_FILTER_OPTIONS = [
  { value: 'all', label: 'All Approvals' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'denied', label: 'Denied' },
] as const;

@Component({
  selector: 'app-admin-prayer-editor-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminFilterSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-toolbar.component.html',
})
export class AdminPrayerEditorToolbarComponent {
  @Input() searchTerm = '';
  @Input() searching = false;
  @Input() statusFilter = '';
  @Input() approvalFilter = '';

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() searchKeydown = new EventEmitter<KeyboardEvent>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() statusFilterChange = new EventEmitter<string>();
  @Output() approvalFilterChange = new EventEmitter<string>();

  readonly mainSearchMinChars = PRAYER_EDITOR_MAIN_SEARCH_MIN_CHARS;
  readonly mainSearchDebounceMs = PRAYER_EDITOR_MAIN_SEARCH_DEBOUNCE_MS;
  readonly mainSearchResultLimit = PRAYER_EDITOR_MAIN_SEARCH_RESULT_LIMIT;
  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  readonly approvalFilterOptions = APPROVAL_FILTER_OPTIONS;
}
