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
  type PrayerEditorConfirmationDialogState,
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
  private pendingConfirmation: PrayerEditorConfirmationAction | null = null;

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

  openConfirmation(
    state: PrayerEditorConfirmationDialogState,
    action: PrayerEditorConfirmationAction,
  ): void {
    this.applyConfirmationConfig(state);
    this.pendingConfirmation = action;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  openDeletePrayerConfirmation(prayer: PrayerEditorPrayer): void {
    this.openConfirmation(
      buildDeletePrayerEditorPrayerConfirmation(prayer),
      { kind: 'deleteOne', prayerId: prayer.id },
    );
  }

  openDeleteSelectedConfirmation(count: number): void {
    this.openConfirmation(
      buildDeleteSelectedPrayerEditorConfirmation(count),
      { kind: 'deleteMany' },
    );
  }

  openBulkStatusConfirmation(count: number, status: string): void {
    this.openConfirmation(
      buildBulkStatusPrayerEditorConfirmation(count, status),
      { kind: 'bulkStatus' },
    );
  }

  openDeleteUpdateConfirmation(
    prayerId: string,
    updateId: string,
    content: string,
  ): void {
    this.openConfirmation(
      buildDeletePrayerEditorUpdateConfirmation(content),
      { kind: 'deleteUpdate', prayerId, updateId },
    );
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
    if (this.pendingConfirmation) {
      this.confirmationConfirmed.emit(this.pendingConfirmation);
    }
    this.closeConfirmation();
  }

  onCancelDelete(): void {
    this.closeConfirmation();
    this.confirmationCancelled.emit();
  }

  private applyConfirmationConfig(config: PrayerEditorConfirmationDialogState): void {
    this.confirmationTitle = config.title;
    this.confirmationMessage = config.message;
    this.confirmationDetails = config.details ?? null;
    this.confirmationButtonText = config.buttonText;
    this.confirmationIsDangerous = config.isDangerous;
  }

  private closeConfirmation(): void {
    this.showConfirmationDialog = false;
    this.pendingConfirmation = null;
    this.confirmationDetails = null;
    this.cdr.markForCheck();
  }
}
