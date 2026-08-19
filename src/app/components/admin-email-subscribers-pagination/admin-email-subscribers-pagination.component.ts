import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminFilterSelectComponent } from '../admin-filter-select/admin-filter-select.component';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
] as const;

@Component({
  selector: 'app-admin-email-subscribers-pagination',
  standalone: true,
  imports: [CommonModule, AdminFilterSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-subscribers-pagination.component.html',
})
export class AdminEmailSubscribersPaginationComponent {
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() totalPages = 1;
  @Input() isFirstPage = true;
  @Input() isLastPage = true;
  @Input() paginationRange: number[] = [];
  @Input() activeCount = 0;

  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() goToPage = new EventEmitter<number>();

  readonly Math = Math;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  onPageSizeChange(value: string): void {
    this.pageSizeChange.emit(Number(value));
  }
}
