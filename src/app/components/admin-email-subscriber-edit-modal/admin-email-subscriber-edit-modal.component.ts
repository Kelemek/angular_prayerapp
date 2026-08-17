import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import type { EmailSubscriberRow } from '../../lib/admin-email-subscribers';

@Component({
  selector: 'app-admin-email-subscriber-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-subscriber-edit-modal.component.html',
})
export class AdminEmailSubscriberEditModalComponent implements OnChanges {
  @Input({ required: true }) subscriber!: EmailSubscriberRow;
  @Output() saved = new EventEmitter<{ id: string; name: string }>();
  @Output() closed = new EventEmitter<void>();

  editName = '';
  editSaving = false;
  editError: string | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(): void {
    this.editName = this.subscriber.name || '';
    this.editError = null;
    this.editSaving = false;
  }

  onCloseClick(): void {
    this.closed.emit();
  }

  async onSaveClick(): Promise<void> {
    const trimmedName = this.editName.trim();
    if (!trimmedName) {
      this.editError = 'Name is required';
      this.cdr.markForCheck();
      return;
    }

    try {
      this.editSaving = true;
      this.editError = null;
      this.cdr.markForCheck();

      const { error } = await this.supabase.client
        .from('email_subscribers')
        .update({ name: trimmedName })
        .eq('id', this.subscriber.id);

      if (error) throw error;

      this.toast.success('Subscriber updated');
      this.saved.emit({ id: this.subscriber.id, name: trimmedName });
    } catch (err: unknown) {
      console.error('Error updating subscriber:', err);
      this.editError =
        err instanceof Error ? err.message : 'Failed to update subscriber';
      this.cdr.markForCheck();
    } finally {
      this.editSaving = false;
      this.cdr.markForCheck();
    }
  }
}
