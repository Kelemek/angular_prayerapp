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
  PromptManagerConfirmationDialogState,
  PromptManagerDeleteConfirmationAction,
} from '../../lib/admin-prompt-manager-confirmations';

export type { PromptManagerDeleteConfirmationAction } from '../../lib/admin-prompt-manager-confirmations';

@Component({
  selector: 'app-admin-prompt-manager-dialogs',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prompt-manager-dialogs.component.html',
})
export class AdminPromptManagerDialogsComponent {
  @Output() deleteConfirmed =
    new EventEmitter<PromptManagerDeleteConfirmationAction>();

  showConfirmationDialog = false;
  confirmationTitle = '';
  confirmationMessage = '';
  private pendingDelete: PromptManagerDeleteConfirmationAction | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  openDeleteConfirmation(
    state: PromptManagerConfirmationDialogState,
    action: PromptManagerDeleteConfirmationAction,
  ): void {
    this.confirmationTitle = state.title;
    this.confirmationMessage = state.message;
    this.pendingDelete = action;
    this.showConfirmationDialog = true;
    this.cdr.markForCheck();
  }

  onConfirmDelete(): void {
    if (this.pendingDelete) {
      this.deleteConfirmed.emit(this.pendingDelete);
    }
    this.closeConfirmation();
  }

  onCancelDelete(): void {
    this.closeConfirmation();
  }

  private closeConfirmation(): void {
    this.showConfirmationDialog = false;
    this.pendingDelete = null;
    this.cdr.markForCheck();
  }
}
