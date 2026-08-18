import type { PrayerPrompt, PrayerTypeRecord } from '../types/prayer';
import type { PromptManagerCreateSavedEvent } from '../components/admin-prompt-manager-create-form/admin-prompt-manager-create-form.component';
import type { PromptManagerEditSavedEvent } from '../components/admin-prompt-manager-edit-inline/admin-prompt-manager-edit-inline.component';
import type { PromptManagerDeleteConfirmationAction } from './admin-prompt-manager-confirmations';
import {
  PromptManagerSearchDebouncer,
  PROMPT_MANAGER_SEARCH_CONFIG,
} from './admin-prompt-manager-search-debounce';
import { buildPromptManagerDeleteConfirmation } from './admin-prompt-manager-confirmations';
import {
  bootstrapPromptManagerSection,
  runPromptManagerFacadeDelete,
  runPromptManagerFacadeSearch,
  runPromptManagerFetchPrayerTypes,
} from './admin-prompt-manager-facade-run';
import { runPromptManagerTourInitialState } from './admin-prompt-manager-facade-tour';
import { applyAdminSectionToggle } from './admin-section-lazy-load';
import type {
  PromptManagerDialogsHostRef,
  PromptManagerFacadeDeps,
  PromptManagerPanelHostRef,
} from './admin-prompt-manager-facade-host';

export type {
  PromptManagerDialogsHostRef,
  PromptManagerFacadeDeps,
  PromptManagerPanelHostRef,
} from './admin-prompt-manager-facade-host';

export class PromptManagerFacade {
  sectionExpanded = false;
  sectionInitialLoadDone = false;

  prompts: PrayerPrompt[] = [];
  prayerTypes: PrayerTypeRecord[] = [];
  searchQuery = '';
  searching = false;
  hasSearched = false;
  readonly promptSearchMinChars = PROMPT_MANAGER_SEARCH_CONFIG.minChars;
  readonly promptSearchDebounceMs = PROMPT_MANAGER_SEARCH_CONFIG.debounceMs;
  private readonly promptSearchDebouncer = new PromptManagerSearchDebouncer(
    PROMPT_MANAGER_SEARCH_CONFIG.debounceMs,
    () => void this.handleSearch(),
  );

  showAddForm = false;
  showCSVUpload = false;
  error: string | null = null;
  success: string | null = null;

  editingId: string | null = null;

  panelRef?: PromptManagerPanelHostRef;
  dialogsRef?: PromptManagerDialogsHostRef;

  public readonly supabase: PromptManagerFacadeDeps['supabase'];
  public readonly toast: PromptManagerFacadeDeps['toast'];
  public readonly markForCheck: () => void;

  constructor(deps: PromptManagerFacadeDeps) {
    this.supabase = deps.supabase;
    this.toast = deps.toast;
    this.markForCheck = deps.markForCheck;
  }

  protected notifySaved(): void {}

  destroyPromptSearchDebouncer(): void {
    this.promptSearchDebouncer.destroy();
  }

  clearPromptSearchDebouncer(): void {
    this.promptSearchDebouncer.clear();
  }

  onSectionToggle(): void {
    applyAdminSectionToggle(this, () => void this.bootstrapPromptSection());
  }

  async prepareTourInitialState(): Promise<void> {
    await runPromptManagerTourInitialState(this);
  }

  async bootstrapPromptSection(): Promise<void> {
    await bootstrapPromptManagerSection(
      () => this.fetchPrayerTypes(),
      () => this.handleSearch(),
    );
  }

  onPromptSearchQueryChange(value: string): void {
    this.searchQuery = value;
    this.promptSearchDebouncer.schedule(
      value.trim(),
      this.promptSearchMinChars,
      () => this.markForCheck(),
    );
  }

  onPromptSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.flushPromptSearchNow();
    }
  }

  flushPromptSearchNow(): void {
    this.promptSearchDebouncer.flush(
      this.searchQuery.trim(),
      this.promptSearchMinChars,
      () => this.markForCheck(),
    );
  }

  clearPromptSearch(): void {
    this.clearPromptSearchDebouncer();
    this.searchQuery = '';
    void this.handleSearch();
  }

  async fetchPrayerTypes(): Promise<void> {
    this.prayerTypes = await runPromptManagerFetchPrayerTypes(
      this.supabase,
      (typeName) => this.panelRef?.setCreateFormDefaultType(typeName),
    );
  }

  async handleSearch(): Promise<void> {
    await runPromptManagerFacadeSearch(this, this.supabase, this.searchQuery);
  }

  toggleCSVUpload(): void {
    this.showCSVUpload = !this.showCSVUpload;
    this.showAddForm = false;
    this.error = null;
    this.success = null;
    if (!this.showCSVUpload) {
      this.panelRef?.resetCsvPanel();
    }
    this.markForCheck();
  }

  closeCsvUpload(): void {
    this.showCSVUpload = false;
    this.panelRef?.resetCsvPanel();
    this.markForCheck();
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.showCSVUpload = false;
    this.editingId = null;
    this.error = null;
    this.success = null;
    if (this.showAddForm) {
      this.panelRef?.resetCreateForm();
      if (this.prayerTypes.length > 0) {
        this.panelRef?.setCreateFormDefaultType(this.prayerTypes[0].name);
      }
    }
    this.markForCheck();
  }

  closeAddForm(): void {
    this.showAddForm = false;
    this.panelRef?.resetCreateForm();
    this.markForCheck();
  }

  onChildError(message: string): void {
    this.error = message;
    this.success = null;
    this.markForCheck();
  }

  async onPromptCreated(event: PromptManagerCreateSavedEvent): Promise<void> {
    this.success = event.successMessage;
    this.error = null;
    this.showAddForm = false;
    this.markForCheck();
    if (this.hasSearched) {
      await this.handleSearch();
    }
    this.notifySaved();
  }

  async onPromptEdited(event: PromptManagerEditSavedEvent): Promise<void> {
    this.success = event.successMessage;
    this.error = null;
    this.editingId = null;
    this.markForCheck();
    if (this.hasSearched) {
      await this.handleSearch();
    }
    this.notifySaved();
  }

  async onCsvUploaded(event: { successMessage: string }): Promise<void> {
    this.success = event.successMessage;
    this.error = null;
    this.showCSVUpload = false;
    this.markForCheck();
    if (this.hasSearched) {
      await this.handleSearch();
    }
    this.notifySaved();
  }

  handleEdit(prompt: PrayerPrompt): void {
    this.editingId = prompt.id;
    this.showAddForm = false;
    this.showCSVUpload = false;
    this.error = null;
    this.success = null;
    this.markForCheck();
  }

  handleDelete(id: string, title: string): void {
    this.dialogsRef?.openDeleteConfirmation(
      buildPromptManagerDeleteConfirmation(title),
      { kind: 'delete', id, title },
    );
  }

  async onDeleteConfirmed(
    action: PromptManagerDeleteConfirmationAction,
  ): Promise<void> {
    await runPromptManagerFacadeDelete(
      this.supabase,
      action,
      this,
      this.toast,
      () => this.notifySaved(),
    );
  }

  cancelEdit(): void {
    this.editingId = null;
    this.error = null;
    this.success = null;
    this.markForCheck();
  }

  resetCreateForm(): void {
    this.panelRef?.resetCreateForm();
  }

  resetCsvPanel(): void {
    this.panelRef?.resetCsvPanel();
  }
}
