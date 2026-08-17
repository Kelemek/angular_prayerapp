import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { PrayerService } from '../services/prayer.service';
import type { PrayerEditorConfirmationAction } from './admin-prayer-editor-confirmations';
import {
  EMPTY_PRAYER_EDITOR_EDIT_FORM,
  EMPTY_PRAYER_EDITOR_EDIT_UPDATE_FORM,
  EMPTY_PRAYER_EDITOR_NEW_UPDATE,
  type PrayerEditorCardAction,
  type PrayerEditorEditForm,
  type PrayerEditorNewUpdate,
  type PrayerEditorEditUpdateForm,
  type PrayerEditorPrayer,
  type PrayerEditorUpdate,
} from './admin-prayer-editor-types';
import {
  PRAYER_EDITOR_MAIN_SEARCH_DEBOUNCE_MS,
  PRAYER_EDITOR_MAIN_SEARCH_MIN_CHARS,
  PRAYER_EDITOR_MAIN_SEARCH_RESULT_LIMIT,
  slicePrayerEditorPage,
} from './admin-prayer-editor-search';
import { runPrayerEditorSearch } from './admin-prayer-editor-search-run';
import { PrayerEditorSearchDebouncer } from './admin-prayer-editor-search-debounce';
import { dispatchPrayerEditorCardAction } from './admin-prayer-editor-card-dispatch';
import { dispatchPrayerEditorConfirmation } from './admin-prayer-editor-confirmation-dispatch';
import { scrollPrayerEditorSectionToTop } from './admin-prayer-editor-scroll';
import { prayerEditorErrorMessage } from './admin-prayer-editor-errors';
import {
  prayerEditorClampPage,
  prayerEditorPageView,
  prayerEditorSearchResultsState,
} from './admin-prayer-editor-pagination-state';
import {
  mutatePrayerEditorBulkDelete,
  mutatePrayerEditorBulkStatus,
  mutatePrayerEditorDeleteUpdate,
  mutatePrayerEditorEditUpdateSave,
  mutatePrayerEditorInsertUpdate,
  mutatePrayerEditorPrayerSave,
  mutatePrayerEditorSingleDelete,
} from './admin-prayer-editor-mutations';
import {
  prayerEditorAllDisplaySelected,
  prayerEditorCancelAddUpdateState,
  prayerEditorCancelEditState,
  prayerEditorCancelEditUpdateState,
  prayerEditorClearListState,
  prayerEditorPrependPrayer,
  prayerEditorStartAddUpdateState,
  prayerEditorStartEditState,
  prayerEditorStartEditUpdateState,
  prayerEditorToggleSelectAll,
  prayerEditorToggleSetMember,
} from './admin-prayer-editor-ui-state';
import {
  isPrayerEditorEditUpdateFormValid,
  isPrayerEditorNewUpdateValid,
  prayerEditorUpdateDeletePreview,
  PRAYER_EDITOR_REQUIRED_FIELDS_ERROR,
  validatePrayerEditorEditForm,
} from './admin-prayer-editor-commands';
import {
  prayerEditorManageTourAddUpdateState,
  prayerEditorManageTourAfterSearch,
  prayerEditorManageTourEditTarget,
  prayerEditorTourExpandSection,
} from './admin-prayer-editor-tour-actions';

export interface PrayerEditorPanelHostRef {
  flushEditDescriptionForPrayer(prayerId: string): void;
  resetAddUpdateSubscriberPickForPrayer(prayerId: string): void;
  resetCreateForm(): void;
}

export interface PrayerEditorDialogsHostRef {
  openSendNotificationForPrayer(prayerId: string, title: string): void;
  openSendNotificationForUpdate(
    prayerId: string,
    updateId: string,
    title: string,
  ): void;
  openDeletePrayerConfirmation(prayer: PrayerEditorPrayer): void;
  openDeleteSelectedConfirmation(count: number): void;
  openBulkStatusConfirmation(count: number, status: string): void;
}

export interface PrayerEditorSectionHostRef {
  containerElement?: HTMLElement;
}

export interface PrayerEditorFacadeDeps {
  supabase: SupabaseService;
  toast: ToastService;
  prayerService: PrayerService;
  markForCheck: () => void;
}

export class PrayerEditorFacade {
  protected readonly supabaseService: SupabaseService;
  protected readonly toast: ToastService;
  protected readonly prayerService: PrayerService;
  protected readonly markForCheck: () => void;

  searchTerm = "";
  statusFilter = "";
  approvalFilter = "";
  searchResults: PrayerEditorPrayer[] = [];
  searching = false;
  deleting = false;
  error: string | null = null;
  sectionExpanded = false;
  protected sectionInitialLoadDone = false;
  selectedPrayers = new Set<string>();
  expandedCards = new Set<string>();
  editingPrayer: string | null = null;
  editForm: PrayerEditorEditForm = { ...EMPTY_PRAYER_EDITOR_EDIT_FORM };
  creatingPrayer = false;

  readonly mainSearchMinChars = PRAYER_EDITOR_MAIN_SEARCH_MIN_CHARS;
  readonly mainSearchDebounceMs = PRAYER_EDITOR_MAIN_SEARCH_DEBOUNCE_MS;
  readonly mainSearchResultLimit = PRAYER_EDITOR_MAIN_SEARCH_RESULT_LIMIT;
  private readonly searchDebouncer = new PrayerEditorSearchDebouncer(
    PRAYER_EDITOR_MAIN_SEARCH_DEBOUNCE_MS,
    () => void this.handleSearch(),
  );

  saving = false;
  bulkStatus = "";
  updatingStatus = false;
  addingUpdate: string | null = null;
  newUpdate: PrayerEditorNewUpdate = { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE };
  savingUpdate = false;

  editingUpdateId: string | null = null;
  editingUpdatePrayerId: string | null = null;
  editUpdateForm: PrayerEditorEditUpdateForm = { ...EMPTY_PRAYER_EDITOR_EDIT_UPDATE_FORM };
  savingEditUpdate = false;

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  allPrayers: PrayerEditorPrayer[] = [];
  displayPrayers: PrayerEditorPrayer[] = [];

  constructor(deps: PrayerEditorFacadeDeps) {
    this.supabaseService = deps.supabase;
    this.toast = deps.toast;
    this.prayerService = deps.prayerService;
    this.markForCheck = deps.markForCheck;
  }

  protected get sectionHost(): PrayerEditorSectionHostRef | undefined {
    return (this as { sectionRef?: PrayerEditorSectionHostRef }).sectionRef;
  }

  protected get panelHost(): PrayerEditorPanelHostRef | undefined {
    return (this as { panelRef?: PrayerEditorPanelHostRef }).panelRef;
  }

  protected get dialogsHost(): PrayerEditorDialogsHostRef | undefined {
    return (this as { dialogsRef?: PrayerEditorDialogsHostRef }).dialogsRef;
  }

  get totalPages(): number {
    return prayerEditorPageView(this.totalItems, this.pageSize, this.currentPage)
      .totalPages;
  }

  get isFirstPage(): boolean {
    return prayerEditorPageView(this.totalItems, this.pageSize, this.currentPage)
      .isFirstPage;
  }

  get isLastPage(): boolean {
    return prayerEditorPageView(this.totalItems, this.pageSize, this.currentPage)
      .isLastPage;
  }

  get paginationRange(): number[] {
    return prayerEditorPageView(this.totalItems, this.pageSize, this.currentPage)
      .paginationRange;
  }

  get allDisplaySelected(): boolean {
    return prayerEditorAllDisplaySelected(
      this.displayPrayers,
      this.selectedPrayers,
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

  destroySearchDebouncer(): void {
    this.searchDebouncer.destroy();
  }

  onPrayerCreated(prayer: PrayerEditorPrayer): void {
    this.searchResults = prayerEditorPrependPrayer(this.searchResults, prayer);
    this.allPrayers = prayerEditorPrependPrayer(this.allPrayers, prayer);
    this.totalItems = this.allPrayers.length;
    this.currentPage = 1;
    this.loadPageData();
    this.creatingPrayer = false;
    this.dialogsHost?.openSendNotificationForPrayer(prayer.id, prayer.title);
    this.markForCheck();
  }

  async onCardAction(
    prayer: PrayerEditorPrayer,
    action: PrayerEditorCardAction,
  ): Promise<void> {
    await dispatchPrayerEditorCardAction(prayer, action, {
      toggleSelect: (prayerId) => this.toggleSelectPrayer(prayerId),
      toggleExpand: (prayerId) => this.toggleExpandCard(prayerId),
      startEdit: (p) => this.startEditPrayer(p),
      cancelEdit: () => this.cancelEdit(),
      saveEdit: (prayerId) => this.savePrayer(prayerId),
      delete: (p) => this.deletePrayer(p),
      startAddUpdate: (prayerId) => this.startAddUpdate(prayerId),
      cancelAddUpdate: () => this.cancelAddUpdate(),
      saveNewUpdate: (prayerId) => this.saveNewUpdate(prayerId),
      deleteUpdate: (prayerId, updateId, content) =>
        this.deleteUpdate(prayerId, updateId, content),
      startEditUpdate: (prayerId, update) =>
        this.startEditUpdate(prayerId, update),
      cancelEditUpdate: () => this.cancelEditUpdate(),
      saveEditUpdate: (prayerId, updateId) =>
        this.saveEditUpdate(prayerId, updateId),
      flushEditDescription: (prayerId) =>
        this.panelHost?.flushEditDescriptionForPrayer(prayerId),
    });
  }

  private resetAddUpdateSubscriberPick(): void {
    if (this.addingUpdate) {
      this.panelHost?.resetAddUpdateSubscriberPickForPrayer(this.addingUpdate);
    }
  }

  startAddUpdate(prayerId: string): void {
    const state = prayerEditorStartAddUpdateState(prayerId);
    this.addingUpdate = state.addingUpdate;
    this.newUpdate = state.newUpdate;
    this.resetAddUpdateSubscriberPick();
  }

  onToolbarSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.onMainSearchTermChange(value);
  }

  onToolbarStatusFilterChange(value: string): void {
    this.statusFilter = value;
    this.onStatusFilterChange();
  }

  onToolbarApprovalFilterChange(value: string): void {
    this.approvalFilter = value;
    this.onApprovalFilterChange();
  }

  onToolbarPageSizeChange(size: number): void {
    this.pageSize = size;
    this.changePageSize();
  }

  onMainSearchTermChange(value: string): void {
    this.searchDebouncer.schedule(value.trim(), this.mainSearchMinChars, () =>
      this.markForCheck(),
    );
  }

  onMainSearchKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.flushMainSearchNow();
    }
  }

  flushMainSearchNow(): void {
    this.searchDebouncer.flush(this.searchTerm.trim(), this.mainSearchMinChars, () =>
      this.markForCheck(),
    );
  }

  async handleSearch(): Promise<void> {
    try {
      this.searching = true;
      this.error = null;
      this.selectedPrayers = new Set();
      this.markForCheck();

      const results = await runPrayerEditorSearch({
        supabaseUrl: this.supabaseService.getSupabaseUrl(),
        supabaseKey: this.supabaseService.getSupabaseKey(),
        searchTerm: this.searchTerm,
        statusFilter: this.statusFilter,
        approvalFilter: this.approvalFilter,
        resultLimit: this.mainSearchResultLimit,
      });

      const searchState = prayerEditorSearchResultsState(results);
      this.allPrayers = searchState.allPrayers;
      this.totalItems = searchState.totalItems;
      this.currentPage = searchState.currentPage;
      this.loadPageData();
      this.markForCheck();
    } catch (err: unknown) {
      console.error("Error searching prayers:", err);
      this.applyMutationError(err, "Failed to search prayers");
    } finally {
      this.searching = false;
      this.markForCheck();
    }
  }

  loadPageData(): void {
    this.displayPrayers = slicePrayerEditorPage(
      this.allPrayers,
      this.currentPage,
      this.pageSize,
    );
  }

  goToPage(page: number): void {
    this.currentPage = prayerEditorClampPage(
      page,
      this.totalItems,
      this.pageSize,
    );
    this.loadPageData();

    const container = this.sectionHost?.containerElement;
    if (container) {
      scrollPrayerEditorSectionToTop(container);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.loadPageData();
    this.markForCheck();
  }

  onStatusFilterChange(): void {
    if (this.statusFilter === "all" || this.statusFilter) {
      this.handleSearch();
    }
  }

  onApprovalFilterChange(): void {
    if (this.approvalFilter === "all" || this.approvalFilter) {
      this.handleSearch();
    }
  }

  toggleSelectPrayer(prayerId: string): void {
    this.selectedPrayers = prayerEditorToggleSetMember(
      this.selectedPrayers,
      prayerId,
    );
    this.markForCheck();
  }

  toggleSelectAll(): void {
    this.selectedPrayers = prayerEditorToggleSelectAll(
      this.displayPrayers,
      this.selectedPrayers,
    );
    this.markForCheck();
  }

  toggleExpandCard(id: string): void {
    this.expandedCards = prayerEditorToggleSetMember(this.expandedCards, id);
    this.markForCheck();
  }

  async deletePrayer(prayer: PrayerEditorPrayer): Promise<void> {
    this.dialogsHost?.openDeletePrayerConfirmation(prayer);
  }

  onConfirmationConfirmed(action: PrayerEditorConfirmationAction): Promise<void> {
    return this.handleConfirmationConfirmed(action);
  }

  private async handleConfirmationConfirmed(
    action: PrayerEditorConfirmationAction,
  ): Promise<void> {
    try {
      await dispatchPrayerEditorConfirmation(action, {
        bulkStatus: () => this.executeBulkStatusUpdate(),
        deleteMany: () => this.executeBulkDelete(),
        deleteOne: (prayerId) => this.executeSinglePrayerDelete(prayerId),
      });
    } catch (err: unknown) {
      console.error("Error deleting prayer:", err);
      this.applyMutationError(err, "Failed to delete prayer");
    } finally {
      this.deleting = false;
      this.updatingStatus = false;
    }
  }

  private async executeBulkStatusUpdate(): Promise<void> {
    this.updatingStatus = true;
    const client = this.supabaseService.getClient();

    const result = await mutatePrayerEditorBulkStatus(
      client,
      this.searchResults,
      this.allPrayers,
      this.selectedPrayers,
      this.bulkStatus,
    );

    this.searchResults = result.searchResults;
    this.allPrayers = result.allPrayers;
    this.selectedPrayers = result.selectedPrayers;
    this.bulkStatus = result.bulkStatus;
    this.loadPageData();
    this.markForCheck();
    this.refreshMainSitePrayers();
    this.toast.success(
      `${result.prayerCount} prayers updated to ${result.statusLabel}`,
    );
    this.updatingStatus = false;
  }

  private async executeBulkDelete(): Promise<void> {
    this.deleting = true;
    this.error = null;

    const result = await mutatePrayerEditorBulkDelete(
      this.supabaseService.getClient(),
      this.searchResults,
      this.allPrayers,
      this.selectedPrayers,
    );

    this.searchResults = result.searchResults;
    this.allPrayers = result.allPrayers;
    this.totalItems = result.totalItems;
    this.currentPage = result.currentPage;
    this.selectedPrayers = result.selectedPrayers;
    this.loadPageData();
    this.markForCheck();
    this.refreshMainSitePrayers();
    this.toast.success(`${result.prayerCount} prayers deleted successfully`);
  }

  private async executeSinglePrayerDelete(prayerId: string): Promise<void> {
    this.deleting = true;
    this.error = null;

    const result = await mutatePrayerEditorSingleDelete(
      this.supabaseService.getClient(),
      this.searchResults,
      this.allPrayers,
      prayerId,
      this.selectedPrayers,
    );

    this.searchResults = result.searchResults;
    this.allPrayers = result.allPrayers;
    this.totalItems = result.totalItems;
    this.selectedPrayers = result.selectedPrayers;
    this.loadPageData();
    this.refreshMainSitePrayers();
    this.toast.success("Prayer deleted successfully");
  }

  private refreshMainSitePrayers(): void {
    this.prayerService.loadPrayers().catch((err: unknown) => {
      console.debug("[PrayerSearch] Refresh after mutation failed:", err);
    });
  }

  private applyMutationError(err: unknown, fallback: string): void {
    const errorMessage = prayerEditorErrorMessage(err, fallback);
    this.error = errorMessage;
    this.sectionExpanded = true;
    this.toast.error(errorMessage);
  }

  startEditPrayer(prayer: PrayerEditorPrayer): void {
    const state = prayerEditorStartEditState(prayer, this.expandedCards);
    this.editForm = state.editForm;
    this.editingPrayer = state.editingPrayer;
    this.expandedCards = state.expandedCards;
    this.markForCheck();
  }

  cancelEdit(): void {
    const state = prayerEditorCancelEditState();
    this.editingPrayer = state.editingPrayer;
    this.editForm = state.editForm;
  }

  preparePrayerEditorTourInitialState(): void {
    const expand = prayerEditorTourExpandSection({
      sectionExpanded: this.sectionExpanded,
      sectionInitialLoadDone: this.sectionInitialLoadDone,
    });
    this.sectionExpanded = expand.sectionExpanded;
    this.sectionInitialLoadDone = expand.sectionInitialLoadDone;
    if (expand.runInitialSearch) {
      void this.handleSearch();
    }
    this.cancelCreatePrayer();
    this.markForCheck();
  }

  openCreatePrayerFormForTour(): void {
    this.startCreatePrayer();
    this.markForCheck();
  }

  async preparePrayerEditorManageTourInitialState(): Promise<boolean> {
    const expand = prayerEditorTourExpandSection({
      sectionExpanded: this.sectionExpanded,
      sectionInitialLoadDone: this.sectionInitialLoadDone,
    });
    this.sectionExpanded = expand.sectionExpanded;
    this.sectionInitialLoadDone = expand.sectionInitialLoadDone;
    this.cancelCreatePrayer();
    this.cancelEdit();
    this.cancelAddUpdate();
    this.cancelEditUpdate();
    await this.handleSearch();
    const afterSearch = prayerEditorManageTourAfterSearch(this.displayPrayers);
    this.expandedCards = afterSearch.expandedCards;
    this.markForCheck();
    return afterSearch.hasPrayers;
  }

  openEditFormForTour(): void {
    const prayer = prayerEditorManageTourEditTarget(this.displayPrayers);
    if (prayer) {
      this.startEditPrayer(prayer);
    }
    this.markForCheck();
  }

  cancelEditForTour(): void {
    this.cancelEdit();
    this.markForCheck();
  }

  openAddUpdateFormForTour(): void {
    const prep = prayerEditorManageTourAddUpdateState(this.displayPrayers);
    if (!prep) {
      return;
    }
    this.cancelEdit();
    this.cancelEditUpdate();
    this.expandedCards = prep.expandedCards;
    this.startAddUpdate(prep.prayerId);
    this.markForCheck();
  }

  cancelAddUpdateForTour(): void {
    this.cancelAddUpdate();
    this.markForCheck();
  }

  resetPrayerEditorManageTourUi(): void {
    this.cancelEdit();
    this.cancelAddUpdate();
    this.markForCheck();
  }

  startCreatePrayer(): void {
    this.creatingPrayer = true;
    this.error = null;
    this.markForCheck();
    setTimeout(() => this.panelHost?.resetCreateForm(), 0);
  }

  cancelCreatePrayer(): void {
    this.creatingPrayer = false;
    this.panelHost?.resetCreateForm();
  }

  async savePrayer(prayerId: string): Promise<void> {
    this.markForCheck();
    const validationError = validatePrayerEditorEditForm(this.editForm);
    if (validationError) {
      this.error = validationError;
      this.sectionExpanded = true;
      this.toast.error(validationError);
      return;
    }

    try {
      this.saving = true;
      this.markForCheck();
      this.error = null;

      const result = await mutatePrayerEditorPrayerSave(
        this.supabaseService.getClient(),
        this.searchResults,
        this.allPrayers,
        prayerId,
        this.editForm,
      );

      this.searchResults = result.searchResults;
      this.allPrayers = result.allPrayers;
      this.loadPageData();

      this.toast.success("Prayer updated successfully");
      this.cancelEdit();

      this.dialogsHost?.openSendNotificationForPrayer(prayerId, this.editForm.title);

      await this.prayerService.loadPrayers();
      this.saving = false;
      this.markForCheck();
    } catch (err: unknown) {
      console.error("Error updating prayer:", err);
      this.applyMutationError(err, "Failed to update prayer");
    } finally {
      this.saving = false;
    }
  }

  async deleteSelected(): Promise<void> {
    if (this.selectedPrayers.size === 0) return;
    this.dialogsHost?.openDeleteSelectedConfirmation(this.selectedPrayers.size);
  }

  async updateSelectedStatus(): Promise<void> {
    if (this.selectedPrayers.size === 0 || !this.bulkStatus) return;
    this.dialogsHost?.openBulkStatusConfirmation(
      this.selectedPrayers.size,
      this.bulkStatus,
    );
  }

  async saveNewUpdate(prayerId: string): Promise<void> {
    if (!this.isUpdateFormValid()) {
      this.error = PRAYER_EDITOR_REQUIRED_FIELDS_ERROR;
      this.sectionExpanded = true;
      this.toast.error(this.error);
      return;
    }

    try {
      this.savingUpdate = true;
      this.markForCheck();
      this.error = null;

      const result = await mutatePrayerEditorInsertUpdate(
        this.supabaseService.getClient(),
        this.allPrayers,
        prayerId,
        this.newUpdate,
      );

      this.allPrayers = result.allPrayers;
      this.loadPageData();

      this.newUpdate = { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE };
      this.addingUpdate = null;
      this.resetAddUpdateSubscriberPick();
      this.toast.success("Update added successfully");

      this.dialogsHost?.openSendNotificationForUpdate(
        prayerId,
        result.inserted.id,
        result.prayerTitle,
      );

      this.prayerService.loadPrayers();
    } catch (err: unknown) {
      console.error("Error saving update:", err);
      this.applyMutationError(err, "Failed to save update");
    } finally {
      this.savingUpdate = false;
      this.markForCheck();
    }
  }

  cancelAddUpdate(): void {
    const state = prayerEditorCancelAddUpdateState();
    this.addingUpdate = state.addingUpdate;
    this.newUpdate = state.newUpdate;
    this.resetAddUpdateSubscriberPick();
  }

  isUpdateFormValid(): boolean {
    return isPrayerEditorNewUpdateValid(this.newUpdate);
  }

  async deleteUpdate(
    prayerId: string,
    updateId: string,
    updateContent: string,
  ): Promise<void> {
    if (!confirm(prayerEditorUpdateDeletePreview(updateContent))) {
      return;
    }

    try {
      this.deleting = true;
      this.error = null;

      this.allPrayers = await mutatePrayerEditorDeleteUpdate(
        this.supabaseService.getClient(),
        this.allPrayers,
        prayerId,
        updateId,
      );
      this.loadPageData();

      this.toast.success("Update deleted successfully");
      this.refreshMainSitePrayers();
    } catch (err: unknown) {
      console.error("Error deleting update:", err);
      this.applyMutationError(err, "Failed to delete update");
    } finally {
      this.deleting = false;
    }
  }

  startEditUpdate(prayerId: string, update: PrayerEditorUpdate): void {
    const state = prayerEditorStartEditUpdateState(prayerId, update);
    this.editingUpdateId = state.editingUpdateId;
    this.editingUpdatePrayerId = state.editingUpdatePrayerId;
    this.editUpdateForm = state.editUpdateForm;
  }

  cancelEditUpdate(): void {
    const state = prayerEditorCancelEditUpdateState();
    this.editingUpdateId = state.editingUpdateId;
    this.editingUpdatePrayerId = state.editingUpdatePrayerId;
    this.editUpdateForm = state.editUpdateForm;
  }

  isEditUpdateFormValid(): boolean {
    return isPrayerEditorEditUpdateFormValid(this.editUpdateForm);
  }

  async saveEditUpdate(prayerId: string, updateId: string): Promise<void> {
    if (!this.isEditUpdateFormValid()) {
      this.error = PRAYER_EDITOR_REQUIRED_FIELDS_ERROR;
      this.sectionExpanded = true;
      this.toast.error(this.error);
      return;
    }

    try {
      this.savingEditUpdate = true;
      this.markForCheck();
      this.error = null;

      const result = await mutatePrayerEditorEditUpdateSave(
        this.supabaseService.getClient(),
        this.allPrayers,
        prayerId,
        updateId,
        this.editUpdateForm,
      );

      this.allPrayers = result.allPrayers;
      this.loadPageData();

      this.toast.success("Update saved successfully");
      this.cancelEditUpdate();

      this.dialogsHost?.openSendNotificationForUpdate(
        prayerId,
        updateId,
        result.prayerTitle,
      );

      await this.prayerService.loadPrayers();
      this.savingEditUpdate = false;
      this.markForCheck();
    } catch (err: unknown) {
      console.error("Error updating update:", err);
      this.applyMutationError(err, "Failed to update");
    } finally {
      this.savingEditUpdate = false;
    }
  }

  clearSearch(): void {
    this.searchDebouncer.clear();
    const cleared = prayerEditorClearListState();
    this.searchTerm = "";
    this.allPrayers = cleared.allPrayers;
    this.displayPrayers = cleared.displayPrayers;
    this.selectedPrayers = cleared.selectedPrayers;
    this.error = null;
    this.currentPage = cleared.currentPage;
    this.totalItems = cleared.totalItems;
    void this.handleSearch();
  }
}
