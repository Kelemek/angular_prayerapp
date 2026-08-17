import type { BackupLog } from './admin-backup-status';

export const BACKUP_STATUS_VISIBLE_LIMIT = 5;

export function backupStatusTableEntries(backup: BackupLog): [string, number][] {
  return Object.entries(backup.tables_backed_up).sort(([a], [b]) =>
    a.localeCompare(b),
  );
}

export function backupStatusVisibleBackups(
  allBackups: BackupLog[],
  showFullLog: boolean,
  visibleLimit = BACKUP_STATUS_VISIBLE_LIMIT,
): BackupLog[] {
  return showFullLog ? allBackups : allBackups.slice(0, visibleLimit);
}

export function toggleBackupStatusExpanded(
  currentId: string | null,
  backupId: string,
): string | null {
  return currentId === backupId ? null : backupId;
}

export function toggleBackupStatusShowFullLog(
  showFullLog: boolean,
  expandedBackupId: string | null,
): { showFullLog: boolean; expandedBackupId: string | null } {
  const next = !showFullLog;
  return {
    showFullLog: next,
    expandedBackupId: next ? expandedBackupId : null,
  };
}
