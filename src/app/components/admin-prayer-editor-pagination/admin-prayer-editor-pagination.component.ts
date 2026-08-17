import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { prayerEditorShowingRange } from '../../lib/admin-prayer-editor-search';

@Component({
  selector: 'app-admin-prayer-editor-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-pagination.component.html',
})
export class AdminPrayerEditorPaginationComponent {
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() totalPages = 0;
  @Input() isFirstPage = true;
  @Input() isLastPage = true;
  @Input() paginationRange: number[] = [];
  @Input() selectedCount = 0;

  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() goToPage = new EventEmitter<number>();

  get showingStart(): number {
    return prayerEditorShowingRange(this.currentPage, this.pageSize, this.totalItems).start;
  }

  get showingEnd(): number {
    return prayerEditorShowingRange(this.currentPage, this.pageSize, this.totalItems).end;
  }
}
