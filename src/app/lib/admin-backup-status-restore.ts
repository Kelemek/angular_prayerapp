import type { SupabaseClient } from '@supabase/supabase-js';
import type { BackupJsonFile } from './admin-backup-status';

const RESTORE_SKIP_TABLES = ['analytics', 'backup_logs'];

const RESTORE_KNOWN_ORDER = [
  'prayer_types',
  'prayers',
  'prayer_updates',
  'prayer_prompts',
  'email_subscribers',
  'user_preferences',
  'update_deletion_requests',
  'admin_settings',
];

export type RestoreBackupSuccess = {
  ok: true;
  totalRestored: number;
  errors: string[];
  skippedTables: string[];
};

export type RestoreBackupFailure = {
  ok: false;
  errorMessage: string;
};

export type RestoreBackupResult = RestoreBackupSuccess | RestoreBackupFailure;

function parseBackupFile(text: string): BackupJsonFile {
  const backup = JSON.parse(text) as BackupJsonFile;
  if (!backup.tables || typeof backup.tables !== 'object') {
    throw new Error('Invalid backup file format');
  }
  return backup;
}

function orderedRestoreTables(tablesInBackup: string[]): string[] {
  return [
    ...RESTORE_KNOWN_ORDER.filter(
      (t) => tablesInBackup.includes(t) && !RESTORE_SKIP_TABLES.includes(t),
    ),
    ...tablesInBackup.filter(
      (t) => !RESTORE_KNOWN_ORDER.includes(t) && !RESTORE_SKIP_TABLES.includes(t),
    ),
  ];
}

export async function runRestoreFromBackup(
  client: SupabaseClient,
  fileText: string,
): Promise<RestoreBackupResult> {
  try {
    const backup = parseBackupFile(fileText);
    const tablesInBackup = Object.keys(backup.tables);
    const tables = orderedRestoreTables(tablesInBackup);

    let totalRestored = 0;
    const errors: string[] = [];

    for (const tableName of tables) {
      if (!backup.tables[tableName]) continue;

      const tableData = backup.tables[tableName];
      const records = tableData.data || [];

      if (records.length === 0) continue;

      try {
        const { data: existingRecords, error: fetchError } = await client
          .from(tableName)
          .select('id');

        if (fetchError) {
          errors.push(`Error fetching ${tableName}: ${fetchError.message}`);
          continue;
        }

        if (existingRecords && existingRecords.length > 0) {
          const ids = existingRecords.map((r: { id: string }) => r.id);
          const deleteBatchSize = 100;

          for (let i = 0; i < ids.length; i += deleteBatchSize) {
            const idBatch = ids.slice(i, i + deleteBatchSize);
            const { error: deleteError } = await client
              .from(tableName)
              .delete()
              .in('id', idBatch);

            if (deleteError) {
              errors.push(
                `Error deleting from ${tableName}: ${deleteError.message}`,
              );
              break;
            }
          }
        }

        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);

          const { error: insertError } = await client
            .from(tableName)
            .upsert(batch, { onConflict: 'id' });

          if (insertError) {
            errors.push(
              `Error inserting into ${tableName}: ${insertError.message}`,
            );
            continue;
          }

          totalRestored += batch.length;
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push(`Exception restoring ${tableName}: ${errorMessage}`);
      }
    }

    if (RESTORE_SKIP_TABLES.length > 0) {
      console.log(
        `Skipped tables (operational data): ${RESTORE_SKIP_TABLES.join(', ')}`,
      );
    }

    return {
      ok: true,
      totalRestored,
      errors,
      skippedTables: RESTORE_SKIP_TABLES,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { ok: false, errorMessage };
  }
}
