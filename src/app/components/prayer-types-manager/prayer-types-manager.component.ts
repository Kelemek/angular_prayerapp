import {
  ApplicationRef,
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PromptService } from '../../services/prompt.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import {
  AdminPrayerTypeFormComponent,
  type PrayerTypeFormSavedEvent,
} from '../admin-prayer-type-form/admin-prayer-type-form.component';
import { AdminPrayerTypeRowComponent } from '../admin-prayer-type-row/admin-prayer-type-row.component';
import type { PrayerTypeRecord } from '../../types/prayer';
import {
  countActivePrayerTypes,
  type PrayerTypeConfirmationKind,
} from '../../lib/admin-prayer-types-manager';

@Component({
  selector: 'app-prayer-types-manager',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    ConfirmationDialogComponent,
    AdminPrayerTypeFormComponent,
    AdminPrayerTypeRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prayer-types-manager.component.html',
  styles: [],
})
export class PrayerTypesManagerComponent {
  @Output() onSave = new EventEmitter<void>();

  @ViewChild('typeFormRef')
  typeFormRef?: AdminPrayerTypeFormComponent;

  sectionExpanded = false;
  private sectionInitialLoadDone = false;

  types: PrayerTypeRecord[] = [];
  loading = false;
  showAddForm = false;
  error: string | null = null;
  success: string | null = null;

  showConfirmationDialog = false;
  confirmationKind: PrayerTypeConfirmationKind | null = null;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationIsDangerous = true;
  confirmationConfirmText = 'Delete';
  confirmationDeleteId: string | null = null;
  pendingToggleType: PrayerTypeRecord | null = null;

  editingType: PrayerTypeRecord | null = null;
  reordering = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toast: ToastService,
    private readonly promptService: PromptService,
    private readonly cdr: ChangeDetectorRef,
    private readonly appRef: ApplicationRef,
  ) {}

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.fetchTypes();
    }
    this.cdr.markForCheck();
  }

  async prepareTourInitialState(): Promise<void> {
    this.closeTypeForm();
    if (!this.sectionExpanded) {
      this.sectionExpanded = true;
      if (!this.sectionInitialLoadDone) {
        this.sectionInitialLoadDone = true;
        await this.fetchTypes();
      }
      this.cdr.markForCheck();
      return;
    }
    if (!this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      await this.fetchTypes();
    }
    this.cdr.markForCheck();
  }

  async fetchTypes(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;

      const { data, error } = await this.supabase.directQuery<PrayerTypeRecord>(
        'prayer_types',
        {
          select: '*',
          order: { column: 'display_order', ascending: true },
          timeout: 15000,
        },
      );

      if (error) throw error;
      this.types = Array.isArray(data) ? data : data ? [data] : [];
    } catch (err: unknown) {
      console.error('Error fetching prayer types:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Unknown error';
      this.error = message;
      this.sectionExpanded = true;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
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
    this.typeFormRef?.resetForAdd();
    this.cdr.markForCheck();
  }

  closeTypeForm(): void {
    this.showAddForm = false;
    this.editingType = null;
    this.error = null;
    this.typeFormRef?.resetForAdd();
    this.cdr.markForCheck();
  }

  onChildError(message: string): void {
    this.error = message;
    this.success = null;
    this.cdr.markForCheck();
  }

  async onTypeSaved(event: PrayerTypeFormSavedEvent): Promise<void> {
    this.success = event.successMessage;
    this.error = null;
    this.showAddForm = false;
    this.editingType = null;
    this.cdr.markForCheck();
    await this.fetchTypes();
    this.onSave.emit();
  }

  handleEdit(type: PrayerTypeRecord): void {
    this.editingType = type;
    this.showAddForm = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();
  }

  handleDelete(id: string, name: string): void {
    this.confirmationKind = 'delete';
    this.confirmationTitle = 'Delete Prayer Type';
    this.confirmationMessage = `Are you sure you want to delete the "${name}" type? This may affect existing prayer prompts using this type.`;
    this.confirmationIsDangerous = true;
    this.confirmationConfirmText = 'Delete';
    this.confirmationDeleteId = id;
    this.pendingToggleType = null;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  beginIncludeInBookletToggle(type: PrayerTypeRecord): void {
    const includeNext = !(type.include_in_booklet ?? false);
    this.confirmationKind = 'toggleBooklet';
    this.pendingToggleType = type;
    this.confirmationDeleteId = null;
    this.confirmationTitle = includeNext
      ? 'Include in saddle-stitch booklet?'
      : 'Remove from saddle-stitch booklet?';
    this.confirmationMessage = includeNext
      ? `Include prompts for "${type.name}" in Admin → Tools → Saddle-stitch booklet (after answered prayers)?`
      : `Stop including "${type.name}" prompts in the saddle-stitch booklet printout?`;
    this.confirmationIsDangerous = false;
    this.confirmationConfirmText = 'Confirm';
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  beginActiveToggle(type: PrayerTypeRecord): void {
    const activating = !type.is_active;
    this.confirmationKind = 'toggleActive';
    this.pendingToggleType = type;
    this.confirmationDeleteId = null;
    this.confirmationTitle = activating ? 'Activate prayer type?' : 'Deactivate prayer type?';
    this.confirmationMessage = activating
      ? `"${type.name}" will appear in prayer prompt type dropdowns.`
      : `"${type.name}" will be hidden from dropdowns until you activate it again.`;
    this.confirmationIsDangerous = false;
    this.confirmationConfirmText = 'Confirm';
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  async onConfirmationConfirm(): Promise<void> {
    const kind = this.confirmationKind;
    const deleteId = this.confirmationDeleteId;
    const pendingType = this.pendingToggleType;

    this.showConfirmationDialog = false;
    this.confirmationKind = null;
    this.confirmationDeleteId = null;
    this.pendingToggleType = null;

    if (kind === 'delete') {
      if (!deleteId) return;

      try {
        this.error = null;
        this.success = null;

        const { error } = await this.supabase.client
          .from('prayer_types')
          .delete()
          .eq('id', deleteId);

        if (error) throw error;

        this.success = 'Prayer type deleted successfully!';
        await this.fetchTypes();
        await this.promptService.loadPrompts();
      } catch (err: unknown) {
        console.error('Error deleting prayer type:', err);
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String(err.message)
            : 'Unknown error';
        this.error = message;
      } finally {
        this.cdr.markForCheck();
      }
      return;
    }

    if (kind === 'toggleBooklet') {
      if (!pendingType) return;
      await this.toggleIncludeInBooklet(pendingType);
      return;
    }

    if (kind === 'toggleActive') {
      if (!pendingType) return;
      await this.toggleActive(pendingType);
    }
  }

  onConfirmationCancel(): void {
    this.showConfirmationDialog = false;
    this.confirmationKind = null;
    this.confirmationDeleteId = null;
    this.pendingToggleType = null;
    this.cdr.markForCheck();
  }

  async toggleIncludeInBooklet(type: PrayerTypeRecord): Promise<void> {
    try {
      this.error = null;
      this.success = null;

      const { error } = await this.supabase.client
        .from('prayer_types')
        .update({ include_in_booklet: !type.include_in_booklet })
        .eq('id', type.id);

      if (error) throw error;

      await this.fetchTypes();
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
    } catch (err: unknown) {
      console.error('Error updating booklet inclusion:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Unknown error';
      this.error = message;
      this.toast.error(`Could not update booklet setting: ${message}`);
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      this.appRef.tick();
    }
  }

  async toggleActive(type: PrayerTypeRecord): Promise<void> {
    try {
      this.error = null;
      this.success = null;

      const { error } = await this.supabase.client
        .from('prayer_types')
        .update({ is_active: !type.is_active })
        .eq('id', type.id);

      if (error) throw error;

      this.success = `Prayer type ${!type.is_active ? 'activated' : 'deactivated'} successfully!`;
      await this.fetchTypes();
      await this.promptService.loadPrompts();
    } catch (err: unknown) {
      console.error('Error toggling prayer type:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Unknown error';
      this.error = message;
    } finally {
      this.cdr.markForCheck();
    }
  }

  async onDrop(event: CdkDragDrop<PrayerTypeRecord[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;

    const original = [...this.types];

    moveItemInArray(this.types, event.previousIndex, event.currentIndex);
    this.reordering = true;
    this.error = null;

    try {
      const updates = this.types.map((t, idx) =>
        this.supabase.client
          .from('prayer_types')
          .update({ display_order: idx })
          .eq('id', t.id),
      );

      const results = await Promise.all(updates);

      const errorResult = results.find((r) => r.error);
      if (errorResult?.error) throw errorResult.error;

      await this.fetchTypes();
      await this.promptService.loadPrompts();
    } catch (err: unknown) {
      console.error('Error reordering prayer types:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Unknown error';
      this.error = message;
      this.types = original;
    } finally {
      this.reordering = false;
      this.cdr.markForCheck();
    }
  }

  getActiveCount(): number {
    return countActivePrayerTypes(this.types);
  }
}
