import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminEmailSubscribersToolbarComponent } from '../admin-email-subscribers-toolbar/admin-email-subscribers-toolbar.component';
import { AdminEmailSubscribersErrorBannerComponent } from '../admin-email-subscribers-error-banner/admin-email-subscribers-error-banner.component';
import { AdminEmailSubscribersSuccessBannerComponent } from '../admin-email-subscribers-success-banner/admin-email-subscribers-success-banner.component';
import { AdminEmailSubscribersCsvPanelComponent } from '../admin-email-subscribers-csv-panel/admin-email-subscribers-csv-panel.component';
import { AdminEmailSubscribersAddFormComponent } from '../admin-email-subscribers-add-form/admin-email-subscribers-add-form.component';
import { AdminEmailSubscribersListSearchComponent } from '../admin-email-subscribers-list-search/admin-email-subscribers-list-search.component';
import { AdminEmailSubscribersListComponent } from '../admin-email-subscribers-list/admin-email-subscribers-list.component';
import { AdminEmailSubscribersPaginationComponent } from '../admin-email-subscribers-pagination/admin-email-subscribers-pagination.component';
import { AdminEmailSubscriberEditModalComponent } from '../admin-email-subscriber-edit-modal/admin-email-subscriber-edit-modal.component';
import type {
  EmailSubscriberRow,
  EmailSubscriberRowAction,
  EmailSubscriberSortColumn,
} from '../../lib/admin-email-subscribers';

@Component({
  selector: 'app-admin-email-subscribers-panel',
  standalone: true,
  imports: [
    CommonModule,
    AdminEmailSubscribersToolbarComponent,
    AdminEmailSubscribersErrorBannerComponent,
    AdminEmailSubscribersSuccessBannerComponent,
    AdminEmailSubscribersCsvPanelComponent,
    AdminEmailSubscribersAddFormComponent,
    AdminEmailSubscribersListSearchComponent,
    AdminEmailSubscribersListComponent,
    AdminEmailSubscribersPaginationComponent,
    AdminEmailSubscriberEditModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-subscribers-panel.component.html',
})
export class AdminEmailSubscribersPanelComponent {
  @Input() showAddForm = false;
  @Input() showCSVUpload = false;
  @Input() error: string | null = null;
  @Input() csvSuccess: string | null = null;
  @Input() csvImportWarnings: string[] = [];
  @Input() searchQuery = '';
  @Input() searching = false;
  @Input() hasSearched = false;
  @Input() subscribers: EmailSubscriberRow[] = [];
  @Input() sortBy: EmailSubscriberSortColumn = 'last_activity_date';
  @Input() sortDirection: 'asc' | 'desc' = 'desc';
  @Input() showListPagination = false;
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() totalPages = 1;
  @Input() isFirstPage = true;
  @Input() isLastPage = true;
  @Input() paginationRange: number[] = [];
  @Input() activeCount = 0;
  @Input() editSubscriber: EmailSubscriberRow | null = null;

  @Output() toggleCsv = new EventEmitter<void>();
  @Output() toggleAdd = new EventEmitter<void>();
  @Output() csvUploaded = new EventEmitter<{
    successMessage: string;
    warnings: string[];
  }>();
  @Output() csvError = new EventEmitter<string>();
  @Output() subscriberAdded = new EventEmitter<{
    email: string;
    successMessage: string;
  }>();
  @Output() addFormCancel = new EventEmitter<void>();
  @Output() addFormError = new EventEmitter<string>();
  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() searchKeydown = new EventEmitter<KeyboardEvent>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() sortColumn = new EventEmitter<EmailSubscriberSortColumn>();
  @Output() rowAction = new EventEmitter<{
    subscriber: EmailSubscriberRow;
    action: EmailSubscriberRowAction;
  }>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() goToPage = new EventEmitter<number>();
  @Output() editSaved = new EventEmitter<{ id: string; name: string }>();
  @Output() editClosed = new EventEmitter<void>();

  @ViewChild('addFormRef')
  private addFormRef?: AdminEmailSubscribersAddFormComponent;
  @ViewChild('csvPanelRef')
  private csvPanelRef?: AdminEmailSubscribersCsvPanelComponent;

  resetAddForm(): void {
    this.addFormRef?.resetForm();
  }

  resetCsvPanel(): void {
    this.csvPanelRef?.reset();
  }

  showPlanningCenterTab(): void {
    this.addFormRef?.showPlanningCenterTab();
  }

  runPlanningCenterSearchTourDemo(): Promise<void> {
    return this.addFormRef?.runTourDemoSearch() ?? Promise.resolve();
  }

  selectTourPlanningCenterMatchFromDemoResults(): void {
    this.addFormRef?.selectTourDemoMatch();
  }

  applyTourDemoPlanningCenterAdd(): void {
    this.addFormRef?.applyTourDemoPlanningCenterAdd();
  }

  clearTourDemoForm(): void {
    this.addFormRef?.clearTourDemo();
  }
}
