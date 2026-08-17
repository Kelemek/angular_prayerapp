import {
  ApplicationRef,
  Component,
  OnDestroy,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { AdminPromptManagerCsvPanelComponent } from '../admin-prompt-manager-csv-panel/admin-prompt-manager-csv-panel.component';
import {
  AdminPromptManagerCreateFormComponent,
  type PromptManagerCreateSavedEvent,
} from '../admin-prompt-manager-create-form/admin-prompt-manager-create-form.component';
import {
  AdminPromptManagerEditInlineComponent,
  type PromptManagerEditSavedEvent,
} from '../admin-prompt-manager-edit-inline/admin-prompt-manager-edit-inline.component';
import { AdminPromptManagerCardComponent } from '../admin-prompt-manager-card/admin-prompt-manager-card.component';
import type { PrayerPrompt, PrayerTypeRecord } from '../../types/prayer';
import {
  PromptManagerSearchDebouncer,
  PROMPT_MANAGER_SEARCH_CONFIG,
} from '../../lib/admin-prompt-manager-search-debounce';
import { toggleAdminSectionLazyLoad } from '../../lib/admin-section-lazy-load';

@Component({
  selector: 'app-prompt-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmationDialogComponent,
    AdminPromptManagerCsvPanelComponent,
    AdminPromptManagerCreateFormComponent,
    AdminPromptManagerEditInlineComponent,
    AdminPromptManagerCardComponent,
  ],
  templateUrl: './prompt-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [],
})
export class PromptManagerComponent implements OnDestroy {
  @Output() onSave = new EventEmitter<void>();

  @ViewChild('createFormRef')
  createFormRef?: AdminPromptManagerCreateFormComponent;

  @ViewChild('csvPanelRef')
  csvPanelRef?: AdminPromptManagerCsvPanelComponent;

  sectionExpanded = false;
  private sectionInitialLoadDone = false;

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

  showConfirmationDialog = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationDeleteId: string | null = null;

  editingId: string | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly appRef: ApplicationRef,
  ) {}

  onSectionToggle(): void {
    const toggled = toggleAdminSectionLazyLoad({
      sectionExpanded: this.sectionExpanded,
      sectionInitialLoadDone: this.sectionInitialLoadDone,
    });
    this.sectionExpanded = toggled.gate.sectionExpanded;
    this.sectionInitialLoadDone = toggled.gate.sectionInitialLoadDone;
    if (toggled.shouldInitialLoad) {
      void this.bootstrapPromptSection();
    }
    this.cdr.markForCheck();
  }

  async prepareTourInitialState(): Promise<void> {
    this.cancelEdit();
    this.showAddForm = false;
    this.showCSVUpload = false;
    this.createFormRef?.resetForm();
    this.csvPanelRef?.reset();
    this.promptSearchDebouncer.clear();
    if (!this.sectionExpanded) {
      this.sectionExpanded = true;
      if (!this.sectionInitialLoadDone) {
        this.sectionInitialLoadDone = true;
        await this.bootstrapPromptSection();
      }
      this.cdr.markForCheck();
      return;
    }
    if (!this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      await this.bootstrapPromptSection();
    }
    this.cdr.markForCheck();
  }

  private async bootstrapPromptSection(): Promise<void> {
    await this.fetchPrayerTypes();
    await this.handleSearch();
  }

  ngOnDestroy(): void {
    this.promptSearchDebouncer.destroy();
  }

  onPromptSearchQueryChange(value: string): void {
    this.searchQuery = value;
    this.promptSearchDebouncer.schedule(
      value.trim(),
      this.promptSearchMinChars,
      () => this.cdr.markForCheck(),
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
      () => this.cdr.markForCheck(),
    );
  }

  clearPromptSearch(): void {
    this.promptSearchDebouncer.clear();
    this.searchQuery = '';
    void this.handleSearch();
  }

  async fetchPrayerTypes(): Promise<void> {
    try {
      const { data, error } = await this.supabase.directQuery<PrayerTypeRecord>(
        'prayer_types',
        {
          select: '*',
          eq: { is_active: true },
          order: { column: 'display_order', ascending: true },
          timeout: 15000,
        },
      );

      if (error) throw error;
      this.prayerTypes = Array.isArray(data) ? data : data ? [data] : [];
      if (this.createFormRef && this.prayerTypes.length > 0) {
        this.createFormRef.type = this.prayerTypes[0].name;
      }
    } catch (err: unknown) {
      console.error('Error fetching prayer types:', err);
    }
  }

  async handleSearch(): Promise<void> {
    try {
      this.searching = true;
      this.cdr.markForCheck();
      this.error = null;
      this.success = null;
      this.hasSearched = true;

      const query = this.searchQuery.trim().toLowerCase();

      const { data, error } = await this.supabase.directQuery<PrayerPrompt>(
        'prayer_prompts',
        {
          select: '*',
          order: { column: 'type', ascending: true },
          limit: 500,
          timeout: 15000,
        },
      );

      if (error) throw error;

      let prompts = Array.isArray(data) ? data : data ? [data] : [];

      if (query) {
        prompts = prompts.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.type.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query),
        );
      }

      this.prompts = prompts;
    } catch (err: unknown) {
      console.error('Error searching prompts:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Unknown error';
      this.error = `Failed to search prompts: ${message}`;
      this.sectionExpanded = true;
    } finally {
      this.searching = false;
      this.cdr.markForCheck();
    }
  }

  toggleCSVUpload(): void {
    this.showCSVUpload = !this.showCSVUpload;
    this.showAddForm = false;
    this.error = null;
    this.success = null;
    if (!this.showCSVUpload) {
      this.csvPanelRef?.reset();
    }
    this.cdr.markForCheck();
  }

  closeCsvUpload(): void {
    this.showCSVUpload = false;
    this.csvPanelRef?.reset();
    this.cdr.markForCheck();
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.showCSVUpload = false;
    this.editingId = null;
    this.error = null;
    this.success = null;
    if (this.showAddForm) {
      this.createFormRef?.resetForm();
      if (this.prayerTypes.length > 0 && this.createFormRef) {
        this.createFormRef.type = this.prayerTypes[0].name;
      }
    }
    this.cdr.markForCheck();
  }

  closeAddForm(): void {
    this.showAddForm = false;
    this.createFormRef?.resetForm();
    this.cdr.markForCheck();
  }

  onChildError(message: string): void {
    this.error = message;
    this.success = null;
    this.cdr.markForCheck();
  }

  async onPromptCreated(event: PromptManagerCreateSavedEvent): Promise<void> {
    this.success = event.successMessage;
    this.error = null;
    this.showAddForm = false;
    this.cdr.markForCheck();
    if (this.hasSearched) {
      await this.handleSearch();
    }
    this.onSave.emit();
  }

  async onPromptEdited(event: PromptManagerEditSavedEvent): Promise<void> {
    this.success = event.successMessage;
    this.error = null;
    this.editingId = null;
    this.cdr.markForCheck();
    if (this.hasSearched) {
      await this.handleSearch();
    }
    this.onSave.emit();
  }

  async onCsvUploaded(event: { successMessage: string }): Promise<void> {
    this.success = event.successMessage;
    this.error = null;
    this.showCSVUpload = false;
    this.cdr.markForCheck();
    if (this.hasSearched) {
      await this.handleSearch();
    }
    this.onSave.emit();
  }

  handleEdit(prompt: PrayerPrompt): void {
    this.editingId = prompt.id;
    this.showAddForm = false;
    this.showCSVUpload = false;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
  }

  handleDelete(id: string, title: string): void {
    this.confirmationTitle = 'Delete Prompt';
    this.confirmationMessage = `Are you sure you want to delete "${title}"?`;
    this.confirmationDeleteId = id;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  async onConfirmDelete(): Promise<void> {
    if (!this.confirmationDeleteId) return;

    const id = this.confirmationDeleteId;
    this.showConfirmationDialog = false;
    this.confirmationDeleteId = null;

    try {
      this.error = null;
      this.success = null;

      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.success = 'Prayer prompt deleted successfully!';
      this.toast.success('Prompt deleted.');

      if (this.editingId === id) {
        this.editingId = null;
      }

      if (this.hasSearched) {
        await this.handleSearch();
      }

      this.onSave.emit();
    } catch (err: unknown) {
      console.error('Error deleting prompt:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Unknown error';
      this.error = `Failed to delete prayer prompt: ${message}`;
      this.toast.error(`Could not delete prompt: ${message}`);
    } finally {
      this.cdr.markForCheck();
    }
  }

  onCancelDelete(): void {
    this.showConfirmationDialog = false;
    this.confirmationDeleteId = null;
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.editingId = null;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
  }
}
