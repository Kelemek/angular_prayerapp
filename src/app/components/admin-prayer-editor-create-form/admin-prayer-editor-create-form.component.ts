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
import { splitSubscriberName, type SubscriberPickRow } from '../../lib/admin-subscriber-pick';
import {
  EMPTY_PRAYER_EDITOR_CREATE_FORM,
  type PrayerEditorCreateForm,
  type PrayerEditorPrayer,
} from '../../lib/admin-prayer-editor-types';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { PrayerService } from '../../services/prayer.service';
import { AdminCreatedEmailSubscriberService } from '../../services/admin-created-email-subscriber.service';
import { AdminDataService } from '../../services/admin-data.service';

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
    private readonly adminCreatedSubscriber: AdminCreatedEmailSubscriberService,
    private readonly adminData: AdminDataService,
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

    const emailError = this.adminCreatedSubscriber.validateEmailFormat(this.createForm.email);
    if (emailError) {
      this.toast.error(emailError);
      return;
    }

    try {
      this.saving = true;
      this.cdr.markForCheck();

      const fullName = `${this.createForm.firstName.trim()} ${this.createForm.lastName.trim()}`;
      const client = await this.supabaseService.getClientWhenReady();
      const subscriberOutcome = await this.adminCreatedSubscriber.ensure(
        fullName,
        this.createForm.email,
      );

      if (subscriberOutcome.status === 'invalid') {
        this.toast.error(subscriberOutcome.error);
        return;
      }

      const normalizedEmail = subscriberOutcome.normalizedEmail;
      const subscriberWasCreated = subscriberOutcome.status === 'created';
      if (subscriberWasCreated) {
        try {
          await this.adminData.sendSubscriberWelcomeEmail(normalizedEmail);
          this.toast.success('Welcome email sent to subscriber');
        } catch (welcomeError: unknown) {
          console.error('Error sending welcome email:', welcomeError);
          this.toast.error('Failed to send welcome email');
        }
      }
      const generatedTitle = `Prayer for ${this.createForm.prayer_for.trim()}`;
      const approvedAt = new Date().toISOString();

      const { data, error: insertError } = await client
        .from('prayers')
        .insert({
          title: generatedTitle,
          description: this.createForm.description.trim(),
          requester: fullName,
          email: normalizedEmail,
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
      if (subscriberWasCreated) {
        this.toast.success('Subscriber added for this requester');
      }
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
