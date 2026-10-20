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
  @Output() saved = new EventEmitter<{
    id: string;
    name: string;
    prayer_groups_enabled: boolean;
  }>();
  @Output() closed = new EventEmitter<void>();

  editName = '';
  editPrayerGroupsEnabled = false;
  editSaving = false;
  membershipSaving = false;
  editError: string | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(): void {
    this.editName = this.subscriber.name || '';
    this.editPrayerGroupsEnabled = this.subscriber.prayer_groups_enabled === true;
    this.editError = null;
    this.editSaving = false;
    this.membershipSaving = false;
  }

  async changeChurchAccess(upgrade: boolean): Promise<void> {
    const confirmed = window.confirm(
      upgrade
        ? 'Give this person church access?'
        : 'Remove church access? They must already belong to a group, and they cannot own a group or be an admin.',
    );
    if (!confirmed) return;
    this.membershipSaving = true;
    this.editError = null;
    this.cdr.markForCheck();
    try {
      const client = await this.supabase.db();
      const { error } = await client.rpc(
        upgrade ? 'admin_upgrade_to_church_member' : 'admin_downgrade_to_group_only',
        { p_subscriber_id: this.subscriber.id },
      );
      if (error) throw error;
      this.subscriber = { ...this.subscriber, is_church_member: upgrade };
      this.toast.success(upgrade ? 'Upgraded to church member' : 'Downgraded to group only');
    } catch (err: unknown) {
      this.editError = err instanceof Error ? err.message : 'Could not change church access';
    } finally {
      this.membershipSaving = false;
      this.cdr.markForCheck();
    }
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

      const { error } = await (await this.supabase.db())
        .from('email_subscribers')
        .update({
          name: trimmedName,
          prayer_groups_enabled: this.editPrayerGroupsEnabled,
        })
        .eq('id', this.subscriber.id);

      if (error) throw error;

      this.toast.success('Subscriber updated');
      this.saved.emit({
        id: this.subscriber.id,
        name: trimmedName,
        prayer_groups_enabled: this.editPrayerGroupsEnabled,
      });
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
