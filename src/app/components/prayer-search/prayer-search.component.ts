import {
  Component,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ViewChildren,
  ElementRef,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SupabaseService } from "../../services/supabase.service";
import { ToastService } from "../../services/toast.service";
import { PrayerService } from "../../services/prayer.service";
import { AdminDataService } from "../../services/admin-data.service";
import {
  SendNotificationDialogComponent,
  type NotificationType,
} from "../send-notification-dialog/send-notification-dialog.component";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";
import { AdminPrayerEditorCreateFormComponent } from "../admin-prayer-editor-create-form/admin-prayer-editor-create-form.component";
import { AdminPrayerEditorCardComponent } from "../admin-prayer-editor-card/admin-prayer-editor-card.component";
import { escapeForIlikePattern } from "../../lib/admin-subscriber-pick";
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
} from "../../lib/admin-prayer-editor-types";

@Component({
  selector: "app-prayer-search",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SendNotificationDialogComponent,
    ConfirmationDialogComponent,
    AdminPrayerEditorCreateFormComponent,
    AdminPrayerEditorCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: "./prayer-search.component.html",
})
export class PrayerSearchComponent implements OnDestroy {
  Math = Math;
  searchTerm = "";
  statusFilter = "";
  approvalFilter = "";
  searchResults: PrayerEditorPrayer[] = [];
  searching = false;
  deleting = false;
  error: string | null = null;
  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  selectedPrayers = new Set<string>();
  expandedCards = new Set<string>();
  editingPrayer: string | null = null;
  editForm: PrayerEditorEditForm = { ...EMPTY_PRAYER_EDITOR_EDIT_FORM };
  creatingPrayer = false;

  /** Main prayer list text search — debounced like subscriber lookup. */
  readonly mainSearchMinChars = 2;
  readonly mainSearchDebounceMs = 350;
  readonly mainSearchResultLimit = 100;
  private mainSearchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  saving = false;
  bulkStatus = "";
  updatingStatus = false;
  addingUpdate: string | null = null;
  newUpdate: PrayerEditorNewUpdate = { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE };
  savingUpdate = false;

  // Edit update properties
  editingUpdateId: string | null = null;
  editingUpdatePrayerId: string | null = null;
  editUpdateForm: PrayerEditorEditUpdateForm = { ...EMPTY_PRAYER_EDITOR_EDIT_UPDATE_FORM };
  savingEditUpdate = false;

  // Dialog state for send notification
  showSendNotificationDialog = false;
  sendDialogType: NotificationType = "prayer";
  sendDialogPrayerTitle?: string;
  private sendDialogPrayerId?: string;
  private sendDialogUpdateId?: string;

  // Confirmation dialog state
  showConfirmationDialog = false;
  confirmationTitle = "";
  confirmationMessage = "";
  confirmationPrayerId: string | null = null;
  isMultiSelectDelete = false; // Track if this is a multi-select delete
  isStatusUpdateConfirmation = false; // Track if this is a bulk status update
  confirmationButtonText = "Delete";
  confirmationIsDangerous = true;

  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  allPrayers: PrayerEditorPrayer[] = [];
  displayPrayers: PrayerEditorPrayer[] = [];

  @ViewChild("prayerEditorContainer") prayerEditorContainer!: ElementRef;
  @ViewChild("createFormRef") createFormRef?: AdminPrayerEditorCreateFormComponent;
  @ViewChildren(AdminPrayerEditorCardComponent)
  cardRefs?: AdminPrayerEditorCardComponent[];

  constructor(
    private supabaseService: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private prayerService: PrayerService,
    private adminDataService: AdminDataService
  ) {}

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get isFirstPage(): boolean {
    return this.currentPage === 1;
  }

  get isLastPage(): boolean {
    return this.currentPage >= this.totalPages;
  }

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.handleSearch();
    }
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.mainSearchDebounceTimer) {
      clearTimeout(this.mainSearchDebounceTimer);
      this.mainSearchDebounceTimer = null;
    }
  }

  onPrayerCreated(prayer: PrayerEditorPrayer): void {
    this.searchResults = [prayer, ...this.searchResults];
    this.allPrayers = [prayer, ...this.allPrayers];
    this.totalItems = this.allPrayers.length;
    this.currentPage = 1;
    this.loadPageData();
    this.creatingPrayer = false;
    this.sendDialogPrayerId = prayer.id;
    this.sendDialogPrayerTitle = prayer.title;
    this.sendDialogType = "prayer";
    this.showSendNotificationDialog = true;
    this.cdr.markForCheck();
  }

  async onCardAction(
    prayer: PrayerEditorPrayer,
    action: PrayerEditorCardAction,
  ): Promise<void> {
    switch (action.type) {
      case "toggleSelect":
        this.toggleSelectPrayer(prayer.id);
        break;
      case "toggleExpand":
        this.toggleExpandCard(prayer.id);
        break;
      case "startEdit":
        this.startEditPrayer(prayer);
        break;
      case "cancelEdit":
        this.cancelEdit();
        break;
      case "saveEdit":
        this.cardForPrayer(prayer.id)?.flushEditDescriptionEditor();
        await this.savePrayer(prayer.id);
        break;
      case "delete":
        await this.deletePrayer(prayer);
        break;
      case "startAddUpdate":
        this.startAddUpdate(prayer.id);
        break;
      case "cancelAddUpdate":
        this.cancelAddUpdate();
        break;
      case "saveNewUpdate":
        await this.saveNewUpdate(prayer.id);
        break;
      case "deleteUpdate":
        await this.deleteUpdate(prayer.id, action.updateId, action.content);
        break;
      case "startEditUpdate":
        this.startEditUpdate(prayer.id, action.update);
        break;
      case "cancelEditUpdate":
        this.cancelEditUpdate();
        break;
      case "saveEditUpdate":
        await this.saveEditUpdate(prayer.id, action.updateId);
        break;
      case "addUpdateSubscriberSelected":
        break;
      default: {
        const neverAction: never = action;
        return neverAction;
      }
    }
  }

  private cardForPrayer(prayerId: string): AdminPrayerEditorCardComponent | undefined {
    return this.cardRefs?.find((card) => card.prayer.id === prayerId);
  }

  private resetAddUpdateSubscriberPick(): void {
    if (this.addingUpdate) {
      this.cardForPrayer(this.addingUpdate)?.resetAddUpdateSubscriberPick();
    }
  }

  /** Opens the add-update form with a clean draft and lookup field. */
  startAddUpdate(prayerId: string): void {
    this.addingUpdate = prayerId;
    this.newUpdate = { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE };
    this.resetAddUpdateSubscriberPick();
  }

  onMainSearchTermChange(value: string): void {
    if (this.mainSearchDebounceTimer) {
      clearTimeout(this.mainSearchDebounceTimer);
      this.mainSearchDebounceTimer = null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      this.mainSearchDebounceTimer = setTimeout(() => {
        this.mainSearchDebounceTimer = null;
        void this.handleSearch();
      }, this.mainSearchDebounceMs);
      return;
    }
    if (trimmed.length < this.mainSearchMinChars) {
      this.cdr.markForCheck();
      return;
    }

    this.mainSearchDebounceTimer = setTimeout(() => {
      this.mainSearchDebounceTimer = null;
      void this.handleSearch();
    }, this.mainSearchDebounceMs);
  }

  onMainSearchKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.flushMainSearchNow();
    }
  }

  /** Run search immediately (e.g. Enter) and skip pending debounce. */
  flushMainSearchNow(): void {
    if (this.mainSearchDebounceTimer) {
      clearTimeout(this.mainSearchDebounceTimer);
      this.mainSearchDebounceTimer = null;
    }
    const trimmed = this.searchTerm.trim();
    if (trimmed.length > 0 && trimmed.length < this.mainSearchMinChars) {
      this.cdr.markForCheck();
      return;
    }
    void this.handleSearch();
  }

  private applyPrayerListFilters(params: URLSearchParams): void {
    if (this.statusFilter && this.statusFilter !== "all") {
      params.set("status", `eq.${this.statusFilter}`);
    }
    if (
      this.approvalFilter &&
      this.approvalFilter !== "all" &&
      this.approvalFilter !== "denied" &&
      this.approvalFilter !== "pending"
    ) {
      params.set("approval_status", `eq.${this.approvalFilter}`);
    }
  }

  async handleSearch(): Promise<void> {
    try {
      this.searching = true;
      this.error = null;
      this.selectedPrayers = new Set();
      this.cdr.markForCheck();

      const supabaseUrl = this.supabaseService.getSupabaseUrl();
      const supabaseKey = this.supabaseService.getSupabaseKey();

      const trimmedSearch = this.searchTerm.trim();
      const listSelect =
        "id,title,requester,email,status,created_at,denial_reason,description,approval_status,prayer_for,prayer_updates(id,content,author,author_email,created_at,denial_reason,approval_status)";

      const params = new URLSearchParams();
      params.set("select", listSelect);
      params.set("order", "created_at.desc");
      params.set("limit", String(this.mainSearchResultLimit));

      if (trimmedSearch) {
        const escaped = escapeForIlikePattern(trimmedSearch);
        const pattern = `%${escaped}%`;
        params.set(
          "or",
          `(requester.ilike.${pattern},email.ilike.${pattern},title.ilike.${pattern},description.ilike.${pattern},denial_reason.ilike.${pattern})`
        );
      }

      this.applyPrayerListFilters(params);

      const url = `${supabaseUrl}/rest/v1/prayers?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Query failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      let results = data || [];

      // Prayers whose *updates* match the term (without downloading the full capped list).
      if (trimmedSearch) {
        const escaped = escapeForIlikePattern(trimmedSearch);
        const pattern = `%${escaped}%`;

        const idParams = new URLSearchParams();
        idParams.set("select", "id,prayer_updates!inner(id)");
        idParams.set("prayer_updates.content", `ilike.${pattern}`);
        idParams.set("limit", String(this.mainSearchResultLimit));
        this.applyPrayerListFilters(idParams);

        const idUrl = `${supabaseUrl}/rest/v1/prayers?${idParams.toString()}`;
        const idResponse = await fetch(idUrl, {
          method: "GET",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        if (idResponse.ok) {
          const idRows: { id: string }[] = await idResponse.json();
          const resultIds = new Set(results.map((p: PrayerEditorPrayer) => p.id));
          const missingIds = [
            ...new Set((idRows || []).map((r) => r.id).filter(Boolean)),
          ].filter((id) => !resultIds.has(id));

          if (missingIds.length > 0) {
            const fullParams = new URLSearchParams();
            fullParams.set("select", listSelect);
            fullParams.set("id", `in.(${missingIds.join(",")})`);
            this.applyPrayerListFilters(fullParams);

            const fullUrl = `${supabaseUrl}/rest/v1/prayers?${fullParams.toString()}`;
            const fullResponse = await fetch(fullUrl, {
              method: "GET",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              signal: controller.signal,
            });

            if (fullResponse.ok) {
              const fullData: PrayerEditorPrayer[] = await fullResponse.json();
              for (const row of fullData || []) {
                results.push(row);
              }
            }
          }
        }
      }

      if (this.approvalFilter === "denied") {
        results = results.filter((prayer: PrayerEditorPrayer) => {
          if (prayer.denial_reason) return true;
          if (prayer.prayer_updates && prayer.prayer_updates.length > 0) {
            return prayer.prayer_updates.some(
              (update) =>
                update.denial_reason !== null &&
                update.denial_reason !== undefined &&
                update.denial_reason !== ""
            );
          }
          return false;
        });
      }

      if (this.approvalFilter === "pending") {
        results = results.filter((prayer: PrayerEditorPrayer) => {
          const isPrayerPending =
            prayer.approval_status === "pending" ||
            prayer.approval_status === null ||
            prayer.approval_status === undefined;
          const hasPendingUpdates =
            prayer.prayer_updates &&
            prayer.prayer_updates.length > 0 &&
            prayer.prayer_updates.some(
              (update) =>
                update.approval_status === "pending" ||
                update.approval_status === null ||
                update.approval_status === undefined
            );
          return isPrayerPending || hasPendingUpdates;
        });
      }

      // Sort by most recent activity
      this.allPrayers = this.sortPrayersByLatestActivity(results);
      this.totalItems = this.allPrayers.length;
      this.currentPage = 1;
      this.loadPageData();
      this.cdr.markForCheck();
    } catch (err: unknown) {
      console.error("Error searching prayers:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to search prayers";
      this.error = errorMessage;
      this.sectionExpanded = true;
      this.toast.error(errorMessage);
      this.cdr.markForCheck();
    } finally {
      this.searching = false;
      this.cdr.markForCheck();
    }
  }

  loadPageData(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayPrayers = this.allPrayers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    this.currentPage = Math.max(
      1,
      Math.min(page, Math.ceil(this.totalItems / this.pageSize))
    );
    this.loadPageData();

    // Scroll the Prayer Editor container to the top of the window
    if (this.prayerEditorContainer) {
      setTimeout(() => {
        const containerTop =
          this.prayerEditorContainer.nativeElement.getBoundingClientRect().top +
          window.scrollY;
        window.scrollTo({ top: containerTop, behavior: "smooth" });
      }, 0);
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

  getPaginationRange(): number[] {
    const totalPages = Math.ceil(this.totalItems / this.pageSize);
    const maxPages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.loadPageData();
    this.cdr.markForCheck();
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
    const newSelected = new Set(this.selectedPrayers);
    if (newSelected.has(prayerId)) {
      newSelected.delete(prayerId);
    } else {
      newSelected.add(prayerId);
    }
    this.selectedPrayers = newSelected;
    this.cdr.markForCheck();
  }

  toggleSelectAll(): void {
    if (this.selectedPrayers.size === this.displayPrayers.length) {
      this.selectedPrayers = new Set();
    } else {
      this.selectedPrayers = new Set(this.displayPrayers.map((p) => p.id));
    }
    this.cdr.markForCheck();
  }

  toggleExpandCard(id: string): void {
    const newExpanded = new Set(this.expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    this.expandedCards = newExpanded;
  }

  async deletePrayer(prayer: PrayerEditorPrayer): Promise<void> {
    this.confirmationTitle = "Delete Prayer";
    this.confirmationMessage = `Are you sure you want to delete the prayer "${prayer.title}"? This action cannot be undone.`;
    this.confirmationButtonText = "Delete";
    this.confirmationIsDangerous = true;
    this.confirmationPrayerId = prayer.id;
    this.showConfirmationDialog = true;
  }

  async onConfirmDelete(): Promise<void> {
    try {
      // Handle bulk status update
      if (this.isStatusUpdateConfirmation) {
        this.updatingStatus = true;
        this.showConfirmationDialog = false;
        this.isStatusUpdateConfirmation = false;

        const statusLabel =
          this.bulkStatus === "current"
            ? "Current"
            : this.bulkStatus === "answered"
            ? "Answered"
            : "Archived";

        const prayerIds = Array.from(this.selectedPrayers);

        const { error: updateError } = await this.supabaseService
          .getClient()
          .from("prayers")
          .update({ status: this.bulkStatus })
          .in("id", prayerIds);

        if (updateError) {
          throw new Error(
            `Failed to update prayer statuses: ${updateError.message}`
          );
        }

        this.allPrayers = this.allPrayers.map((p) =>
          this.selectedPrayers.has(p.id) ? { ...p, status: this.bulkStatus } : p
        );
        this.searchResults = this.searchResults.map((p) =>
          this.selectedPrayers.has(p.id) ? { ...p, status: this.bulkStatus } : p
        );
        this.loadPageData();

        this.selectedPrayers = new Set();
        this.bulkStatus = "";
        this.cdr.markForCheck();
        this.prayerService.loadPrayers().catch((err) => {
          console.debug(
            "[PrayerSearch] Refresh after bulk status update failed:",
            err
          );
        });
        this.toast.success(
          `${prayerIds.length} prayers updated to ${statusLabel}`
        );
        this.updatingStatus = false;
        return;
      }

      this.deleting = true;
      this.error = null;

      // Handle multi-select delete
      if (this.isMultiSelectDelete && this.selectedPrayers.size > 0) {
        this.showConfirmationDialog = false;
        this.isMultiSelectDelete = false;

        const prayerIds = Array.from(this.selectedPrayers);

        const { error: updatesError } = await this.supabaseService
          .getClient()
          .from("prayer_updates")
          .delete()
          .in("prayer_id", prayerIds);

        if (updatesError) {
          throw new Error(
            `Failed to delete prayer updates: ${updatesError.message}`
          );
        }

        const { error: prayersError } = await this.supabaseService
          .getClient()
          .from("prayers")
          .delete()
          .in("id", prayerIds);

        if (prayersError) {
          throw new Error(`Failed to delete prayers: ${prayersError.message}`);
        }

        this.searchResults = this.searchResults.filter(
          (p) => !this.selectedPrayers.has(p.id)
        );
        this.allPrayers = this.allPrayers.filter(
          (p) => !this.selectedPrayers.has(p.id)
        );
        this.totalItems = this.allPrayers.length;
        this.currentPage = 1;
        this.loadPageData();
        this.selectedPrayers = new Set();
        this.cdr.markForCheck();
        this.prayerService.loadPrayers().catch((err) => {
          console.debug(
            "[PrayerSearch] Refresh after bulk delete failed:",
            err
          );
        });
        this.toast.success(`${prayerIds.length} prayers deleted successfully`);
        return;
      }

      // Handle single prayer delete
      if (!this.confirmationPrayerId) return;

      const prayerId = this.confirmationPrayerId;
      this.showConfirmationDialog = false;
      this.confirmationPrayerId = null;

      const { error: updatesError } = await this.supabaseService
        .getClient()
        .from("prayer_updates")
        .delete()
        .eq("prayer_id", prayerId);

      if (updatesError) {
        throw new Error(
          `Failed to delete prayer updates: ${updatesError.message}`
        );
      }

      const { error: prayerError } = await this.supabaseService
        .getClient()
        .from("prayers")
        .delete()
        .eq("id", prayerId);

      if (prayerError) {
        throw new Error(`Failed to delete prayer: ${prayerError.message}`);
      }

      this.searchResults = this.searchResults.filter((p) => p.id !== prayerId);
      this.allPrayers = this.allPrayers.filter((p) => p.id !== prayerId);
      this.totalItems = this.allPrayers.length;
      this.loadPageData();
      this.selectedPrayers.delete(prayerId);
      this.prayerService.loadPrayers().catch((err) => {
        console.debug("[PrayerSearch] Refresh after delete failed:", err);
      });
      this.toast.success("Prayer deleted successfully");
    } catch (err: unknown) {
      console.error("Error deleting prayer:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete prayer";
      this.error = errorMessage;
      this.sectionExpanded = true;
      this.toast.error(errorMessage);
    } finally {
      this.deleting = false;
    }
  }

  onCancelDelete(): void {
    this.showConfirmationDialog = false;
    this.confirmationPrayerId = null;
    this.isMultiSelectDelete = false;
    this.isStatusUpdateConfirmation = false;
  }

  startEditPrayer(prayer: PrayerEditorPrayer): void {
    this.editForm = {
      title: prayer.title,
      description: prayer.description || "",
      requester: prayer.requester,
      email: prayer.email || "",
      prayer_for: prayer.prayer_for || "",
      status: prayer.status,
    };
    this.editingPrayer = prayer.id;
    this.expandedCards = new Set([...this.expandedCards, prayer.id]);
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editingPrayer = null;
    this.editForm = {
      title: "",
      description: "",
      requester: "",
      email: "",
      prayer_for: "",
      status: "",
    };
  }

  /** Expand Prayer Editor, close create form — call before Admin Help Prayer Editor driver.js tour. */
  preparePrayerEditorTourInitialState(): void {
    if (!this.sectionExpanded) {
      this.sectionExpanded = true;
      if (!this.sectionInitialLoadDone) {
        this.sectionInitialLoadDone = true;
        void this.handleSearch();
      }
    }
    this.cancelCreatePrayer();
    this.cdr.markForCheck();
  }

  /** Opens the create form when the tour advances past “Create New Prayer” (same as clicking the button). */
  openCreatePrayerFormForTour(): void {
    this.startCreatePrayer();
    this.cdr.markForCheck();
  }

  /**
   * Load prayers, expand the first card, clear transient editor state — before the Prayer Editor “manage” driver.js tour.
   * @returns whether at least one prayer is on the current page (for tour steps; avoids querying the DOM before paint).
   */
  async preparePrayerEditorManageTourInitialState(): Promise<boolean> {
    if (!this.sectionExpanded) {
      this.sectionExpanded = true;
      if (!this.sectionInitialLoadDone) {
        this.sectionInitialLoadDone = true;
      }
    }
    this.cancelCreatePrayer();
    this.cancelEdit();
    this.cancelAddUpdate();
    this.cancelEditUpdate();
    await this.handleSearch();
    const first = this.displayPrayers[0];
    if (first) {
      this.expandedCards = new Set([first.id]);
    } else {
      this.expandedCards = new Set();
    }
    this.cdr.markForCheck();
    return this.displayPrayers.length > 0;
  }

  /** Admin Prayer Editor manage tour: open edit for the first visible prayer. */
  openEditFormForTour(): void {
    const prayer = this.displayPrayers[0];
    if (prayer) {
      this.startEditPrayer(prayer);
    }
    this.cdr.markForCheck();
  }

  /** Admin Prayer Editor manage tour: exit edit without saving. */
  cancelEditForTour(): void {
    this.cancelEdit();
    this.cdr.markForCheck();
  }

  /** Admin Prayer Editor manage tour: open Add New Update for the first visible prayer. */
  openAddUpdateFormForTour(): void {
    const prayer = this.displayPrayers[0];
    if (!prayer) {
      return;
    }
    this.cancelEdit();
    this.cancelEditUpdate();
    this.expandedCards = new Set([prayer.id]);
    this.startAddUpdate(prayer.id);
    this.cdr.markForCheck();
  }

  /** Admin Prayer Editor manage tour: close add-update form without saving. */
  cancelAddUpdateForTour(): void {
    this.cancelAddUpdate();
    this.cdr.markForCheck();
  }

  /** Admin Prayer Editor manage tour: if the driver is closed early, leave the panel in a neutral state. */
  resetPrayerEditorManageTourUi(): void {
    this.cancelEdit();
    this.cancelAddUpdate();
    this.cdr.markForCheck();
  }

  startCreatePrayer(): void {
    this.creatingPrayer = true;
    this.error = null;
    this.cdr.markForCheck();
    setTimeout(() => this.createFormRef?.resetForm(), 0);
  }

  cancelCreatePrayer(): void {
    this.creatingPrayer = false;
    this.createFormRef?.resetForm();
  }

  async savePrayer(prayerId: string): Promise<void> {
    this.cdr.markForCheck();

    if (
      !this.editForm.title.trim() ||
      !this.editForm.description.trim() ||
      !this.editForm.requester.trim()
    ) {
      this.error = "Title, description, and requester are required";
      this.sectionExpanded = true;
      this.toast.error(this.error);
      return;
    }

    try {
      this.saving = true;
      this.cdr.markForCheck();
      this.error = null;

      // Admin edit implies approval — align with createPrayer / approvePrayer
      const approvedAt = new Date().toISOString();

      const { error: updateError } = await this.supabaseService
        .getClient()
        .from("prayers")
        .update({
          title: this.editForm.title.trim(),
          description: this.editForm.description.trim(),
          requester: this.editForm.requester.trim(),
          email: this.editForm.email.trim() || null,
          prayer_for: this.editForm.prayer_for.trim() || null,
          status: this.editForm.status,
          approved_at: approvedAt,
        })
        .eq("id", prayerId);

      if (updateError) {
        throw new Error(`Failed to update prayer: ${updateError.message}`);
      }

      this.searchResults = this.searchResults.map((p) =>
        p.id === prayerId
          ? ({
              ...p,
              title: this.editForm.title.trim(),
              description: this.editForm.description.trim(),
              requester: this.editForm.requester.trim(),
              email: this.editForm.email.trim() || null,
              prayer_for: this.editForm.prayer_for.trim() || undefined,
              status: this.editForm.status,
              approved_at: approvedAt,
            } as PrayerEditorPrayer)
          : p
      );

      this.allPrayers = this.allPrayers.map((p) =>
        p.id === prayerId
          ? ({
              ...p,
              title: this.editForm.title.trim(),
              description: this.editForm.description.trim(),
              requester: this.editForm.requester.trim(),
              email: this.editForm.email.trim() || null,
              prayer_for: this.editForm.prayer_for.trim() || undefined,
              status: this.editForm.status,
              approved_at: approvedAt,
            } as PrayerEditorPrayer)
          : p
      );
      this.loadPageData();

      this.toast.success("Prayer updated successfully");
      this.cancelEdit();

      // Show dialog asking if they want to send notification
      this.sendDialogPrayerId = prayerId;
      this.sendDialogPrayerTitle = this.editForm.title;
      this.sendDialogType = "prayer";
      this.showSendNotificationDialog = true;

      // Trigger reload on main site
      await this.prayerService.loadPrayers();

      this.saving = false;
      this.cdr.markForCheck();
    } catch (err: unknown) {
      console.error("Error updating prayer:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update prayer";
      this.error = errorMessage;
      this.sectionExpanded = true;
      this.toast.error(errorMessage);
    } finally {
      this.saving = false;
    }
  }

  async deleteSelected(): Promise<void> {
    if (this.selectedPrayers.size === 0) return;

    // Show confirmation dialog instead of window.confirm
    this.confirmationTitle = "Delete Selected Prayers";
    this.confirmationMessage = `Are you sure you want to delete ${this.selectedPrayers.size} prayer(s)? This action cannot be undone.`;
    this.confirmationButtonText = "Delete";
    this.confirmationIsDangerous = true;
    this.isMultiSelectDelete = true;
    this.showConfirmationDialog = true;
  }

  async updateSelectedStatus(): Promise<void> {
    if (this.selectedPrayers.size === 0 || !this.bulkStatus) return;

    const statusLabel =
      this.bulkStatus === "current"
        ? "Current"
        : this.bulkStatus === "answered"
        ? "Answered"
        : "Archived";

    // Show confirmation dialog instead of window.confirm
    this.confirmationTitle = "Update Prayer Status";
    this.confirmationMessage = `Are you sure you want to change ${this.selectedPrayers.size} prayer(s) to "${statusLabel}" status?`;
    this.confirmationButtonText = "Update";
    this.confirmationIsDangerous = false;
    this.isStatusUpdateConfirmation = true;
    this.showConfirmationDialog = true;
  }

  async saveNewUpdate(prayerId: string): Promise<void> {
    if (!this.isUpdateFormValid()) {
      this.error = "All fields are required";
      this.sectionExpanded = true;
      this.toast.error(this.error);
      return;
    }

    try {
      this.savingUpdate = true;
      this.cdr.markForCheck();
      this.error = null;

      // Combine first and last name
      const fullName = `${this.newUpdate.firstName.trim()} ${this.newUpdate.lastName.trim()}`;

      const approvedAt = new Date().toISOString();

      const { data, error: insertError } = await this.supabaseService
        .getClient()
        .from("prayer_updates")
        .insert({
          prayer_id: prayerId,
          content: this.newUpdate.content.trim(),
          author: fullName,
          author_email: this.newUpdate.author_email.trim(),
          approval_status: "approved",
          approved_at: approvedAt,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create update: ${insertError.message}`);
      }

      this.allPrayers = this.allPrayers.map((p) => {
        if (p.id === prayerId) {
          return {
            ...p,
            prayer_updates: [...(p.prayer_updates || []), data],
          };
        }
        return p;
      });
      this.loadPageData();

      this.newUpdate = {
        content: "",
        firstName: "",
        lastName: "",
        author_email: "",
      };
      this.addingUpdate = null;
      this.resetAddUpdateSubscriberPick();
      this.toast.success("Update added successfully");

      // Show dialog asking if they want to send notification
      const prayerTitle =
        this.allPrayers.find((p) => p.id === prayerId)?.title || "Prayer";
      this.sendDialogPrayerId = prayerId;
      this.sendDialogUpdateId = data.id;
      this.sendDialogPrayerTitle = prayerTitle;
      this.sendDialogType = "update";
      this.showSendNotificationDialog = true;

      // Trigger reload on main site
      this.prayerService.loadPrayers();
    } catch (err: unknown) {
      console.error("Error saving update:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save update";
      this.error = errorMessage;
      this.sectionExpanded = true;
      this.toast.error(errorMessage);
    } finally {
      this.savingUpdate = false;
      this.cdr.markForCheck();
    }
  }

  cancelAddUpdate(): void {
    this.addingUpdate = null;
    this.newUpdate = {
      content: "",
      firstName: "",
      lastName: "",
      author_email: "",
    };
    this.resetAddUpdateSubscriberPick();
  }

  isUpdateFormValid(): boolean {
    return !!(
      this.newUpdate.firstName.trim() &&
      this.newUpdate.lastName.trim() &&
      this.newUpdate.author_email.trim() &&
      this.newUpdate.content.trim()
    );
  }

  async deleteUpdate(
    prayerId: string,
    updateId: string,
    updateContent: string
  ): Promise<void> {
    const preview =
      updateContent.substring(0, 50) + (updateContent.length > 50 ? "..." : "");
    if (
      !confirm(
        `Are you sure you want to delete this update? "${preview}"\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      this.deleting = true;
      this.error = null;

      const { error: deleteError } = await this.supabaseService
        .getClient()
        .from("prayer_updates")
        .delete()
        .eq("id", updateId);

      if (deleteError) {
        throw new Error(`Failed to delete update: ${deleteError.message}`);
      }

      this.allPrayers = this.allPrayers.map((p) => {
        if (p.id === prayerId && p.prayer_updates) {
          return {
            ...p,
            prayer_updates: p.prayer_updates.filter((u) => u.id !== updateId),
          };
        }
        return p;
      });
      this.loadPageData();

      this.toast.success("Update deleted successfully");

      // Trigger reload on main site
      this.prayerService.loadPrayers().catch((err) => {
        console.debug(
          "[PrayerSearch] Refresh after update delete failed:",
          err
        );
      });
    } catch (err: unknown) {
      console.error("Error deleting update:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete update";
      this.error = errorMessage;
      this.sectionExpanded = true;
      this.toast.error(errorMessage);
    } finally {
      this.deleting = false;
    }
  }

  startEditUpdate(prayerId: string, update: PrayerEditorUpdate): void {
    this.editingUpdateId = update.id;
    this.editingUpdatePrayerId = prayerId;
    this.editUpdateForm = {
      content: update.content,
      author: update.author,
      author_email: update.author_email || "",
    };
  }

  cancelEditUpdate(): void {
    this.editingUpdateId = null;
    this.editingUpdatePrayerId = null;
    this.editUpdateForm = { content: "", author: "", author_email: "" };
  }

  isEditUpdateFormValid(): boolean {
    return !!(
      this.editUpdateForm.content.trim() &&
      this.editUpdateForm.author.trim() &&
      this.editUpdateForm.author_email.trim()
    );
  }

  async saveEditUpdate(prayerId: string, updateId: string): Promise<void> {
    if (!this.isEditUpdateFormValid()) {
      this.error = "All fields are required";
      this.sectionExpanded = true;
      this.toast.error(this.error);
      return;
    }

    try {
      this.savingEditUpdate = true;
      this.cdr.markForCheck();
      this.error = null;

      const approvedAt = new Date().toISOString();

      const { error: updateError } = await this.supabaseService
        .getClient()
        .from("prayer_updates")
        .update({
          content: this.editUpdateForm.content.trim(),
          author: this.editUpdateForm.author.trim(),
          author_email: this.editUpdateForm.author_email.trim(),
          approved_at: approvedAt,
        })
        .eq("id", updateId);

      if (updateError) {
        throw new Error(`Failed to update: ${updateError.message}`);
      }

      this.allPrayers = this.allPrayers.map((p) => {
        if (p.id === prayerId && p.prayer_updates) {
          return {
            ...p,
            prayer_updates: p.prayer_updates.map((u) =>
              u.id === updateId
                ? {
                    ...u,
                    content: this.editUpdateForm.content.trim(),
                    author: this.editUpdateForm.author.trim(),
                    author_email: this.editUpdateForm.author_email.trim(),
                    approved_at: approvedAt,
                  }
                : u
            ),
          };
        }
        return p;
      });
      this.loadPageData();

      this.toast.success("Update saved successfully");
      this.cancelEditUpdate();

      // Show dialog asking if they want to send notification
      const prayer = this.allPrayers.find((p) => p.id === prayerId);
      this.sendDialogPrayerId = prayerId;
      this.sendDialogUpdateId = updateId;
      this.sendDialogPrayerTitle = prayer?.title;
      this.sendDialogType = "update";
      this.showSendNotificationDialog = true;

      // Trigger reload on main site
      await this.prayerService.loadPrayers();

      this.savingEditUpdate = false;
      this.cdr.markForCheck();
    } catch (err: unknown) {
      console.error("Error updating update:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update";
      this.error = errorMessage;
      this.sectionExpanded = true;
      this.toast.error(errorMessage);
    } finally {
      this.savingEditUpdate = false;
    }
  }

  clearSearch(): void {
    if (this.mainSearchDebounceTimer) {
      clearTimeout(this.mainSearchDebounceTimer);
      this.mainSearchDebounceTimer = null;
    }
    this.searchTerm = "";
    this.allPrayers = [];
    this.displayPrayers = [];
    this.selectedPrayers = new Set();
    this.error = null;
    this.currentPage = 1;
    this.totalItems = 0;
    void this.handleSearch();
  }


  async onConfirmSendNotification() {
    try {
      if (this.sendDialogType === "prayer" && this.sendDialogPrayerId) {
        await this.adminDataService.sendBroadcastNotificationForNewPrayer(
          this.sendDialogPrayerId
        );
        this.toast.success("Notification emails sent to subscribers");
      } else if (this.sendDialogType === "update" && this.sendDialogUpdateId) {
        await this.adminDataService.sendBroadcastNotificationForNewUpdate(
          this.sendDialogUpdateId
        );
        this.toast.success("Update notification emails sent to subscribers");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      this.toast.error("Failed to send notification emails");
    } finally {
      this.onDeclineSendNotification();
    }
  }

  onDeclineSendNotification() {
    this.showSendNotificationDialog = false;
    this.sendDialogPrayerId = undefined;
    this.sendDialogUpdateId = undefined;
    this.sendDialogPrayerTitle = undefined;
    this.cdr.markForCheck();
  }

  /**
   * Sort prayers by most recent activity (creation or update)
   * This matches the sorting logic used on the main site
   */
  sortPrayersByLatestActivity(prayers: PrayerEditorPrayer[]): PrayerEditorPrayer[] {
    return prayers
      .map((prayer) => {
        // First sort the updates within each prayer from newest to oldest
        const sortedUpdates =
          prayer.prayer_updates && prayer.prayer_updates.length > 0
            ? [...prayer.prayer_updates].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
            : [];

        return {
          ...prayer,
          prayer_updates: sortedUpdates,
          latestActivity: Math.max(
            new Date(prayer.created_at).getTime(),
            sortedUpdates.length > 0
              ? new Date(sortedUpdates[0].created_at).getTime()
              : 0
          ),
        };
      })
      .sort((a, b) => b.latestActivity - a.latestActivity)
      .map(({ latestActivity, ...prayer }) => prayer);
  }
}
