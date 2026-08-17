import type { SupabaseClient } from '@supabase/supabase-js';
import type { BackupJsonFile } from './admin-backup-status';

const FALLBACK_BACKUP_TABLES = [
  'account_approval_requests',
  'admin_settings',
  'analytics',
  'approval_codes',
  'backup_logs',
  'deletion_requests',
  'email_queue',
  'email_subscribers',
  'email_templates',
  'personal_prayer_updates',
  'personal_prayers',
  'prayer_prompts',
  'prayer_types',
  'prayer_updates',
  'prayers',
  'update_deletion_requests',
  'user_preferences',
  'verification_codes',
];

export type ManualBackupSuccess = {
  ok: true;
  totalRecords: number;
  durationSeconds: number;
  summary: Record<string, number>;
};

export type ManualBackupFailure = {
  ok: false;
  errorMessage: string;
};

export type ManualBackupResult = ManualBackupSuccess | ManualBackupFailure;

async function discoverBackupTables(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<string[]> {
  const tableParams = new URLSearchParams();
  tableParams.set('select', 'table_name');
  tableParams.set('order', 'table_name.asc');

  const tableResponse = await fetch(
    `${supabaseUrl}/rest/v1/backup_tables?${tableParams.toString()}`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (tableResponse.ok) {
    const tableList = await tableResponse.json();
    const tables = tableList.map((t: { table_name: string }) => t.table_name);
    console.log(
      `Successfully discovered ${tables.length} tables from backup_tables view`,
    );
    return tables;
  }

  const errorText = await tableResponse.text();
  console.warn(
    `Could not fetch from backup_tables view: ${tableResponse.status} - ${errorText}`,
  );
  throw new Error('Could not fetch table list');
}

function downloadBackupJson(backup: BackupJsonFile): void {
  const backupJson = JSON.stringify(backup, null, 2);
  const blob = new Blob([backupJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `manual_backup_${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function runManualBackup(
  supabaseUrl: string,
  supabaseKey: string,
  client: SupabaseClient,
): Promise<ManualBackupResult> {
  let tables: string[];

  try {
    tables = await discoverBackupTables(supabaseUrl, supabaseKey);
  } catch (error) {
    console.warn('Falling back to hardcoded table list. Error:', error);
    tables = FALLBACK_BACKUP_TABLES;
  }

  console.log(`Backing up ${tables.length} tables:`, tables);

  const startTime = Date.now();
  const backup: BackupJsonFile = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    tables: {},
  };

  for (const table of tables) {
    try {
      const tableParams = new URLSearchParams();
      tableParams.set('select', '*');

      const response = await fetch(
        `${supabaseUrl}/rest/v1/${table}?${tableParams.toString()}`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        const tableData = await response.json();
        backup.tables[table] = { count: tableData.length, data: tableData };
      } else {
        const errorText = await response.text();
        backup.tables[table] = { error: errorText, data: [] };
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      backup.tables[table] = { error: errorMessage, data: [] };
    }
  }

  const endTime = Date.now();
  const durationSeconds = Math.round((endTime - startTime) / 1000);

  const summary: Record<string, number> = {};
  let totalRecords = 0;
  for (const table in backup.tables) {
    const count = backup.tables[table].count || 0;
    summary[table] = count;
    totalRecords += count;
  }

  downloadBackupJson(backup);

  await client.from('backup_logs').insert({
    backup_date: new Date().toISOString(),
    status: 'success',
    tables_backed_up: summary,
    total_records: totalRecords,
    duration_seconds: durationSeconds,
  });

  return {
    ok: true,
    totalRecords,
    durationSeconds,
    summary,
  };
}

export async function logManualBackupFailure(
  client: SupabaseClient,
  errorMessage: string,
): Promise<void> {
  await client.from('backup_logs').insert({
    backup_date: new Date().toISOString(),
    status: 'failed',
    error_message: errorMessage,
    total_records: 0,
  });
}
