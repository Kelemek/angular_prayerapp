import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSubscriberPickComponent } from '../admin-subscriber-pick/admin-subscriber-pick.component';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import { splitSubscriberName, type SubscriberPickRow } from '../../lib/admin-subscriber-pick';
import {
  EMPTY_PRAYER_EDITOR_CREATE_FORM,
  prayerEditorApprovalStatusColor,
  prayerEditorStatusColor,
  type PrayerEditorCreateForm,
  type PrayerEditorPrayer,
} from '../../lib/admin-prayer-editor-types';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PrayerService } from '../../services/prayer.service';

@Component({
  selector: 'app-admin-prayer-editor-create-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminSubscriberPickComponent,
    RichTextEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-create-form.component.html',
})
export class AdminPrayerEditorCreateFormComponent {
  @Output() cancel = new EventEmitter<void>();
  @Output() created = new EventEmitter<PrayerEditorPrayer>();

  createForm: PrayerEditorCreateForm = { ...EMPTY_PRAYER_EDITOR_CREATE_FORM };
  saving = false;

  @ViewChild('createSubscriberPick')
  private createSubscriberPick?: AdminSubscriberPickComponent;
  @ViewChild('createDescriptionEditor')
  private createDescriptionEditor?: RichTextEditorComponent;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly toast: ToastService,
    private readonly prayerService: PrayerService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  resetForm(): void {
    this.createForm = { ...EMPTY_PRAYER_EDITOR_CREATE_FORM };
    this.createSubscriberPick?.reset();
    this.cdr.markForCheck();
  }

  flushDescriptionEditor(): void {
    this.createDescriptionEditor?.flushMarkdownToForm();
  }

  onCreateSubscriberSelected(row: SubscriberPickRow): void {
    const { firstName, lastName } = splitSubscriberName(row.name);
    this.createForm.firstName = firstName;
    this.createForm.lastName = lastName;
    this.createForm.email = row.email.trim();
    this.cdr.markForCheck();
  }

  onCancelClick(): void {
    this.resetForm();
    this.cancel.emit();
  }

  async onCreateClick(event: Event): Promise<void> {
    event.preventDefault();
    this.flushDescriptionEditor();
    this.cdr.markForCheck();

    if (!this.isFormValid()) {
      this.toast.error('All fields are required');
      return;
    }

    try {
      this.saving = true;
      this.cdr.markForCheck();

      const fullName = `${this.createForm.firstName.trim()} ${this.createForm.lastName.trim()}`;
      const generatedTitle = `Prayer for ${this.createForm.prayer_for.trim()}`;
      const approvedAt = new Date().toISOString();

      const { data, error: insertError } = await this.supabaseService
        .getClient()
        .from('prayers')
        .insert({
          title: generatedTitle,
          description: this.createForm.description.trim(),
          requester: fullName,
          email: this.createForm.email.trim() || null,
          prayer_for: this.createForm.prayer_for.trim(),
          status: this.createForm.status,
          is_anonymous: this.createForm.is_anonymous,
          approval_status: 'approved',
          approved_at: approvedAt,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create prayer: ${insertError.message}`);
      }

      this.resetForm();
      this.toast.success('Prayer created successfully');
      this.created.emit(data as PrayerEditorPrayer);
      await this.prayerService.loadPrayers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create prayer';
      this.toast.error(message);
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  private isFormValid(): boolean {
    return !!(
      this.createForm.firstName.trim() &&
      this.createForm.lastName.trim() &&
      this.createForm.email.trim() &&
      this.createForm.prayer_for.trim() &&
      this.createForm.description.trim()
    );
  }
}
