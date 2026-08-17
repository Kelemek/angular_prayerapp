import type { BackupLog } from './admin-backup-status';

export async function fetchBackupStatusLogs(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<BackupLog[]> {
  const params = new URLSearchParams();
  params.set('select', '*');
  params.set('order', 'backup_date.desc');
  params.set('limit', '100');

  const url = `${supabaseUrl}/rest/v1/backup_logs?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`Query failed: ${response.status}`);
  }

  const data = await response.json();
  return (data as BackupLog[]) || [];
}
