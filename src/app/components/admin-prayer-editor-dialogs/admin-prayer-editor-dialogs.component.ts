import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SendNotificationDialogComponent,
  type NotificationType,
} from '../send-notification-dialog/send-notification-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { AdminDataService } from '../../services/admin-data.service';
import { ToastService } from '../../services/toast.service';
import {
  buildBulkStatusPrayerEditorConfirmation,
  buildDeletePrayerEditorPrayerConfirmation,
  buildDeletePrayerEditorUpdateConfirmation,
  buildDeleteSelectedPrayerEditorConfirmation,
  type PrayerEditorConfirmationAction,
} from '../../lib/admin-prayer-editor-confirmations';
import type { PrayerEditorPrayer } from '../../lib/admin-prayer-editor-types';

export type { PrayerEditorConfirmationAction } from '../../lib/admin-prayer-editor-confirmations';

@Component({
  selector: 'app-admin-prayer-editor-dialogs',
  standalone: true,
  imports: [CommonModule, SendNotificationDialogComponent, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-dialogs.component.html',
})
export class AdminPrayerEditorDialogsComponent {
  @Output() confirmationConfirmed = new EventEmitter<PrayerEditorConfirmationAction>();
  @Output() confirmationCancelled = new EventEmitter<void>();

  showSendNotificationDialog = false;
  sendDialogType: NotificationType = 'prayer';
  sendDialogPrayerTitle?: string;
  private sendDialogPrayerId?: string;
  private sendDialogUpdateId?: string;

  showConfirmationDialog = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationDetails: string | null = null;
  confirmationButtonText = 'Delete';
  confirmationIsDangerous = true;
  confirmationPrayerId: string | null = null;
  confirmationUpdateId: string | null = null;
  isMultiSelectDelete = false;
  isStatusUpdateConfirmation = false;
  isDeleteUpdateConfirmation = false;

  constructor(
    private readonly adminDataService: AdminDataService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  openSendNotificationForPrayer(prayerId: string, prayerTitle: string): void {
    this.sendDialogPrayerId = prayerId;
    this.sendDialogPrayerTitle = prayerTitle;
    this.sendDialogType = 'prayer';
    this.sendDialogUpdateId = undefined;
    this.showSendNotificationDialog = true;
    this.cdr.markForCheck();
  }

  openSendNotificationForUpdate(
    prayerId: string,
    updateId: string,
    prayerTitle: string,
  ): void {
    this.sendDialogPrayerId = prayerId;
    this.sendDialogUpdateId = updateId;
    this.sendDialogPrayerTitle = prayerTitle;
    this.sendDialogType = 'update';
    this.showSendNotificationDialog = true;
    this.cdr.markForCheck();
  }

  openDeletePrayerConfirmation(prayer: PrayerEditorPrayer): void {
    const config = buildDeletePrayerEditorPrayerConfirmation(prayer);
    this.applyConfirmationConfig(config);
    this.confirmationPrayerId = prayer.id;
    this.confirmationUpdateId = null;
    this.isMultiSelectDelete = false;
    this.isStatusUpdateConfirmation = false;
    this.isDeleteUpdateConfirmation = false;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  openDeleteSelectedConfirmation(count: number): void {
    const config = buildDeleteSelectedPrayerEditorConfirmation(count);
    this.applyConfirmationConfig(config);
    this.confirmationPrayerId = null;
    this.confirmationUpdateId = null;
    this.isMultiSelectDelete = true;
    this.isStatusUpdateConfirmation = false;
    this.isDeleteUpdateConfirmation = false;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  openBulkStatusConfirmation(count: number, status: string): void {
    const config = buildBulkStatusPrayerEditorConfirmation(count, status);
    this.applyConfirmationConfig(config);
    this.confirmationPrayerId = null;
    this.confirmationUpdateId = null;
    this.isMultiSelectDelete = false;
    this.isStatusUpdateConfirmation = true;
    this.isDeleteUpdateConfirmation = false;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  openDeleteUpdateConfirmation(
    prayerId: string,
    updateId: string,
    content: string,
  ): void {
    const config = buildDeletePrayerEditorUpdateConfirmation(content);
    this.applyConfirmationConfig(config);
    this.confirmationPrayerId = prayerId;
    this.confirmationUpdateId = updateId;
    this.isMultiSelectDelete = false;
    this.isStatusUpdateConfirmation = false;
    this.isDeleteUpdateConfirmation = true;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  async onConfirmSendNotification(): Promise<void> {
    try {
      if (this.sendDialogType === 'prayer' && this.sendDialogPrayerId) {
        await this.adminDataService.sendBroadcastNotificationForNewPrayer(
          this.sendDialogPrayerId,
        );
        this.toast.success('Notification emails sent to subscribers');
      } else if (this.sendDialogType === 'update' && this.sendDialogUpdateId) {
        await this.adminDataService.sendBroadcastNotificationForNewUpdate(
          this.sendDialogUpdateId,
        );
        this.toast.success('Update notification emails sent to subscribers');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      this.toast.error('Failed to send notification emails');
    } finally {
      this.onDeclineSendNotification();
    }
  }

  onDeclineSendNotification(): void {
    this.showSendNotificationDialog = false;
    this.sendDialogPrayerId = undefined;
    this.sendDialogUpdateId = undefined;
    this.sendDialogPrayerTitle = undefined;
    this.cdr.markForCheck();
  }

  onConfirmDelete(): void {
    let action: PrayerEditorConfirmationAction;
    if (this.isStatusUpdateConfirmation) {
      action = { kind: 'bulkStatus' };
    } else if (this.isMultiSelectDelete) {
      action = { kind: 'deleteMany' };
    } else if (
      this.isDeleteUpdateConfirmation &&
      this.confirmationPrayerId &&
      this.confirmationUpdateId
    ) {
      action = {
        kind: 'deleteUpdate',
        prayerId: this.confirmationPrayerId,
        updateId: this.confirmationUpdateId,
      };
    } else if (this.confirmationPrayerId) {
      action = { kind: 'deleteOne', prayerId: this.confirmationPrayerId };
    } else {
      return;
    }

    this.resetConfirmationState();
    this.confirmationConfirmed.emit(action);
    this.cdr.markForCheck();
  }

  onCancelDelete(): void {
    this.resetConfirmationState();
    this.confirmationCancelled.emit();
    this.cdr.markForCheck();
  }

  private applyConfirmationConfig(config: {
    title: string;
    message: string;
    details?: string | null;
    buttonText: string;
    isDangerous: boolean;
  }): void {
    this.confirmationTitle = config.title;
    this.confirmationMessage = config.message;
    this.confirmationDetails = config.details ?? null;
    this.confirmationButtonText = config.buttonText;
    this.confirmationIsDangerous = config.isDangerous;
  }

  private resetConfirmationState(): void {
    this.showConfirmationDialog = false;
    this.confirmationPrayerId = null;
    this.confirmationUpdateId = null;
    this.confirmationDetails = null;
    this.isMultiSelectDelete = false;
    this.isStatusUpdateConfirmation = false;
    this.isDeleteUpdateConfirmation = false;
  }
}
