import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import type { PrayerTypeFormSavedEvent } from '../components/admin-prayer-type-form/admin-prayer-type-form.component';
import type { PrayerTypeConfirmationAction } from './admin-prayer-types-confirmations';
import type { PrayerTypeRecord } from '../types/prayer';
import { countActivePrayerTypes } from './admin-prayer-types-manager';
import {
  buildPrayerTypeActiveToggleConfirmation,
  buildPrayerTypeBookletToggleConfirmation,
  buildPrayerTypeDeleteConfirmation,
} from './admin-prayer-types-confirmations';
import { applyAdminSectionToggle } from './admin-section-lazy-load';
import {
  buildPrayerTypesFacadeMutationCallbacks,
  runPrayerTypesFacadeConfirmation,
  runPrayerTypesFacadeFetch,
  runPrayerTypesFacadeReorder,
} from './admin-prayer-types-facade-run';
import { runPrayerTypesTourInitialState } from './admin-prayer-types-facade-tour';
import type {
  PrayerTypesDialogsHostRef,
  PrayerTypesFacadeDeps,
  PrayerTypesPanelHostRef,
} from './admin-prayer-types-facade-host';

export type {
  PrayerTypesDialogsHostRef,
  PrayerTypesFacadeDeps,
  PrayerTypesPanelHostRef,
} from './admin-prayer-types-facade-host';

export class PrayerTypesFacade {
  sectionExpanded = false;
  sectionInitialLoadDone = false;

  types: PrayerTypeRecord[] = [];
  loading = false;
  showAddForm = false;
  error: string | null = null;
  success: string | null = null;

  editingType: PrayerTypeRecord | null = null;
  reordering = false;

  panelRef?: PrayerTypesPanelHostRef;
  dialogsRef?: PrayerTypesDialogsHostRef;

  protected readonly supabase: PrayerTypesFacadeDeps['supabase'];
  public readonly toast: PrayerTypesFacadeDeps['toast'];
  public readonly promptService: PrayerTypesFacadeDeps['promptService'];
  public readonly markForCheck: () => void;
  private readonly afterBookletUiRefresh?: () => void;

  constructor(deps: PrayerTypesFacadeDeps) {
    this.supabase = deps.supabase;
    this.toast = deps.toast;
    this.promptService = deps.promptService;
    this.markForCheck = deps.markForCheck;
    this.afterBookletUiRefresh = deps.afterBookletUiRefresh;
  }

  protected notifySaved(): void {}

  onSectionToggle(): void {
    applyAdminSectionToggle(this, () => void this.fetchTypes());
  }

  async prepareTourInitialState(): Promise<void> {
    await runPrayerTypesTourInitialState(this);
  }

  async fetchTypes(): Promise<void> {
    await runPrayerTypesFacadeFetch(this, this.supabase);
  }

  toggleAddForm(): void {
    if (this.showAddForm) {
      this.closeTypeForm();
      return;
    }
    this.editingType = null;
    this.showAddForm = true;
    this.error = null;
    this.success = null;
    this.panelRef?.resetTypeFormForAdd();
    this.markForCheck();
  }

  closeTypeForm(): void {
    this.showAddForm = false;
    this.editingType = null;
    this.error = null;
    this.panelRef?.resetTypeFormForAdd();
    this.markForCheck();
  }

  onChildError(message: string): void {
    this.error = message;
    this.success = null;
    this.markForCheck();
  }

  async onTypeSaved(event: PrayerTypeFormSavedEvent): Promise<void> {
    this.success = event.successMessage;
    this.error = null;
    this.showAddForm = false;
    this.editingType = null;
    this.markForCheck();
    await this.fetchTypes();
    this.notifySaved();
  }

  handleEdit(type: PrayerTypeRecord): void {
    this.editingType = type;
    this.showAddForm = true;
    this.error = null;
    this.success = null;
    this.markForCheck();
  }

  handleDelete(id: string, name: string): void {
    this.dialogsRef?.openConfirmation(
      buildPrayerTypeDeleteConfirmation(name),
      { kind: 'delete', deleteId: id },
    );
  }

  beginIncludeInBookletToggle(type: PrayerTypeRecord): void {
    this.dialogsRef?.openConfirmation(
      buildPrayerTypeBookletToggleConfirmation(type),
      { kind: 'toggleBooklet', type },
    );
  }

  beginActiveToggle(type: PrayerTypeRecord): void {
    this.dialogsRef?.openConfirmation(
      buildPrayerTypeActiveToggleConfirmation(type),
      { kind: 'toggleActive', type },
    );
  }

  async onConfirmationConfirmed(
    action: PrayerTypeConfirmationAction,
  ): Promise<void> {
    await runPrayerTypesFacadeConfirmation(
      this.supabase,
      action,
      this.mutationCallbacks(),
    );
  }

  private mutationCallbacks() {
    return buildPrayerTypesFacadeMutationCallbacks(
      this,
      () => this.afterBookletUiRefresh?.(),
    );
  }

  async onDrop(event: CdkDragDrop<PrayerTypeRecord[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;

    const original = [...this.types];
    moveItemInArray(this.types, event.previousIndex, event.currentIndex);
    this.reordering = true;

    await runPrayerTypesFacadeReorder(this.supabase, this.types, {
      ...this.mutationCallbacks(),
      restoreTypes: () => {
        this.types = original;
      },
    });

    this.reordering = false;
  }

  getActiveCount(): number {
    return countActivePrayerTypes(this.types);
  }
}
