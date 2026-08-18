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
import { PrayerEditorSearchDebouncer } from './admin-prayer-editor-search-debounce';
import { dispatchPrayerEditorCardAction } from './admin-prayer-editor-card-dispatch';
import {
  runPrayerEditorFacadeClearSearch,
  runPrayerEditorFacadeConfirmation,
  runPrayerEditorFacadeDeleteUpdateSave,
  runPrayerEditorFacadeEditUpdateSave,
  runPrayerEditorFacadeNewUpdateSave,
  runPrayerEditorFacadePrayerSave,
  runPrayerEditorFacadeSearch,
} from './admin-prayer-editor-facade-run';
import {
  prayerEditorClampPage,
  prayerEditorPageView,
} from './admin-prayer-editor-pagination-state';
import {
  prayerEditorAllDisplaySelected,
  prayerEditorCancelAddUpdateState,
  prayerEditorCancelEditState,
  prayerEditorCancelEditUpdateState,
  prayerEditorPrependPrayer,
  prayerEditorStartAddUpdateState,
  prayerEditorStartEditState,
  prayerEditorStartEditUpdateState,
  prayerEditorToggleSelectAll,
  prayerEditorToggleSetMember,
} from './admin-prayer-editor-ui-state';
import { scrollPrayerEditorSectionToTop } from './admin-prayer-editor-scroll';
import {
  isPrayerEditorEditUpdateFormValid,
  isPrayerEditorNewUpdateValid,
} from './admin-prayer-editor-commands';
import { applyAdminSectionToggle } from './admin-section-lazy-load';
import type {
  PrayerEditorDialogsHostRef,
  PrayerEditorFacadeDeps,
  PrayerEditorPanelHostRef,
  PrayerEditorSectionHostRef,
} from './admin-prayer-editor-facade-host';

export type {
  PrayerEditorDialogsHostRef,
  PrayerEditorFacadeDeps,
  PrayerEditorPanelHostRef,
  PrayerEditorSectionHostRef,
} from './admin-prayer-editor-facade-host';

export class PrayerEditorFacade {
  public readonly supabaseService: SupabaseService;
  public readonly toast: ToastService;
  public readonly prayerService: PrayerService;
  public readonly markForCheck: () => void;

  searchTerm = "";
  statusFilter = "";
  approvalFilter = "";
  searchResults: PrayerEditorPrayer[] = [];
  searching = false;
  deleting = false;
  error: string | null = null;
  sectionExpanded = false;
  sectionInitialLoadDone = false;
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

  sectionRef?: PrayerEditorSectionHostRef;
  panelRef?: PrayerEditorPanelHostRef;
  dialogsRef?: PrayerEditorDialogsHostRef;

  constructor(deps: PrayerEditorFacadeDeps) {
    this.supabaseService = deps.supabase;
    this.toast = deps.toast;
    this.prayerService = deps.prayerService;
    this.markForCheck = deps.markForCheck;
  }

  onSectionToggle(): void {
    applyAdminSectionToggle(this, () => void this.handleSearch());
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
    this.dialogsRef?.openSendNotificationForPrayer(prayer.id, prayer.title);
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
      deleteUpdate: async (prayerId, updateId, content) => {
        this.deleteUpdate(prayerId, updateId, content);
      },
      startEditUpdate: (prayerId, update) =>
        this.startEditUpdate(prayerId, update),
      cancelEditUpdate: () => this.cancelEditUpdate(),
      saveEditUpdate: (prayerId, updateId) =>
        this.saveEditUpdate(prayerId, updateId),
      flushEditDescription: (prayerId) =>
        this.panelRef?.flushEditDescriptionForPrayer(prayerId),
    });
  }

  resetAddUpdateSubscriberPick(): void {
    if (this.addingUpdate) {
      this.panelRef?.resetAddUpdateSubscriberPickForPrayer(this.addingUpdate);
    }
  }

  startAddUpdate(prayerId: string): void {
    const state = prayerEditorStartAddUpdateState(prayerId);
    this.addingUpdate = state.addingUpdate;
    this.newUpdate = state.newUpdate;
    this.resetAddUpdateSubscriberPick();
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
    await runPrayerEditorFacadeSearch(this, () => this.loadPageData());
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

    const container = this.sectionRef?.containerElement;
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
    this.dialogsRef?.openDeletePrayerConfirmation(prayer);
  }

  onConfirmationConfirmed(action: PrayerEditorConfirmationAction): Promise<void> {
    return runPrayerEditorFacadeConfirmation(this, action, {
      loadPageData: () => this.loadPageData(),
      executeDeleteUpdate: (prayerId, updateId) =>
        this.executeDeleteUpdate(prayerId, updateId),
    });
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

  startCreatePrayer(): void {
    this.creatingPrayer = true;
    this.error = null;
    this.markForCheck();
    setTimeout(() => this.panelRef?.resetCreateForm(), 0);
  }

  cancelCreatePrayer(): void {
    this.creatingPrayer = false;
    this.panelRef?.resetCreateForm();
  }

  async savePrayer(prayerId: string): Promise<void> {
    await runPrayerEditorFacadePrayerSave(this, prayerId);
  }

  async deleteSelected(): Promise<void> {
    if (this.selectedPrayers.size === 0) return;
    this.dialogsRef?.openDeleteSelectedConfirmation(this.selectedPrayers.size);
  }

  async updateSelectedStatus(): Promise<void> {
    if (this.selectedPrayers.size === 0 || !this.bulkStatus) return;
    this.dialogsRef?.openBulkStatusConfirmation(
      this.selectedPrayers.size,
      this.bulkStatus,
    );
  }

  async saveNewUpdate(prayerId: string): Promise<void> {
    await runPrayerEditorFacadeNewUpdateSave(this, prayerId);
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

  deleteUpdate(prayerId: string, updateId: string, updateContent: string): void {
    this.dialogsRef?.openDeleteUpdateConfirmation(
      prayerId,
      updateId,
      updateContent,
    );
  }

  async executeDeleteUpdate(prayerId: string, updateId: string): Promise<void> {
    await runPrayerEditorFacadeDeleteUpdateSave(this, prayerId, updateId);
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
    await runPrayerEditorFacadeEditUpdateSave(this, prayerId, updateId);
  }

  clearSearch(): void {
    runPrayerEditorFacadeClearSearch(this, () => this.searchDebouncer.clear());
  }
}
