export type BackupLogStatus = 'success' | 'failed' | 'in_progress';

export interface BackupLog {
  id: string;
  backup_date: string;
  status: BackupLogStatus;
  tables_backed_up: Record<string, number>;
  total_records: number;
  error_message?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface BackupJsonTable {
  count?: number;
  error?: string;
  data: Record<string, unknown>[];
}

export interface BackupJsonFile {
  timestamp: string;
  version: string;
  tables: Record<string, BackupJsonTable>;
}
