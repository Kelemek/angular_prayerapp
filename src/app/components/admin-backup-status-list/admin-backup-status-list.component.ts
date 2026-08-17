import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BackupLog } from '../../lib/admin-backup-status';
import {
  formatBackupStatusDate,
  formatBackupStatusDuration,
} from '../../lib/admin-backup-status-format';
import {
  BACKUP_STATUS_VISIBLE_LIMIT,
  backupStatusTableEntries,
} from '../../lib/admin-backup-status-list';

@Component({
  selector: 'app-admin-backup-status-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-backup-status-list.component.html',
})
export class AdminBackupStatusListComponent {
  @Input() backups: BackupLog[] = [];
  @Input() expandedBackupId: string | null = null;
  @Input() showFullLog = false;
  @Input() totalBackupCount = 0;

  @Output() toggleExpanded = new EventEmitter<string>();
  @Output() toggleShowFullLog = new EventEmitter<void>();

  readonly visibleLimit = BACKUP_STATUS_VISIBLE_LIMIT;

  formatDate(dateString: string): string {
    return formatBackupStatusDate(dateString);
  }

  formatDuration(seconds?: number): string {
    return formatBackupStatusDuration(seconds);
  }

  getTableEntries(backup: BackupLog): [string, number][] {
    return backupStatusTableEntries(backup);
  }
}
