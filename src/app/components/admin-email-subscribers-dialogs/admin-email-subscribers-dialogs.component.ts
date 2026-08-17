import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SendNotificationDialogComponent } from '../send-notification-dialog/send-notification-dialog.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import type {
  EmailSubscriberConfirmationAction,
  EmailSubscriberConfirmationDialogState,
} from '../../lib/admin-email-subscribers-confirmations';

export type { EmailSubscriberConfirmationAction } from '../../lib/admin-email-subscribers-confirmations';

@Component({
  selector: 'app-admin-email-subscribers-dialogs',
  standalone: true,
  imports: [
    CommonModule,
    SendNotificationDialogComponent,
    ConfirmationDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-email-subscribers-dialogs.component.html',
})
export class AdminEmailSubscribersDialogsComponent {
  @Output() confirmationConfirmed =
    new EventEmitter<EmailSubscriberConfirmationAction>();
  @Output() welcomeEmailConfirmed = new EventEmitter<void>();
  @Output() welcomeEmailDeclined = new EventEmitter<void>();

  showSendWelcomeEmailDialog = false;
  showConfirmationDialog = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationDetails: string | null = null;
  confirmationConfirmText = 'Confirm';
  isDeleteConfirmation = false;
  private pendingConfirmation: EmailSubscriberConfirmationAction | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  openWelcomeEmailDialog(): void {
    this.showSendWelcomeEmailDialog = true;
    this.cdr.markForCheck();
  }

  closeWelcomeEmailDialog(): void {
    this.showSendWelcomeEmailDialog = false;
    this.cdr.markForCheck();
  }

  openConfirmation(
    state: EmailSubscriberConfirmationDialogState,
    action: EmailSubscriberConfirmationAction,
  ): void {
    this.confirmationTitle = state.title;
    this.confirmationMessage = state.message;
    this.confirmationDetails = state.details;
    this.confirmationConfirmText = state.confirmText;
    this.isDeleteConfirmation = state.isDangerous;
    this.pendingConfirmation = action;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  onConfirmDialog(): void {
    if (this.pendingConfirmation) {
      this.confirmationConfirmed.emit(this.pendingConfirmation);
    }
    this.closeConfirmation();
  }

  onCancelDialog(): void {
    this.closeConfirmation();
  }

  onConfirmWelcomeEmail(): void {
    this.closeWelcomeEmailDialog();
    this.welcomeEmailConfirmed.emit();
  }

  onDeclineWelcomeEmail(): void {
    this.closeWelcomeEmailDialog();
    this.welcomeEmailDeclined.emit();
  }

  private closeConfirmation(): void {
    this.showConfirmationDialog = false;
    this.pendingConfirmation = null;
    this.isDeleteConfirmation = false;
    this.cdr.markForCheck();
  }
}
