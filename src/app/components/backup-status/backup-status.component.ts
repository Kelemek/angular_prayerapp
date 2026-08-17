import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { AdminBackupStatusSectionComponent } from '../admin-backup-status-section/admin-backup-status-section.component';
import { AdminBackupStatusPanelComponent } from '../admin-backup-status-panel/admin-backup-status-panel.component';
import { AdminBackupStatusDialogsComponent } from '../admin-backup-status-dialogs/admin-backup-status-dialogs.component';
import type { BackupLog } from '../../lib/admin-backup-status';
import { fetchBackupStatusLogs } from '../../lib/admin-backup-status-fetch';
import {
  formatBackupStatusDate,
  formatBackupStatusDuration,
} from '../../lib/admin-backup-status-format';
import {
  backupStatusTableEntries,
  backupStatusVisibleBackups,
  toggleBackupStatusExpanded,
  toggleBackupStatusShowFullLog,
} from '../../lib/admin-backup-status-list';
import {
  logManualBackupFailure,
  runManualBackup,
} from '../../lib/admin-backup-status-backup';
import { runRestoreFromBackup } from '../../lib/admin-backup-status-restore';

@Component({
  selector: 'app-backup-status',
  standalone: true,
  imports: [
    CommonModule,
    AdminBackupStatusSectionComponent,
    AdminBackupStatusPanelComponent,
    AdminBackupStatusDialogsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './backup-status.component.html',
  styles: [`:host { display: block; }`],
})
export class BackupStatusComponent {
  sectionExpanded = false;
  private backupLogsInitialFetchDone = false;
  latestBackup: BackupLog | null = null;
  allBackups: BackupLog[] = [];
  showFullLog = false;
  expandedBackupId: string | null = null;
  loading = false;
  backingUp = false;
  restoring = false;

  restoreFileName = '';
  restoreFileText = '';

  @ViewChild('dialogsRef')
  dialogsRef?: AdminBackupStatusDialogsComponent;

  constructor(
    private supabaseService: SupabaseService,
    private toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get visibleBackups(): BackupLog[] {
    return backupStatusVisibleBackups(this.allBackups, this.showFullLog);
  }

  onBackupSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.backupLogsInitialFetchDone) {
      this.backupLogsInitialFetchDone = true;
      void this.fetchBackupLogs();
    }
    this.cdr.markForCheck();
  }

  async fetchBackupLogs(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const data = await fetchBackupStatusLogs(
        this.supabaseService.getSupabaseUrl(),
        this.supabaseService.getSupabaseKey(),
      );

      if (data.length > 0) {
        this.latestBackup = data[0];
        this.allBackups = data;
      }
    } catch (error) {
      console.error('Error fetching backup logs:', error);
      this.toast.error('Failed to load backup logs');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  formatDate(dateString: string): string {
    return formatBackupStatusDate(dateString);
  }

  formatDuration(seconds?: number): string {
    return formatBackupStatusDuration(seconds);
  }

  handleManualBackup(): void {
    this.dialogsRef?.openManualBackupConfirm();
  }

  openRestoreDialog(): void {
    this.dialogsRef?.openRestoreFileDialog();
  }

  async handleManualRestore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const text = await file.text();
    this.restoreFileName = file.name;
    this.restoreFileText = text;
    this.dialogsRef?.openRestoreConfirm(file.name);
    this.cdr.markForCheck();
  }

  onRestoreFileChosen(payload: { name: string; text: string }): void {
    this.restoreFileName = payload.name;
    this.restoreFileText = payload.text;
    this.cdr.markForCheck();
  }

  async onConfirmBackup(): Promise<void> {
    this.backingUp = true;
    this.cdr.markForCheck();
    try {
      const result = await runManualBackup(
        this.supabaseService.getSupabaseUrl(),
        this.supabaseService.getSupabaseKey(),
        this.supabaseService.getClient(),
      );

      if (!result.ok) {
        await logManualBackupFailure(
          this.supabaseService.getClient(),
          result.errorMessage,
        );
        this.toast.error('Backup failed: ' + result.errorMessage);
        return;
      }

      this.toast.success(
        `Backup complete! Downloaded ${result.totalRecords.toLocaleString()} records in ${result.durationSeconds}s`,
      );
      await this.fetchBackupLogs();
    } catch (error: unknown) {
      console.error('Backup failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logManualBackupFailure(
        this.supabaseService.getClient(),
        errorMessage,
      );
      this.toast.error('Backup failed: ' + errorMessage);
    } finally {
      this.backingUp = false;
      this.cdr.markForCheck();
    }
  }

  onCancelBackup(): void {
    this.dialogsRef?.onBackupCancel();
  }

  async onConfirmRestore(): Promise<void> {
    this.restoring = true;
    this.cdr.markForCheck();

    try {
      const result = await runRestoreFromBackup(
        this.supabaseService.getClient(),
        this.restoreFileText,
      );

      if (!result.ok) {
        this.toast.error('Restore failed: ' + result.errorMessage);
        return;
      }

      if (result.errors.length > 0) {
        console.error('Restore errors:', result.errors);
        this.toast.warning(
          `Restore completed with ${result.errors.length} error(s). Restored ${result.totalRestored.toLocaleString()} records. Check console for details.`,
        );
      } else {
        const skipMsg =
          result.skippedTables.length > 0
            ? `\n\nSkipped: ${result.skippedTables.join(', ')} (operational data)`
            : '';
        this.toast.success(
          `Restore complete! Restored ${result.totalRestored.toLocaleString()} records.${skipMsg}`,
        );
      }

      setTimeout(() => window.location.reload(), 2000);
    } catch (error: unknown) {
      console.error('Restore failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.toast.error('Restore failed: ' + errorMessage);
    } finally {
      this.restoring = false;
      this.cdr.markForCheck();
    }
  }

  onCancelRestore(): void {
    this.restoreFileName = '';
    this.restoreFileText = '';
    this.dialogsRef?.onRestoreCancel();
    this.cdr.markForCheck();
  }

  onToggleExpanded(backupId: string): void {
    this.expandedBackupId = toggleBackupStatusExpanded(
      this.expandedBackupId,
      backupId,
    );
    this.cdr.markForCheck();
  }

  toggleExpanded(backupId: string): void {
    this.onToggleExpanded(backupId);
  }

  onToggleShowFullLog(): void {
    const next = toggleBackupStatusShowFullLog(
      this.showFullLog,
      this.expandedBackupId,
    );
    this.showFullLog = next.showFullLog;
    this.expandedBackupId = next.expandedBackupId;
    this.cdr.markForCheck();
  }

  toggleShowFullLog(): void {
    this.onToggleShowFullLog();
  }

  getTableEntries(backup: BackupLog): [string, number][] {
    return backupStatusTableEntries(backup);
  }

  getVisibleBackups(): BackupLog[] {
    return this.visibleBackups;
  }
}
