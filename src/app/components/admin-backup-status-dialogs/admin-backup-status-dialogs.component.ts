import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-admin-backup-status-dialogs',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-backup-status-dialogs.component.html',
})
export class AdminBackupStatusDialogsComponent {
  @Output() backupConfirmed = new EventEmitter<void>();
  @Output() restoreConfirmed = new EventEmitter<void>();
  @Output() restoreFileChosen = new EventEmitter<{ name: string; text: string }>();

  showRestoreDialog = false;
  showBackupConfirmDialog = false;
  backupConfirmTitle = '';
  backupConfirmMessage = '';

  showRestoreConfirmDialog = false;
  restoreConfirmTitle = '';
  restoreConfirmMessage = '';

  constructor(private readonly cdr: ChangeDetectorRef) {}

  openManualBackupConfirm(): void {
    this.backupConfirmTitle = 'Create Manual Backup';
    this.backupConfirmMessage =
      'Create a manual backup now? This will back up all current data.';
    this.showBackupConfirmDialog = true;
    this.cdr.markForCheck();
  }

  openRestoreFileDialog(): void {
    this.showRestoreDialog = true;
    this.cdr.markForCheck();
  }

  closeRestoreFileDialog(): void {
    this.showRestoreDialog = false;
    this.cdr.markForCheck();
  }

  openRestoreConfirm(fileName: string): void {
    this.restoreConfirmTitle = 'Restore from Backup';
    this.restoreConfirmMessage = `Are you absolutely sure you want to restore from "${fileName}"?\n\nThis will ERASE ALL current data!`;
    this.showRestoreConfirmDialog = true;
    this.cdr.markForCheck();
  }

  onBackupConfirm(): void {
    this.showBackupConfirmDialog = false;
    this.backupConfirmed.emit();
    this.cdr.markForCheck();
  }

  onBackupCancel(): void {
    this.showBackupConfirmDialog = false;
    this.cdr.markForCheck();
  }

  onRestoreFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    void file.text().then((text) => {
      this.restoreFileChosen.emit({ name: file.name, text });
      this.openRestoreConfirm(file.name);
    });
  }

  onRestoreConfirm(): void {
    this.showRestoreConfirmDialog = false;
    this.showRestoreDialog = false;
    this.restoreConfirmed.emit();
    this.cdr.markForCheck();
  }

  onRestoreCancel(): void {
    this.showRestoreConfirmDialog = false;
    this.cdr.markForCheck();
  }
}
