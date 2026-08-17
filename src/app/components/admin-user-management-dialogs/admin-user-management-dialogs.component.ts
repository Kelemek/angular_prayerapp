import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import type {
  AdminUserConfirmationAction,
  AdminUserConfirmationDialogState,
} from '../../lib/admin-user-management-confirmations';

export type { AdminUserConfirmationAction } from '../../lib/admin-user-management-confirmations';

@Component({
  selector: 'app-admin-user-management-dialogs',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-user-management-dialogs.component.html',
})
export class AdminUserManagementDialogsComponent {
  @Output() confirmationConfirmed =
    new EventEmitter<AdminUserConfirmationAction>();

  showConfirmationDialog = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationDetails: string | null = null;
  confirmationConfirmText = 'Confirm';
  confirmationIsDangerous = false;
  private pendingConfirmation: AdminUserConfirmationAction | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  openConfirmation(
    state: AdminUserConfirmationDialogState,
    action: AdminUserConfirmationAction,
  ): void {
    this.confirmationTitle = state.title;
    this.confirmationMessage = state.message;
    this.confirmationDetails = state.details;
    this.confirmationConfirmText = state.confirmText;
    this.confirmationIsDangerous = state.isDangerous;
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

  private closeConfirmation(): void {
    this.showConfirmationDialog = false;
    this.pendingConfirmation = null;
    this.confirmationIsDangerous = false;
    this.cdr.markForCheck();
  }
}
