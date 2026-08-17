import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BackupLog } from '../../lib/admin-backup-status';
import { AdminBackupStatusToolbarComponent } from '../admin-backup-status-toolbar/admin-backup-status-toolbar.component';
import { AdminBackupStatusInfoComponent } from '../admin-backup-status-info/admin-backup-status-info.component';
import { AdminBackupStatusListComponent } from '../admin-backup-status-list/admin-backup-status-list.component';

@Component({
  selector: 'app-admin-backup-status-panel',
  standalone: true,
  imports: [
    CommonModule,
    AdminBackupStatusToolbarComponent,
    AdminBackupStatusInfoComponent,
    AdminBackupStatusListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-backup-status-panel.component.html',
})
export class AdminBackupStatusPanelComponent {
  @Input() loading = false;
  @Input() latestBackup: BackupLog | null = null;
  @Input() visibleBackups: BackupLog[] = [];
  @Input() showFullLog = false;
  @Input() totalBackupCount = 0;
  @Input() expandedBackupId: string | null = null;
  @Input() backingUp = false;
  @Input() restoring = false;

  @Output() manualBackup = new EventEmitter<void>();
  @Output() openRestoreDialog = new EventEmitter<void>();
  @Output() toggleExpanded = new EventEmitter<string>();
  @Output() toggleShowFullLog = new EventEmitter<void>();
}
