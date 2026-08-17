import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { AdminDataService } from '../services/admin-data.service';
import type { EmailSubscriberConfirmationAction, EmailSubscriberConfirmationDialogState } from './admin-email-subscribers-confirmations';
import type {
  EmailSubscriberRow,
  EmailSubscriberRowAction,
  EmailSubscriberSortColumn,
} from './admin-email-subscribers';
import {
  EmailSubscriberListSearchDebouncer,
  EMAIL_SUBSCRIBER_LIST_SEARCH_CONFIG,
} from './admin-email-subscribers-search-debounce';
import {
  fetchEmailSubscriberList,
  loadEmailSubscriberAdminFlag,
  loadEmailSubscriberEmail,
} from './admin-email-subscribers-fetch';
import {
  commandDeleteEmailSubscriber,
  commandSetEmailSubscriberActive,
  commandSetEmailSubscriberBlocked,
  commandSetEmailSubscriberReceivePush,
  commandUnsubscribeAdminEmailSubscriber,
} from './admin-email-subscribers-commands';
import {
  buildEmailSubscriberActiveToggleConfirmation,
  buildEmailSubscriberBlockedToggleConfirmation,
  buildEmailSubscriberDeleteConfirmation,
  buildEmailSubscriberPushToggleConfirmation,
} from './admin-email-subscribers-confirmations';
import { dispatchEmailSubscriberRowAction } from './admin-email-subscribers-row-dispatch';
import {
  patchEmailSubscriberActive,
  patchEmailSubscriberBlocked,
  patchEmailSubscriberName,
  patchEmailSubscriberReceivePush,
  removeEmailSubscriberFromList,
} from './admin-email-subscribers-list-patches';
import {
  emailSubscriberPageAfterDelete,
  emailSubscriberPaginationRange,
  emailSubscriberTotalPages,
  scrollEmailSubscribersSectionToTop,
  sliceEmailSubscriberPage,
} from './admin-email-subscribers-pagination';
import {
  countActiveEmailSubscribers,
  nextEmailSubscriberSort,
  sortEmailSubscriberRows,
} from './admin-email-subscribers-sort';

export interface EmailSubscribersPanelHostRef {
  resetAddForm(): void;
  resetCsvPanel(): void;
  showPlanningCenterTab(): void;
  runPlanningCenterSearchTourDemo(): Promise<void>;
  selectTourPlanningCenterMatchFromDemoResults(): void;
  applyTourDemoPlanningCenterAdd(): void;
  clearTourDemoForm(): void;
}

export interface EmailSubscribersDialogsHostRef {
  openWelcomeEmailDialog(): void;
  closeWelcomeEmailDialog(): void;
  openConfirmation(
    state: EmailSubscriberConfirmationDialogState,
    action: EmailSubscriberConfirmationAction,
  ): void;
}

export interface EmailSubscribersSectionHostRef {
  containerElement?: HTMLElement;
}

export interface EmailSubscribersFacadeDeps {
  supabase: SupabaseService;
  toast: ToastService;
  adminDataService: AdminDataService;
  markForCheck: () => void;
}

export class EmailSubscribersFacade {
  subscribers: EmailSubscriberRow[] = [];
  searchQuery = '';
  searching = false;
  hasSearched = false;

  readonly listSearchMinChars = EMAIL_SUBSCRIBER_LIST_SEARCH_CONFIG.minChars;
  readonly listSearchDebounceMs = EMAIL_SUBSCRIBER_LIST_SEARCH_CONFIG.debounceMs;
  private readonly listSearchDebouncer = new EmailSubscriberListSearchDebouncer(
    EMAIL_SUBSCRIBER_LIST_SEARCH_CONFIG.debounceMs,
    () => void this.handleSearch(),
  );

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
  sortBy: EmailSubscriberSortColumn = 'last_activity_date';
  sortDirection: 'asc' | 'desc' = 'desc';

  pendingSubscriberEmail = '';
  editSubscriber: EmailSubscriberRow | null = null;

  isLandscape = false;
  private orientationChangeListener: (() => void) | null = null;
  private resizeListener: (() => void) | null = null;

  protected readonly supabase: SupabaseService;
  protected readonly toast: ToastService;
  protected readonly adminDataService: AdminDataService;
  protected readonly markForCheck: () => void;

  constructor(deps: EmailSubscribersFacadeDeps) {
    this.supabase = deps.supabase;
    this.toast = deps.toast;
    this.adminDataService = deps.adminDataService;
    this.markForCheck = deps.markForCheck;
  }

  protected get sectionHost(): EmailSubscribersSectionHostRef | undefined {
    return (this as { sectionRef?: EmailSubscribersSectionHostRef }).sectionRef;
  }

  protected get panelHost(): EmailSubscribersPanelHostRef | undefined {
    return (this as { panelRef?: EmailSubscribersPanelHostRef }).panelRef;
  }

  protected get dialogsHost(): EmailSubscribersDialogsHostRef | undefined {
    return (this as { dialogsRef?: EmailSubscribersDialogsHostRef }).dialogsRef;
  }

  initOrientationTracking(): void {
    this.updateOrientationMode();
    this.orientationChangeListener = () => this.onOrientationChange();
    this.resizeListener = () => this.updateOrientationMode();
    window.addEventListener('orientationchange', this.orientationChangeListener);
    window.addEventListener('resize', this.resizeListener);
  }

  destroyOrientationTracking(): void {
    if (this.orientationChangeListener) {
      window.removeEventListener(
        'orientationchange',
        this.orientationChangeListener,
      );
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  destroySearchDebouncer(): void {
    this.listSearchDebouncer.destroy();
  }

        get totalPages(): number {
    return emailSubscriberTotalPages(this.totalItems, this.pageSize);
  }

  get isFirstPage(): boolean {
    return this.currentPage === 1;
  }

  get isLastPage(): boolean {
    return this.currentPage >= this.totalPages;
  }

  get paginationRange(): number[] {
    return emailSubscriberPaginationRange(
      this.currentPage,
      this.totalPages,
      this.maxPaginationButtons,
    );
  }

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.handleSearch();
    }
    this.markForCheck();
  }

    onListSearchQueryChange(value: string): void {
    this.searchQuery = value;
    this.listSearchDebouncer.schedule(
      value.trim(),
      this.listSearchMinChars,
      () => this.markForCheck(),
    );
  }

  onListSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.flushListSearchNow();
    }
  }

  flushListSearchNow(): void {
    this.listSearchDebouncer.flush(
      this.searchQuery.trim(),
      this.listSearchMinChars,
      () => this.markForCheck(),
    );
  }

  clearListSearch(): void {
    this.listSearchDebouncer.clear();
    this.searchQuery = '';
    void this.handleSearch();
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.showCSVUpload = false;
    this.error = null;
    this.csvSuccess = null;
    if (!this.showAddForm) {
      this.panelHost?.resetAddForm();
    }
    this.markForCheck();
  }

  onChildError(message: string): void {
    this.error = message || null;
    this.markForCheck();
  }

  onCsvUploaded(result: { successMessage: string; warnings: string[] }): void {
    this.csvSuccess = result.successMessage;
    this.csvImportWarnings = result.warnings;
    this.showCSVUpload = false;
    void this.handleSearch({ preserveCsvSuccess: true });
    this.markForCheck();
  }

  onSubscriberAdded(event: { email: string; successMessage: string }): void {
    this.csvSuccess = event.successMessage;
    this.pendingSubscriberEmail = event.email;
    this.dialogsHost?.openWelcomeEmailDialog();
    this.showAddForm = false;
    void this.handleSearch({ preserveCsvSuccess: true });
    this.markForCheck();
  }

  onRowAction(
    subscriber: EmailSubscriberRow,
    action: EmailSubscriberRowAction,
  ): void {
    dispatchEmailSubscriberRowAction(subscriber, action, {
      toggleActive: (id, currentActive) =>
        void this.handleToggleActive(id, currentActive),
      toggleReceivePush: (id, current) =>
        void this.handleToggleReceivePush(id, current),
      toggleBlocked: (id, current) => void this.handleToggleBlocked(id, current),
      edit: (row) => this.openEditSubscriberModal(row),
      delete: (id, email) => void this.handleDelete(id, email),
    });
  }

  onEditSaved(event: { id: string; name: string }): void {
    this.allSubscribers = patchEmailSubscriberName(
      this.allSubscribers,
      event.id,
      event.name,
    );
    this.loadPageData();
    this.closeEditSubscriberModal();
  }

  prepareTourInitialState(): void {
    this.sectionExpanded = true;
    this.showAddForm = false;
    this.showCSVUpload = false;
    this.panelHost?.resetAddForm();
    this.markForCheck();
  }

  private onOrientationChange(): void {
    setTimeout(() => this.updateOrientationMode(), 100);
  }

  private updateOrientationMode(): void {
    this.isLandscape = window.innerWidth > window.innerHeight;
    this.markForCheck();
  }

  async prepareOverviewTourListState(): Promise<void> {
    this.prepareTourInitialState();
    if (!this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
    }
    this.searchQuery = 'app-test';
    this.listSearchDebouncer.clear();
    await this.handleSearch();
    this.markForCheck();
  }

  openAddFormForTour(): void {
    this.showAddForm = true;
    this.showCSVUpload = false;
    this.error = null;
    this.markForCheck();
  }

  showPlanningCenterTabForTour(): void {
    this.panelHost?.showPlanningCenterTab();
  }

  runPlanningCenterSearchTourDemo(): Promise<void> {
    return this.panelHost?.runPlanningCenterSearchTourDemo() ?? Promise.resolve();
  }

  selectTourPlanningCenterMatchFromDemoResults(): void {
    this.panelHost?.selectTourPlanningCenterMatchFromDemoResults();
  }

  applyTourDemoPlanningCenterAdd(): void {
    this.panelHost?.applyTourDemoPlanningCenterAdd();
  }

  clearEmailSubscribersTourDemoForm(): void {
    this.panelHost?.clearTourDemoForm();
    this.error = null;
    this.markForCheck();
  }

  toggleCSVUpload(): void {
    this.showCSVUpload = !this.showCSVUpload;
    this.showAddForm = false;
    this.error = null;
    this.csvSuccess = null;
    if (!this.showCSVUpload) {
      this.panelHost?.resetCsvPanel();
    }
    this.markForCheck();
  }

  openEditSubscriberModal(subscriber: EmailSubscriberRow): void {
    this.editSubscriber = subscriber;
    this.markForCheck();
  }

  closeEditSubscriberModal(): void {
    this.editSubscriber = null;
    this.markForCheck();
  }

  async handleSearch(options?: { preserveCsvSuccess?: boolean }) {
    try {
      this.searching = true;
      this.error = null;
      if (!options?.preserveCsvSuccess) {
        this.csvSuccess = null;
      }
      this.currentPage = 1;
      this.markForCheck();

      const { rows, count } = await fetchEmailSubscriberList(
        this.supabase.client,
        {
          searchQuery: this.searchQuery,
          sortBy: this.sortBy,
          sortDirection: this.sortDirection,
        },
      );

      this.allSubscribers = sortEmailSubscriberRows(
        rows,
        this.sortBy,
        this.sortDirection,
      );
      this.totalItems = count;
      this.totalActiveCount = countActiveEmailSubscribers(this.allSubscribers);
      this.hasSearched = true;
      this.loadPageData();
      this.markForCheck();
    } catch (error) {
      console.error('Error:', error);
      this.error =
        error instanceof Error ? error.message : 'Failed to fetch subscribers';
      this.sectionExpanded = true;
      this.subscribers = [];
      this.totalItems = 0;
      this.totalActiveCount = 0;
      this.markForCheck();
    } finally {
      this.searching = false;
      this.markForCheck();
    }
  }

  toggleSort(column: EmailSubscriberSortColumn) {
    const next = nextEmailSubscriberSort(
      this.sortBy,
      this.sortDirection,
      column,
    );
    this.sortBy = next.sortBy;
    this.sortDirection = next.sortDirection;
    this.currentPage = 1;
    this.allSubscribers = sortEmailSubscriberRows(
      this.allSubscribers,
      this.sortBy,
      this.sortDirection,
    );
    this.loadPageData();
    this.markForCheck();
  }

  loadPageData() {
    this.subscribers = sliceEmailSubscriberPage(
      this.allSubscribers,
      this.currentPage,
      this.pageSize,
    );
    this.markForCheck();
  }

  goToPage(page: number) {
    const totalPages = this.totalPages;
    if (page < 1 || page > totalPages) {
      return;
    }
    this.currentPage = page;
    this.loadPageData();

    const container = this.sectionHost?.containerElement;
    if (container) {
      scrollEmailSubscribersSectionToTop(container);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.changePageSize();
  }

  changePageSize() {
    this.currentPage = 1;
    this.loadPageData();
    this.markForCheck();
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  async handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const email = await loadEmailSubscriberEmail(this.supabase.client, id);
      this.dialogsHost?.openConfirmation(
        buildEmailSubscriberActiveToggleConfirmation(email, currentStatus),
        {
          kind: 'toggleActive',
          id,
          currentActive: currentStatus,
        },
      );
    } catch (err: unknown) {
      console.error('Error preparing status toggle action:', err);
      this.toast.error('Failed to prepare status toggle action');
    }
  }

  async handleToggleReceivePush(id: string, currentReceivePush: boolean) {
    try {
      const email = await loadEmailSubscriberEmail(this.supabase.client, id);
      this.dialogsHost?.openConfirmation(
        buildEmailSubscriberPushToggleConfirmation(email, currentReceivePush),
        {
          kind: 'toggleReceivePush',
          id,
          currentReceivePush,
        },
      );
    } catch (err: unknown) {
      console.error('Error preparing push toggle action:', err);
      this.toast.error('Failed to prepare push toggle action');
    }
  }

  async handleToggleBlocked(id: string, currentStatus: boolean) {
    try {
      const email = await loadEmailSubscriberEmail(this.supabase.client, id);
      this.dialogsHost?.openConfirmation(
        buildEmailSubscriberBlockedToggleConfirmation(email, currentStatus),
        {
          kind: 'toggleBlocked',
          id,
          currentBlocked: currentStatus,
        },
      );
    } catch (err: unknown) {
      console.error('Error preparing block action:', err);
      this.toast.error('Failed to prepare block action');
    }
  }

  async handleDelete(id: string, email: string) {
    try {
      const isAdmin = await loadEmailSubscriberAdminFlag(
        this.supabase.client,
        id,
      );
      this.dialogsHost?.openConfirmation(
        buildEmailSubscriberDeleteConfirmation(email, isAdmin),
        {
          kind: 'delete',
          id,
          email,
          isAdmin,
        },
      );
    } catch (err: unknown) {
      console.error('Error preparing delete:', err);
      this.error =
        err instanceof Error ? err.message : 'Failed to prepare deletion';
      this.markForCheck();
    }
  }

  async onConfirmationConfirmed(
    action: EmailSubscriberConfirmationAction,
  ): Promise<void> {
    const client = this.supabase.client;
    try {
      switch (action.kind) {
        case 'toggleActive': {
          await commandSetEmailSubscriberActive(
            client,
            action.id,
            !action.currentActive,
          );
          const activePatch = patchEmailSubscriberActive(
            this.allSubscribers,
            action.id,
            !action.currentActive,
          );
          this.allSubscribers = activePatch.rows;
          this.totalActiveCount = activePatch.totalActiveCount;
          this.toast.success(
            action.currentActive
              ? 'Subscriber deactivated'
              : 'Subscriber activated',
          );
          break;
        }
        case 'toggleReceivePush':
          await commandSetEmailSubscriberReceivePush(
            client,
            action.id,
            !action.currentReceivePush,
          );
          this.allSubscribers = patchEmailSubscriberReceivePush(
            this.allSubscribers,
            action.id,
            !action.currentReceivePush,
          );
          this.toast.success(
            action.currentReceivePush
              ? 'Push notifications disabled'
              : 'Push notifications enabled',
          );
          break;
        case 'toggleBlocked':
          await commandSetEmailSubscriberBlocked(
            client,
            action.id,
            !action.currentBlocked,
          );
          this.allSubscribers = patchEmailSubscriberBlocked(
            this.allSubscribers,
            action.id,
            !action.currentBlocked,
          );
          this.toast.success(
            action.currentBlocked
              ? 'User unblocked - login enabled'
              : 'User blocked - login disabled',
          );
          break;
        case 'delete': {
          if (action.isAdmin) {
            await commandUnsubscribeAdminEmailSubscriber(client, action.id);
            const activePatch = patchEmailSubscriberActive(
              this.allSubscribers,
              action.id,
              false,
            );
            this.allSubscribers = activePatch.rows;
            this.totalActiveCount = activePatch.totalActiveCount;
            this.csvSuccess = `Admin ${action.email} has been unsubscribed from emails but retains admin access to the portal.`;
            this.loadPageData();
          } else {
            await commandDeleteEmailSubscriber(client, action.id);
            this.allSubscribers = removeEmailSubscriberFromList(
              this.allSubscribers,
              action.id,
            );
            this.totalItems = this.allSubscribers.length;
            this.currentPage = emailSubscriberPageAfterDelete(
              this.currentPage,
              this.pageSize,
              this.allSubscribers.length,
            );
            this.totalActiveCount = countActiveEmailSubscribers(
              this.allSubscribers,
            );
            this.loadPageData();
            this.toast.success('Subscriber removed');
          }
          break;
        }
        default: {
          const neverKind: never = action.kind;
          return neverKind;
        }
      }
      this.markForCheck();
    } catch (err: unknown) {
      console.error('Error applying subscriber confirmation:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to update subscriber';
      if (action.kind === 'delete') {
        this.error = message;
      } else if (action.kind === 'toggleActive') {
        this.toast.error('Failed to update subscriber status');
      } else if (action.kind === 'toggleReceivePush') {
        this.toast.error('Failed to update push notification preference');
      } else if (action.kind === 'toggleBlocked') {
        this.toast.error('Failed to update user blocked status');
      } else {
        this.toast.error(message);
      }
      this.markForCheck();
    }
  }

  async onConfirmSendWelcomeEmail() {
    try {
      if (!this.pendingSubscriberEmail) {
        return;
      }
      await this.adminDataService.sendSubscriberWelcomeEmail(
        this.pendingSubscriberEmail,
      );
      this.toast.success('Welcome email sent to subscriber');
      this.dialogsHost?.closeWelcomeEmailDialog();
      this.showAddForm = false;
      this.pendingSubscriberEmail = '';
      this.markForCheck();
    } catch (error: unknown) {
      console.error('Error sending welcome email:', error);
      this.toast.error('Failed to send welcome email');
    }
  }

  onDeclineSendWelcomeEmail() {
    this.dialogsHost?.closeWelcomeEmailDialog();
    this.showAddForm = false;
    this.pendingSubscriberEmail = '';
    this.markForCheck();
  }
}
