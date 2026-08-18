import type {
  EmailSubscriberConfirmationAction,
  EmailSubscriberConfirmationDialogState,
} from './admin-email-subscribers-confirmations';
import type {
  EmailSubscriberRow,
  EmailSubscriberRowAction,
  EmailSubscriberSortColumn,
} from './admin-email-subscribers';
import {
  EmailSubscriberListSearchDebouncer,
  EMAIL_SUBSCRIBER_LIST_SEARCH_CONFIG,
} from './admin-email-subscribers-search-debounce';
import { dispatchEmailSubscriberRowAction } from './admin-email-subscribers-row-dispatch';
import { patchEmailSubscriberName } from './admin-email-subscribers-list-patches';
import {
  emailSubscriberPaginationRange,
  emailSubscriberTotalPages,
  scrollEmailSubscribersSectionToTop,
  sliceEmailSubscriberPage,
} from './admin-email-subscribers-pagination';
import {
  nextEmailSubscriberSort,
  sortEmailSubscriberRows,
} from './admin-email-subscribers-sort';
import { applyAdminSectionToggle } from './admin-section-lazy-load';
import {
  openEmailSubscriberDeleteConfirmation,
  openEmailSubscriberToggleConfirmation,
} from './admin-email-subscribers-confirmation-open';
import { EmailSubscriberOrientationTracker } from './admin-email-subscribers-orientation';
import {
  runEmailSubscriberFacadeConfirmation,
  runEmailSubscriberFacadeSearch,
} from './admin-email-subscribers-facade-run';
import {
  runEmailSubscribersAddFormTourOpen,
  runEmailSubscribersOverviewTourListState,
  runEmailSubscribersTourInitialState,
} from './admin-email-subscribers-facade-tour';
import {
  declineEmailSubscriberWelcomeEmail,
  sendEmailSubscriberWelcomeEmail,
} from './admin-email-subscribers-welcome-email';
import type {
  EmailSubscribersDialogsHostRef,
  EmailSubscribersFacadeDeps,
  EmailSubscribersPanelHostRef,
  EmailSubscribersSectionHostRef,
} from './admin-email-subscribers-facade-host';

export type {
  EmailSubscribersDialogsHostRef,
  EmailSubscribersFacadeDeps,
  EmailSubscribersPanelHostRef,
  EmailSubscribersSectionHostRef,
} from './admin-email-subscribers-facade-host';

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
  sectionInitialLoadDone = false;
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

  sectionRef?: EmailSubscribersSectionHostRef;
  panelRef?: EmailSubscribersPanelHostRef;
  dialogsRef?: EmailSubscribersDialogsHostRef;

  pendingSubscriberEmail = '';
  editSubscriber: EmailSubscriberRow | null = null;

  isLandscape = false;
  protected readonly orientationTracker = new EmailSubscriberOrientationTracker(
    (isLandscape) => {
      this.isLandscape = isLandscape;
      this.markForCheck();
    },
  );

  public readonly supabase: EmailSubscribersFacadeDeps['supabase'];
  public readonly toast: EmailSubscribersFacadeDeps['toast'];
  public readonly adminDataService: EmailSubscribersFacadeDeps['adminDataService'];
  public readonly markForCheck: () => void;

  constructor(deps: EmailSubscribersFacadeDeps) {
    this.supabase = deps.supabase;
    this.toast = deps.toast;
    this.adminDataService = deps.adminDataService;
    this.markForCheck = deps.markForCheck;
  }

  initOrientationTracking(): void {
    this.orientationTracker.init();
  }

  destroyOrientationTracking(): void {
    this.orientationTracker.destroy();
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
    applyAdminSectionToggle(this, () => void this.handleSearch());
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
      this.panelRef?.resetAddForm();
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
    this.dialogsRef?.openWelcomeEmailDialog();
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
    runEmailSubscribersTourInitialState({
      sectionExpanded: this.sectionExpanded,
      showAddForm: this.showAddForm,
      showCSVUpload: this.showCSVUpload,
      error: this.error,
      markForCheck: () => this.markForCheck(),
      resetAddForm: () => this.panelRef?.resetAddForm(),
    });
  }

  async prepareOverviewTourListState(): Promise<void> {
    await runEmailSubscribersOverviewTourListState(this);
  }

  openAddFormForTour(): void {
    runEmailSubscribersAddFormTourOpen(this);
  }

  showPlanningCenterTabForTour(): void {
    this.panelRef?.showPlanningCenterTab();
  }

  runPlanningCenterSearchTourDemo(): Promise<void> {
    return this.panelRef?.runPlanningCenterSearchTourDemo() ?? Promise.resolve();
  }

  selectTourPlanningCenterMatchFromDemoResults(): void {
    this.panelRef?.selectTourPlanningCenterMatchFromDemoResults();
  }

  applyTourDemoPlanningCenterAdd(): void {
    this.panelRef?.applyTourDemoPlanningCenterAdd();
  }

  clearEmailSubscribersTourDemoForm(): void {
    this.panelRef?.clearTourDemoForm();
    this.error = null;
    this.markForCheck();
  }

  toggleCSVUpload(): void {
    this.showCSVUpload = !this.showCSVUpload;
    this.showAddForm = false;
    this.error = null;
    this.csvSuccess = null;
    if (!this.showCSVUpload) {
      this.panelRef?.resetCsvPanel();
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
    await runEmailSubscriberFacadeSearch(this, () => this.loadPageData(), options);
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

    const container = this.sectionRef?.containerElement;
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
    await openEmailSubscriberToggleConfirmation(
      this.supabase.client,
      this.dialogsRef,
      'toggleActive',
      id,
      currentStatus,
      (message) => this.toast.error(message),
    );
  }

  async handleToggleReceivePush(id: string, currentReceivePush: boolean) {
    await openEmailSubscriberToggleConfirmation(
      this.supabase.client,
      this.dialogsRef,
      'toggleReceivePush',
      id,
      currentReceivePush,
      (message) => this.toast.error(message),
    );
  }

  async handleToggleBlocked(id: string, currentStatus: boolean) {
    await openEmailSubscriberToggleConfirmation(
      this.supabase.client,
      this.dialogsRef,
      'toggleBlocked',
      id,
      currentStatus,
      (message) => this.toast.error(message),
    );
  }

  async handleDelete(id: string, email: string) {
    await openEmailSubscriberDeleteConfirmation(
      this.supabase.client,
      this.dialogsRef,
      id,
      email,
      (message) => {
        this.error = message;
        this.markForCheck();
      },
    );
  }

  async onConfirmationConfirmed(
    action: EmailSubscriberConfirmationAction,
  ): Promise<void> {
    await runEmailSubscriberFacadeConfirmation(this, action, {
      supabase: this.supabase,
      toast: this.toast,
      getApplyInput: () => ({
        allSubscribers: this.allSubscribers,
        totalActiveCount: this.totalActiveCount,
        totalItems: this.totalItems,
        currentPage: this.currentPage,
        pageSize: this.pageSize,
        csvSuccess: this.csvSuccess,
      }),
      loadPageData: () => this.loadPageData(),
    });
  }

  clearListSearchDebouncer(): void {
    this.listSearchDebouncer.clear();
  }

  async onConfirmSendWelcomeEmail() {
    const outcome = await sendEmailSubscriberWelcomeEmail(
      this.adminDataService,
      this.toast,
      this.dialogsRef,
      this.pendingSubscriberEmail,
    );
    if (outcome.hideAddForm) {
      this.showAddForm = false;
    }
    if (outcome.clearPending) {
      this.pendingSubscriberEmail = '';
    }
    this.markForCheck();
  }

  onDeclineSendWelcomeEmail() {
    const outcome = declineEmailSubscriberWelcomeEmail(this.dialogsRef);
    if (outcome.hideAddForm) {
      this.showAddForm = false;
    }
    this.pendingSubscriberEmail = '';
    this.markForCheck();
  }
}
