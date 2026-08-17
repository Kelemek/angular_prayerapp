import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-backup-status-toolbar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-backup-status-toolbar.component.html',
})
export class AdminBackupStatusToolbarComponent {
  @Input() backingUp = false;
  @Input() restoring = false;

  @Output() manualBackup = new EventEmitter<void>();
  @Output() openRestoreDialog = new EventEmitter<void>();
}
