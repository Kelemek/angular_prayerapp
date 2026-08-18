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
  PrayerTypeConfirmationAction,
  PrayerTypeConfirmationDialogState,
} from '../../lib/admin-prayer-types-confirmations';

export type { PrayerTypeConfirmationAction } from '../../lib/admin-prayer-types-confirmations';

@Component({
  selector: 'app-admin-prayer-types-dialogs',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-types-dialogs.component.html',
})
export class AdminPrayerTypesDialogsComponent {
  @Output() confirmationConfirmed =
    new EventEmitter<PrayerTypeConfirmationAction>();

  showConfirmationDialog = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmationIsDangerous = true;
  confirmationConfirmText = 'Delete';
  private pendingConfirmation: PrayerTypeConfirmationAction | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  openConfirmation(
    state: PrayerTypeConfirmationDialogState,
    action: PrayerTypeConfirmationAction,
  ): void {
    this.confirmationTitle = state.title;
    this.confirmationMessage = state.message;
    this.confirmationIsDangerous = state.isDangerous;
    this.confirmationConfirmText = state.confirmText;
    this.pendingConfirmation = action;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  onConfirmationConfirm(): void {
    if (this.pendingConfirmation) {
      this.confirmationConfirmed.emit(this.pendingConfirmation);
    }
    this.closeConfirmation();
  }

  onConfirmationCancel(): void {
    this.closeConfirmation();
  }

  private closeConfirmation(): void {
    this.showConfirmationDialog = false;
    this.pendingConfirmation = null;
    this.confirmationIsDangerous = true;
    this.confirmationConfirmText = 'Delete';
    this.cdr.markForCheck();
  }
}
