import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { AdminDataService } from '../../services/admin-data.service';
import { SendNotificationDialogComponent } from '../send-notification-dialog/send-notification-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { AdminEmailSubscribersCsvPanelComponent } from '../admin-email-subscribers-csv-panel/admin-email-subscribers-csv-panel.component';
import { AdminEmailSubscribersAddFormComponent } from '../admin-email-subscribers-add-form/admin-email-subscribers-add-form.component';
import { AdminEmailSubscriberEditModalComponent } from '../admin-email-subscriber-edit-modal/admin-email-subscriber-edit-modal.component';
import { AdminEmailSubscriberRowComponent } from '../admin-email-subscriber-row/admin-email-subscriber-row.component';
import {
  escapeEmailSubscriberIlikePattern,
  EMAIL_SUBSCRIBER_LIST_SEARCH_DEBOUNCE_MS,
  EMAIL_SUBSCRIBER_LIST_SEARCH_MIN_CHARS,
  type EmailSubscriberRow,
  type EmailSubscriberRowAction,
  type EmailSubscriberSortColumn,
} from '../../lib/admin-email-subscribers';

@Component({
  selector: 'app-email-subscribers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SendNotificationDialogComponent,
    ConfirmationDialogComponent,
    AdminEmailSubscribersCsvPanelComponent,
    AdminEmailSubscribersAddFormComponent,
    AdminEmailSubscriberEditModalComponent,
    AdminEmailSubscriberRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-subscribers.component.html',
  styles: [`:host { display: block; }`],
})
export class EmailSubscribersComponent implements OnInit, OnDestroy {
  subscribers: EmailSubscriberRow[] = [];
  searchQuery = '';
  searching = false;
  hasSearched = false;

  readonly listSearchMinChars = EMAIL_SUBSCRIBER_LIST_SEARCH_MIN_CHARS;
  readonly listSearchDebounceMs = EMAIL_SUBSCRIBER_LIST_SEARCH_DEBOUNCE_MS;
  private listSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  showAddForm = false;
  showCSVUpload = false;
  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  error: string | null = null;
  csvSuccess: string | null = null;
  csvImportWarnings: string[] = [];

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalActiveCount = 0;
  allSubscribers: EmailSubscriberRow[] = [];
  maxPaginationButtons = 3;
  private breakpointSub: Subscription | null = null;

  sortBy: EmailSubscriberSortColumn = 'last_activity_date';
  sortDirection: 'asc' | 'desc' = 'desc';

  showSendWelcomeEmailDialog = false;
  pendingSubscriberEmail = '';

  showConfirmationDialog = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationDetails: string | null = null;
  confirmationAction: (() => Promise<void>) | null = null;
  isDeleteConfirmation = false;
  confirmationConfirmText = 'Confirm';

  editSubscriber: EmailSubscriberRow | null = null;

  isLandscape = false;
  private orientationChangeListener: (() => void) | null = null;
  private resizeListener: (() => void) | null = null;

  @ViewChild('emailSubscribersContainer') emailSubscribersContainer!: ElementRef;
  @ViewChild('addFormRef') addFormRef?: AdminEmailSubscribersAddFormComponent;
  @ViewChild('csvPanelRef') csvPanelRef?: AdminEmailSubscribersCsvPanelComponent;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private adminDataService: AdminDataService,
    private breakpointObserver: BreakpointObserver,
  ) {}

  ngOnInit() {
    // Fewer pagination buttons on small screens so they don't overflow
    this.breakpointSub = this.breakpointObserver
      .observe('(max-width: 640px)')
      .subscribe(state => {
        this.maxPaginationButtons = state.matches ? 3 : 5;
        this.cdr.markForCheck();
      });
    
    // Detect landscape/portrait mode on init
    this.updateOrientationMode();
    
    // Create arrow functions so we can properly remove them later
    this.orientationChangeListener = () => this.onOrientationChange();
    this.resizeListener = () => this.updateOrientationMode();
    
    // Listen for orientation change events
    window.addEventListener('orientationchange', this.orientationChangeListener);
    // Also listen for resize events for broader compatibility
    window.addEventListener('resize', this.resizeListener);
  }

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.handleSearch();
    }
    this.cdr.markForCheck();
  }

  ngOnDestroy() {
    this.breakpointSub?.unsubscribe();
    if (this.listSearchDebounceTimer) {
      clearTimeout(this.listSearchDebounceTimer);
      this.listSearchDebounceTimer = null;
    }
    if (this.orientationChangeListener) {
      window.removeEventListener('orientationchange', this.orientationChangeListener);
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  onListSearchQueryChange(value: string): void {
    if (this.listSearchDebounceTimer) {
      clearTimeout(this.listSearchDebounceTimer);
      this.listSearchDebounceTimer = null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      this.listSearchDebounceTimer = setTimeout(() => {
        this.listSearchDebounceTimer = null;
        void this.handleSearch();
      }, this.listSearchDebounceMs);
      return;
    }
    if (trimmed.length < this.listSearchMinChars) {
      this.cdr.markForCheck();
      return;
    }

    this.listSearchDebounceTimer = setTimeout(() => {
      this.listSearchDebounceTimer = null;
      void this.handleSearch();
    }, this.listSearchDebounceMs);
  }

  onListSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.flushListSearchNow();
    }
  }

  flushListSearchNow(): void {
    if (this.listSearchDebounceTimer) {
      clearTimeout(this.listSearchDebounceTimer);
      this.listSearchDebounceTimer = null;
    }
    const trimmed = this.searchQuery.trim();
    if (trimmed.length > 0 && trimmed.length < this.listSearchMinChars) {
      this.cdr.markForCheck();
      return;
    }
    void this.handleSearch();
  }

  clearListSearch(): void {
    if (this.listSearchDebounceTimer) {
      clearTimeout(this.listSearchDebounceTimer);
      this.listSearchDebounceTimer = null;
    }
    this.searchQuery = '';
    void this.handleSearch();
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.showCSVUpload = false;
    this.error = null;
    this.csvSuccess = null;
    if (!this.showAddForm) {
      this.addFormRef?.resetForm();
    }
    this.cdr.markForCheck();
  }

  onChildError(message: string): void {
    this.error = message || null;
    this.cdr.markForCheck();
  }

  onCsvUploaded(result: { successMessage: string; warnings: string[] }): void {
    this.csvSuccess = result.successMessage;
    this.csvImportWarnings = result.warnings;
    this.showCSVUpload = false;
    void this.handleSearch({ preserveCsvSuccess: true });
    this.cdr.markForCheck();
  }

  onSubscriberAdded(event: { email: string; successMessage: string }): void {
    this.csvSuccess = event.successMessage;
    this.pendingSubscriberEmail = event.email;
    this.showSendWelcomeEmailDialog = true;
    this.showAddForm = false;
    void this.handleSearch({ preserveCsvSuccess: true });
    this.cdr.markForCheck();
  }

  onRowAction(subscriber: EmailSubscriberRow, action: EmailSubscriberRowAction): void {
    switch (action.type) {
      case 'toggleActive':
        void this.handleToggleActive(subscriber.id, subscriber.is_active);
        break;
      case 'toggleReceivePush':
        void this.handleToggleReceivePush(subscriber.id, subscriber.receive_push ?? false);
        break;
      case 'toggleBlocked':
        void this.handleToggleBlocked(subscriber.id, subscriber.is_blocked);
        break;
      case 'edit':
        this.openEditSubscriberModal(subscriber);
        break;
      case 'delete':
        void this.handleDelete(subscriber.id, subscriber.email);
        break;
      default: {
        const _exhaustive: never = action;
        return _exhaustive;
      }
    }
  }

  onEditSaved(event: { id: string; name: string }): void {
    const sub = this.allSubscribers.find((s) => s.id === event.id);
    if (sub) {
      sub.name = event.name;
    }
    this.loadPageData();
    this.closeEditSubscriberModal();
  }

  /** Admin help tour: expand section and close add form so driver steps match the DOM. */
  prepareTourInitialState(): void {
    this.sectionExpanded = true;
    this.showAddForm = false;
    this.showCSVUpload = false;
    this.addFormRef?.resetForm();
    this.cdr.markForCheck();
  }

  private onOrientationChange(): void {
    setTimeout(() => {
      this.updateOrientationMode();
    }, 100);
  }

  private updateOrientationMode(): void {
    this.isLandscape = window.innerWidth > window.innerHeight;
    this.cdr.markForCheck();
  }

  async prepareOverviewTourListState(): Promise<void> {
    this.prepareTourInitialState();
    if (!this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
    }
    this.searchQuery = 'app-test';
    if (this.listSearchDebounceTimer) {
      clearTimeout(this.listSearchDebounceTimer);
      this.listSearchDebounceTimer = null;
    }
    await this.handleSearch();
    this.cdr.markForCheck();
  }

  openAddFormForTour(): void {
    this.showAddForm = true;
    this.showCSVUpload = false;
    this.error = null;
    this.cdr.markForCheck();
  }

  showPlanningCenterTabForTour(): void {
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

  clearEmailSubscribersTourDemoForm(): void {
    this.addFormRef?.clearTourDemo();
    this.error = null;
    this.cdr.markForCheck();
  }

  toggleCSVUpload(): void {
    this.showCSVUpload = !this.showCSVUpload;
    this.showAddForm = false;
    this.error = null;
    this.csvSuccess = null;
    if (!this.showCSVUpload) {
      this.csvPanelRef?.reset();
    }
    this.cdr.markForCheck();
  }

  openEditSubscriberModal(subscriber: EmailSubscriberRow): void {
    this.editSubscriber = subscriber;
    this.cdr.markForCheck();
  }

  closeEditSubscriberModal(): void {
    this.editSubscriber = null;
    this.cdr.markForCheck();
  }

  async handleSearch(options?: { preserveCsvSuccess?: boolean }) {
    try {
      this.searching = true;
      this.error = null;
      if (!options?.preserveCsvSuccess) {
        this.csvSuccess = null;
      }
      this.currentPage = 1; // Reset to first page on new search
      this.cdr.markForCheck();

      // Build query without caching
      let query = this.supabase.client
        .from('email_subscribers')
        .select('*', { count: 'exact' })
        .order(this.sortBy, { ascending: this.sortDirection === 'asc' });

      const trimmedQuery = this.searchQuery.trim();
      if (trimmedQuery) {
        const escaped = escapeEmailSubscriberIlikePattern(trimmedQuery);
        const pattern = `%${escaped}%`;
        query = query.or(`email.ilike.${pattern},name.ilike.${pattern}`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching subscribers:', error);
        throw error;
      }

      this.allSubscribers = data || [];
      this.totalItems = count || 0;
      this.totalActiveCount = this.allSubscribers.filter(s => s.is_active).length;
      this.hasSearched = true;
      this.sortSubscribers();
      this.loadPageData();
      console.log('Loaded subscribers:', this.allSubscribers.length);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error:', error);
      this.error = error instanceof Error ? error.message : 'Failed to fetch subscribers';
      this.sectionExpanded = true;
      this.subscribers = [];
      this.totalItems = 0;
      this.totalActiveCount = 0;
      this.cdr.markForCheck();
    } finally {
      this.searching = false;
    }
  }

  toggleSort(column: EmailSubscriberSortColumn) {
    // If clicking the same column, toggle direction; otherwise set new column
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      // Default to descending for Activity column (newest first), ascending for others
      this.sortDirection = column === 'last_activity_date' ? 'desc' : 'asc';
    }
    this.currentPage = 1; // Reset to first page
    this.sortSubscribers();
    this.loadPageData();
    this.cdr.markForCheck();
  }

  /** Parse date/time for sorting; returns numeric timestamp (invalid/empty → 0). */
  private sortDateMs(value: string | null | undefined): number {
    if (value == null || value === '') return 0;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  sortSubscribers() {
    this.allSubscribers.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (this.sortBy) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
        case 'created_at':
          aVal = this.sortDateMs(a.created_at);
          bVal = this.sortDateMs(b.created_at);
          break;
        case 'last_activity_date':
          aVal = this.sortDateMs(a.last_activity_date);
          bVal = this.sortDateMs(b.last_activity_date);
          break;
        case 'is_active':
          aVal = a.is_active ? 1 : 0;
          bVal = b.is_active ? 1 : 0;
          break;
        case 'receive_push':
          aVal = (a.receive_push ?? false) ? 1 : 0;
          bVal = (b.receive_push ?? false) ? 1 : 0;
          break;
        case 'is_blocked':
          aVal = a.is_blocked ? 1 : 0;
          bVal = b.is_blocked ? 1 : 0;
          break;
        case 'in_planning_center':
          aVal = a.in_planning_center === true ? 1 : a.in_planning_center === false ? 0 : -1;
          bVal = b.in_planning_center === true ? 1 : b.in_planning_center === false ? 0 : -1;
          break;
      }

      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getSortIndicator(column: string): string {
    if (this.sortBy !== column) return '';
    return this.sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

  loadPageData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.subscribers = this.allSubscribers.slice(startIndex, endIndex);
    this.cdr.markForCheck();
  }

  goToPage(page: number) {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
      this.loadPageData();
      
      // Scroll the Email Subscribers container to the top of the window
      if (this.emailSubscribersContainer) {
        setTimeout(() => {
          const containerTop = this.emailSubscribersContainer.nativeElement.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: containerTop, behavior: 'smooth' });
        }, 0);
      }
    }
  }

  changePageSize() {
    this.currentPage = 1;
    this.loadPageData();
    this.cdr.markForCheck();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.currentPage < totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get isFirstPage(): boolean {
    return this.currentPage === 1;
  }

  get isLastPage(): boolean {
    return this.currentPage === this.totalPages;
  }

  getPaginationRange(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = this.maxPaginationButtons;
    const totalPages = this.totalPages;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxPagesToShow / 2);
      let start = Math.max(1, this.currentPage - half);
      let end = Math.min(totalPages, start + maxPagesToShow - 1);
      if (end - start + 1 < maxPagesToShow) {
        start = Math.max(1, end - maxPagesToShow + 1);
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  }

  readonly Math = Math;

  /** Enter in manual name/email fields submits (same as Add Subscriber). */
  async handleToggleActive(id: string, currentStatus: boolean) {
    try {
      // Fetch subscriber to get their email for the confirmation dialog
      const { data: subscriber, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!subscriber) throw new Error('Subscriber not found');

      // Show confirmation dialog
      this.confirmationTitle = currentStatus ? 'Deactivate Subscriber' : 'Activate Subscriber';
      this.confirmationMessage = currentStatus 
        ? `Are you sure you want to stop sending email notifications to ${subscriber.email}?`
        : `Are you sure you want to start sending email notifications to ${subscriber.email}?`;
      this.confirmationDetails = currentStatus 
        ? 'This user will no longer receive prayer request emails.'
        : 'This user will begin receiving prayer request emails again.';
      this.confirmationConfirmText = currentStatus ? 'Deactivate' : 'Activate';
      this.isDeleteConfirmation = false;

      this.confirmationAction = async () => {
        try {
          const { error } = await this.supabase.client
            .from('email_subscribers')
            .update({ is_active: !currentStatus })
            .eq('id', id);

          if (error) throw error;

          this.toast.success(currentStatus ? 'Subscriber deactivated' : 'Subscriber activated');
          
          // Update the local data instead of resetting pagination
          const sub = this.allSubscribers.find(s => s.id === id);
          if (sub) {
            sub.is_active = !currentStatus;
            this.totalActiveCount = this.allSubscribers.filter(s => s.is_active).length;
            this.cdr.markForCheck();
          }
        } catch (err: any) {
          console.error('Error toggling subscriber status:', err);
          this.toast.error('Failed to update subscriber status');
        }
      };

      this.showConfirmationDialog = true;
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error preparing status toggle action:', err);
      this.toast.error('Failed to prepare status toggle action');
    }
  }

  async handleToggleReceivePush(id: string, currentReceivePush: boolean) {
    try {
      const { data: subscriber, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!subscriber) throw new Error('Subscriber not found');

      this.confirmationTitle = currentReceivePush ? 'Disable push notifications' : 'Enable push notifications';
      this.confirmationMessage = currentReceivePush
        ? `Stop sending push notifications to ${subscriber.email}?`
        : `Start sending push notifications to ${subscriber.email}?`;
      this.confirmationDetails = currentReceivePush
        ? 'This user will no longer receive push notifications on their devices.'
        : 'This user will receive push notifications on their devices.';
      this.confirmationConfirmText = currentReceivePush ? 'Disable' : 'Enable';
      this.isDeleteConfirmation = false;

      this.confirmationAction = async () => {
        try {
          const { error } = await this.supabase.client
            .from('email_subscribers')
            .update({ receive_push: !currentReceivePush })
            .eq('id', id);

          if (error) throw error;

          this.toast.success(currentReceivePush ? 'Push notifications disabled' : 'Push notifications enabled');

          const sub = this.allSubscribers.find(s => s.id === id);
          if (sub) {
            sub.receive_push = !currentReceivePush;
            this.cdr.markForCheck();
          }
        } catch (err: any) {
          console.error('Error toggling receive_push:', err);
          this.toast.error('Failed to update push notification preference');
        }
      };

      this.showConfirmationDialog = true;
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error preparing push toggle action:', err);
      this.toast.error('Failed to prepare push toggle action');
    }
  }

  async handleToggleBlocked(id: string, currentStatus: boolean) {
    // Fetch subscriber to get their email for the confirmation dialog
    try {
      const { data: subscriber, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!subscriber) throw new Error('Subscriber not found');

      // Show confirmation dialog
      this.confirmationTitle = currentStatus ? 'Unblock User' : 'Block User';
      
      if (currentStatus) {
        // Unblocking
        this.confirmationMessage = `Unblock ${subscriber.email}?`;
        this.confirmationDetails = 'This user will be able to log in to the site again.';
        this.confirmationConfirmText = 'Unblock';
      } else {
        // Blocking
        this.confirmationMessage = `Block ${subscriber.email}?`;
        this.confirmationDetails = 'This user will not be able to log in to the site.';
        this.confirmationConfirmText = 'Block';
      }

      this.isDeleteConfirmation = !currentStatus; // Mark as dangerous if blocking
      this.confirmationAction = async () => {
        try {
          const { error } = await this.supabase.client
            .from('email_subscribers')
            .update({ is_blocked: !currentStatus })
            .eq('id', id);

          if (error) throw error;

          this.toast.success(currentStatus ? 'User unblocked - login enabled' : 'User blocked - login disabled');
          
          // Update the local data instead of resetting pagination
          const sub = this.allSubscribers.find(s => s.id === id);
          if (sub) {
            sub.is_blocked = !currentStatus;
            this.cdr.markForCheck();
          }
        } catch (err: any) {
          console.error('Error toggling user blocked status:', err);
          this.toast.error('Failed to update user blocked status');
        }
      };

      this.showConfirmationDialog = true;
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error preparing block action:', err);
      this.toast.error('Failed to prepare block action');
    }
  }

  async handleDelete(id: string, email: string) {
    // Fetch subscriber to check if admin
    try {
      const { data: subscriber, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('is_admin')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Show confirmation dialog
      this.confirmationTitle = 'Remove Subscriber';
      
      if (subscriber?.is_admin) {
        this.confirmationMessage = `Are you sure you want to remove ${email} from the subscriber list?`;
        this.confirmationDetails = 'This admin will be unsubscribed from emails but will retain admin access to the portal.';
      } else {
        this.confirmationMessage = `Are you sure you want to remove ${email} from the subscriber list?`;
        this.confirmationDetails = 'This action will permanently delete the subscriber record.';
      }

      this.isDeleteConfirmation = true;
      this.confirmationConfirmText = 'Delete';
      this.confirmationAction = async () => {
        try {
          if (subscriber?.is_admin) {
            const { error: updateError } = await this.supabase.client
              .from('email_subscribers')
              .update({ is_active: false })
              .eq('id', id);

            if (updateError) throw updateError;
            this.csvSuccess = `Admin ${email} has been unsubscribed from emails but retains admin access to the portal.`;
            
            // Update the local data instead of resetting pagination
            const sub = this.allSubscribers.find(s => s.id === id);
            if (sub) {
              sub.is_active = false;
              this.totalActiveCount = this.allSubscribers.filter(s => s.is_active).length;
            }
            // Reload the current page data to update display
            this.loadPageData();
          } else {
            const { error } = await this.supabase.client
              .from('email_subscribers')
              .delete()
              .eq('id', id);

            if (error) throw error;
            this.toast.success('Subscriber removed');
            
            // Update the local data instead of resetting pagination
            this.allSubscribers = this.allSubscribers.filter(s => s.id !== id);
            this.totalItems = this.allSubscribers.length;
            // If current page is now empty, go to previous page
            const startIndex = (this.currentPage - 1) * this.pageSize;
            if (startIndex >= this.allSubscribers.length && this.currentPage > 1) {
              this.currentPage--;
            }
            // Reload the current page data to update display
            this.loadPageData();
          }

          this.cdr.markForCheck();
        } catch (err: any) {
          console.error('Error removing subscriber:', err);
          this.error = err.message || 'Failed to remove subscriber';
          this.cdr.markForCheck();
        }
      };

      this.showConfirmationDialog = true;
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error preparing delete:', err);
      this.error = err.message || 'Failed to prepare deletion';
      this.cdr.markForCheck();
    }
  }

  getActiveCount(): number {
    return this.totalActiveCount;
  }

  /**
   * Handle send welcome email confirmation
   */
  async onConfirmSendWelcomeEmail() {
    try {
      if (!this.pendingSubscriberEmail) {
        return;
      }

      // Send the welcome email
      await this.adminDataService.sendSubscriberWelcomeEmail(this.pendingSubscriberEmail);
      this.toast.success('Welcome email sent to subscriber');
      
      this.showSendWelcomeEmailDialog = false;
      this.showAddForm = false;
      this.pendingSubscriberEmail = '';
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Error sending welcome email:', error);
      this.toast.error('Failed to send welcome email');
    }
  }

  /**
   * Handle decline sending welcome email
   */
  onDeclineSendWelcomeEmail() {
    this.showSendWelcomeEmailDialog = false;
    this.showAddForm = false;
    this.pendingSubscriberEmail = '';
    this.cdr.markForCheck();
  }

  /**
   * Handle confirmation dialog confirm
   */
  async onConfirmDialog() {
    if (this.confirmationAction) {
      await this.confirmationAction();
    }
    this.showConfirmationDialog = false;
    this.confirmationAction = null;
    this.isDeleteConfirmation = false;
    this.cdr.markForCheck();
  }

  /**
   * Handle confirmation dialog cancel
   */
  onCancelDialog() {
    this.showConfirmationDialog = false;
    this.confirmationAction = null;
    this.isDeleteConfirmation = false;
    this.cdr.markForCheck();
  }
}
