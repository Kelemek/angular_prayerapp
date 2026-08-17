import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminEmailSubscriberRowComponent } from '../admin-email-subscriber-row/admin-email-subscriber-row.component';
import type {
  EmailSubscriberRow,
  EmailSubscriberRowAction,
  EmailSubscriberSortColumn,
} from '../../lib/admin-email-subscribers';
import { emailSubscriberSortIndicator } from '../../lib/admin-email-subscribers-sort';

@Component({
  selector: 'app-admin-email-subscribers-list',
  standalone: true,
  imports: [CommonModule, AdminEmailSubscriberRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-subscribers-list.component.html',
})
export class AdminEmailSubscribersListComponent {
  @Input() searching = false;
  @Input() hasSearched = false;
  @Input() subscribers: EmailSubscriberRow[] = [];
  @Input() sortBy: EmailSubscriberSortColumn = 'last_activity_date';
  @Input() sortDirection: 'asc' | 'desc' = 'desc';

  @Output() sortColumn = new EventEmitter<EmailSubscriberSortColumn>();
  @Output() rowAction = new EventEmitter<{
    subscriber: EmailSubscriberRow;
    action: EmailSubscriberRowAction;
  }>();

  sortIndicator(column: EmailSubscriberSortColumn): string {
    return emailSubscriberSortIndicator(
      this.sortBy,
      this.sortDirection,
      column,
    );
  }
}
