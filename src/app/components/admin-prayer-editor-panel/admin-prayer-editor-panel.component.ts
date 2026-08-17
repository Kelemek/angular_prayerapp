import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPrayerEditorCreateBarComponent } from '../admin-prayer-editor-create-bar/admin-prayer-editor-create-bar.component';
import { AdminPrayerEditorCreateFormComponent } from '../admin-prayer-editor-create-form/admin-prayer-editor-create-form.component';
import { AdminPrayerEditorToolbarComponent } from '../admin-prayer-editor-toolbar/admin-prayer-editor-toolbar.component';
import { AdminPrayerEditorErrorBannerComponent } from '../admin-prayer-editor-error-banner/admin-prayer-editor-error-banner.component';
import { AdminPrayerEditorBulkBarComponent } from '../admin-prayer-editor-bulk-bar/admin-prayer-editor-bulk-bar.component';
import { AdminPrayerEditorResultsComponent } from '../admin-prayer-editor-results/admin-prayer-editor-results.component';
import { AdminPrayerEditorPaginationComponent } from '../admin-prayer-editor-pagination/admin-prayer-editor-pagination.component';
import { AdminPrayerEditorDeleteWarningComponent } from '../admin-prayer-editor-delete-warning/admin-prayer-editor-delete-warning.component';
import type {
  PrayerEditorCardAction,
  PrayerEditorEditForm,
  PrayerEditorEditUpdateForm,
  PrayerEditorNewUpdate,
  PrayerEditorPrayer,
} from '../../lib/admin-prayer-editor-types';

@Component({
  selector: 'app-admin-prayer-editor-panel',
  standalone: true,
  imports: [
    CommonModule,
    AdminPrayerEditorCreateBarComponent,
    AdminPrayerEditorCreateFormComponent,
    AdminPrayerEditorToolbarComponent,
    AdminPrayerEditorErrorBannerComponent,
    AdminPrayerEditorBulkBarComponent,
    AdminPrayerEditorResultsComponent,
    AdminPrayerEditorPaginationComponent,
    AdminPrayerEditorDeleteWarningComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-panel.component.html',
})
export class AdminPrayerEditorPanelComponent {
  @Input() creatingPrayer = false;
  @Input() searchTerm = '';
  @Input() searching = false;
  @Input() statusFilter = '';
  @Input() approvalFilter = '';
  @Input() error: string | null = null;
  @Input() displayPrayers: PrayerEditorPrayer[] = [];
  @Input() allPrayersCount = 0;
  @Input() selectedPrayers!: Set<string>;
  @Input() allDisplaySelected = false;
  @Input() bulkStatus = '';
  @Input() updatingStatus = false;
  @Input() deleting = false;
  @Input() expandedCards!: Set<string>;
  @Input() editingPrayer: string | null = null;
  @Input() addingUpdate: string | null = null;
  @Input() editForm!: PrayerEditorEditForm;
  @Input() newUpdate!: PrayerEditorNewUpdate;
  @Input() editUpdateForm!: PrayerEditorEditUpdateForm;
  @Input() editingUpdateId: string | null = null;
  @Input() saving = false;
  @Input() savingUpdate = false;
  @Input() savingEditUpdate = false;
  @Input() totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() totalPages = 1;
  @Input() isFirstPage = true;
  @Input() isLastPage = true;
  @Input() paginationRange: number[] = [];

  @Output() createPrayer = new EventEmitter<void>();
  @Output() cancelCreate = new EventEmitter<void>();
  @Output() prayerCreated = new EventEmitter<PrayerEditorPrayer>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() searchKeydown = new EventEmitter<KeyboardEvent>();
  @Output() clearSearch = new EventEmitter<void>();
  @Output() statusFilterChange = new EventEmitter<string>();
  @Output() approvalFilterChange = new EventEmitter<string>();
  @Output() toggleSelectAll = new EventEmitter<void>();
  @Output() bulkStatusChange = new EventEmitter<string>();
  @Output() updateSelected = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() cardAction = new EventEmitter<{
    prayer: PrayerEditorPrayer;
    action: PrayerEditorCardAction;
  }>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() previousPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() goToPage = new EventEmitter<number>();

  @ViewChild('createFormRef')
  private createFormRef?: AdminPrayerEditorCreateFormComponent;
  @ViewChild('resultsRef')
  private resultsRef?: AdminPrayerEditorResultsComponent;

  resetCreateForm(): void {
    this.createFormRef?.resetForm();
  }

  flushEditDescriptionForPrayer(prayerId: string): void {
    this.resultsRef?.flushEditDescriptionForPrayer(prayerId);
  }

  resetAddUpdateSubscriberPickForPrayer(prayerId: string): void {
    this.resultsRef?.resetAddUpdateSubscriberPickForPrayer(prayerId);
  }
}
