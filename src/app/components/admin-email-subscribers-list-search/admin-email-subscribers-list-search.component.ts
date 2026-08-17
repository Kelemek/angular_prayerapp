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
  EMAIL_SUBSCRIBER_LIST_SEARCH_DEBOUNCE_MS,
  EMAIL_SUBSCRIBER_LIST_SEARCH_MIN_CHARS,
} from '../../lib/admin-email-subscribers';

@Component({
  selector: 'app-admin-email-subscribers-list-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-subscribers-list-search.component.html',
})
export class AdminEmailSubscribersListSearchComponent {
  @Input() searchQuery = '';
  @Input() searching = false;

  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchKeydown = new EventEmitter<KeyboardEvent>();
  @Output() clearSearch = new EventEmitter<void>();

  readonly listSearchMinChars = EMAIL_SUBSCRIBER_LIST_SEARCH_MIN_CHARS;
  readonly listSearchDebounceMs = EMAIL_SUBSCRIBER_LIST_SEARCH_DEBOUNCE_MS;
}
