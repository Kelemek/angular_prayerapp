import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface BackupLog {
  id: string;
  backup_date: string;
  status: 'success' | 'failed' | 'in_progress';
  tables_backed_up: Record<string, number>;
  total_records: number;
  error_message?: string;
  duration_seconds?: number;
  created_at: string;
}

@Component({
  selector: 'app-backup-status',
  standalone: true,
  imports: [],
  template: `
@if (loading) {
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
  <div class="flex items-center justify-center">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
</div>
}

@if (!loading && !latestBackup) {
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
  <div class="flex items-center gap-3 mb-4">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
    <h3 class="text-lg font-semibold text-gray-900 dark:!text-white">
      Database Backup Status
    </h3>
  </div>
  <div class="text-center py-8">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mx-auto mb-3">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <p class="text-gray-600 dark:text-gray-400">No backup logs found</p>
    <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">
      Backups will appear here once the first automated backup runs
    </p>
  </div>
</div>
}

@if (!loading && latestBackup) {
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
    <div class="flex items-center gap-3">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600 dark:text-indigo-400">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
      </svg>
      <h3 class="text-lg font-semibold text-gray-900 dark:!text-white">
        Database Backup Status
      </h3>
    </div>
    <div class="flex items-center gap-3 justify-end w-full sm:w-auto">
      <button
        (click)="handleManualBackup()"
        [disabled]="backingUp"
        class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
      >
        @if (backingUp) {
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        }
        @if (!backingUp) {
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        }
        {{ backingUp ? 'Backing up...' : 'Manual Backup' }}
      </button>
      <button
        (click)="showRestoreDialog = true"
        [disabled]="restoring"
        class="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
      >
        @if (restoring) {
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        }
        @if (!restoring) {
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        }
        {{ restoring ? 'Restoring...' : 'Restore' }}
      </button>
    </div>
  </div>

  <!-- Recent Backups -->
  <div class="space-y-4 mb-6">
    <!-- Info Box -->
    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div class="flex gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600 dark:text-blue-400 flex-shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <div class="text-sm text-blue-700 dark:text-blue-300">
          <strong>Automated backups run daily at 2:00 AM CST.</strong>
          <br />
          Backups are stored as GitHub Actions artifacts for 30 days and keep your database active.
        </div>
      </div>
    </div>

    <!-- Backup List -->
    <div>
      <h4 class="text-sm font-semibold text-gray-900 dark:!text-white mb-3">
        Recent Backups
      </h4>
      <div class="space-y-2">
        @for (backup of getVisibleBackups(); track backup.id) {
        <div>
          <div
            (click)="toggleExpanded(backup.id)"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-4 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              @if (backup.status === 'success') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500 flex-shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              }
              @if (backup.status !== 'success') {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500 flex-shrink-0">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              }
              <div class="flex-1 min-w-0">
                <div class="text-gray-900 dark:text-gray-100 truncate">
                  {{ formatDate(backup.backup_date) }}
                </div>
                @if (backup.error_message) {
                <div class="text-xs text-red-600 dark:text-red-400 truncate">
                  {{ backup.error_message }}
                </div>
                }
              </div>
            </div>
            <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{{ backup.total_records.toLocaleString() }} records</span>
              <span>{{ formatDuration(backup.duration_seconds) }}</span>
              <span class="text-indigo-600 dark:text-indigo-400">
                {{ expandedBackupId === backup.id ? '▼' : '▶' }}
              </span>
            </div>
          </div>

          <!-- Expanded Detail View -->
          @if (expandedBackupId === backup.id) {
          <div class="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-300">Backup ID</div>
                <div class="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
                  {{ backup.id }}
                </div>
              </div>
              
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-300">Status</div>
                <div class="text-sm">
                  <span [class]="'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + (backup.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : backup.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400')">
                    {{ backup.status.toUpperCase() }}
                  </span>
                </div>
              </div>

              <div>
                <div class="text-xs text-gray-500 dark:text-gray-300">Backup Date</div>
                <div class="text-sm text-gray-900 dark:text-gray-100">
                  {{ formatDate(backup.backup_date) }}
                </div>
              </div>

              <div>
                <div class="text-xs text-gray-500 dark:text-gray-300">Created At</div>
                <div class="text-sm text-gray-900 dark:text-gray-100">
                  {{ formatDate(backup.created_at) }}
                </div>
              </div>

              <div>
                <div class="text-xs text-gray-500 dark:text-gray-300">Total Records</div>
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ backup.total_records.toLocaleString() }}
                </div>
              </div>

              <div>
                <div class="text-xs text-gray-500 dark:text-gray-300">Duration</div>
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ formatDuration(backup.duration_seconds) }}
                </div>
              </div>
            </div>

            @if (backup.error_message) {
            <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
              <div class="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">Error Message</div>
              <div class="text-sm text-red-700 dark:text-red-400 font-mono">
                {{ backup.error_message }}
              </div>
            </div>
            }

            @if (backup.tables_backed_up && getTableEntries(backup).length > 0) {
            <div>
              <div class="text-xs font-semibold text-gray-700 dark:text-gray-100 mb-2">
                Tables Backed Up ({{ getTableEntries(backup).length }})
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                @for (entry of getTableEntries(backup); track entry[0]) {
                <div
                  class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded text-xs border border-gray-200 dark:border-gray-700"
                >
                  <span class="text-gray-700 dark:text-gray-100 truncate mr-2">
                    {{ entry[0] }}
                  </span>
                  <span class="font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    {{ entry[1] }}
                  </span>
                </div>
                }
              </div>
            </div>
            }
          </div>
          }
        </div>
        }
      </div>

      <!-- Show More Button -->
      @if (!showFullLog && allBackups.length > 5) {
      <div class="mt-4 text-center">
        <button
          (click)="toggleShowFullLog()"
          class="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
        >
          Show More ({{ allBackups.length - 5 }} older backups)
        </button>
      </div>
      }

      <!-- Show Less Button -->
      @if (showFullLog && allBackups.length > 5) {
      <div class="mt-4 text-center">
        <button
          (click)="toggleShowFullLog()"
          class="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
        >
          Show Less
        </button>
      </div>
      }
    </div>
  </div>
</div>
}

  <!-- Restore Dialog -->
  @if (showRestoreDialog) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Restore Database from Backup
      </h3>
      
      <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div class="flex gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div class="text-sm text-red-700 dark:text-red-300">
            <strong>Warning:</strong> This will DELETE all current data and replace it with the backup file. This action cannot be undone!
          </div>
        </div>
      </div>

      <div class="mb-6">
        <label for="backup-file-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select backup file (.json)
        </label>
        <input
          id="backup-file-input"
          type="file"
          accept=".json"
          (change)="handleManualRestore($event)"
          class="block w-full text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer focus:outline-none"
        />
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Use a backup file downloaded from the "Manual Backup" button or from GitHub Actions artifacts.
        </p>
      </div>

      <div class="flex gap-3 justify-end">
        <button
          (click)="showRestoreDialog = false"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
  }
  `
})
export class BackupStatusComponent implements OnInit {
  latestBackup: BackupLog | null = null;
  allBackups: BackupLog[] = [];
  showFullLog = false;
  expandedBackupId: string | null = null;
  loading = false;
  backingUp = false;
  restoring = false;
  showRestoreDialog = false;

  constructor(
    private supabaseService: SupabaseService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.fetchBackupLogs();
  }

  async fetchBackupLogs(): Promise<void> {
    this.loading = true;
    try {
      const supabaseUrl = this.supabaseService.getSupabaseUrl();
      const supabaseKey = this.supabaseService.getSupabaseKey();

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
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.length > 0) {
        this.latestBackup = data[0];
        this.allBackups = data;
      }
    } catch (error) {
      console.error('Error fetching backup logs:', error);
      this.toast.error('Failed to load backup logs');
    } finally {
      this.loading = false;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  async handleManualBackup(): Promise<void> {
    if (!confirm('Create a manual backup now? This will back up all current data.')) {
      return;
    }

    this.backingUp = true;
    try {
      // Auto-discover tables from the database
      const supabaseUrl = this.supabaseService.getSupabaseUrl();
      const supabaseKey = this.supabaseService.getSupabaseKey();

      let tables: string[];

      try {
        const tableParams = new URLSearchParams();
        tableParams.set('select', 'table_name');
        tableParams.set('order', 'table_name.asc');

        const tableResponse = await fetch(`${supabaseUrl}/rest/v1/backup_tables?${tableParams.toString()}`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          }
        });

        if (tableResponse.ok) {
          const tableList = await tableResponse.json();
          tables = tableList.map((t: { table_name: string }) => t.table_name);
        } else {
          throw new Error('Could not fetch table list');
        }
      } catch {
        // Fallback to hardcoded list if view doesn't exist
        tables = [
          'admin_settings',
          'analytics',
          'backup_logs',
          'email_subscribers',
          'prayer_prompts',
          'prayer_types',
          'prayer_updates',
          'prayers',
          'status_change_requests',
          'update_deletion_requests',
          'user_preferences'
        ];
      }

      console.log(`Backing up ${tables.length} tables:`, tables);

      const startTime = Date.now();
      const backup: {
        timestamp: string;
        version: string;
        tables: Record<string, { count?: number; error?: string; data: any[] }>;
      } = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: {}
      };

      // Fetch all tables
      for (const table of tables) {
        try {
          const tableParams = new URLSearchParams();
          tableParams.set('select', '*');

          const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${tableParams.toString()}`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            }
          });

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

      // Create summary
      const summary: Record<string, number> = {};
      let totalRecords = 0;
      for (const table in backup.tables) {
        const count = backup.tables[table].count || 0;
        summary[table] = count;
        totalRecords += count;
      }

      // Download backup as JSON
      const backupJson = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manual_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log to database
      await this.supabaseService.getClient()
        .from('backup_logs')
        .insert({
          backup_date: new Date().toISOString(),
          status: 'success',
          tables_backed_up: summary,
          total_records: totalRecords,
          duration_seconds: durationSeconds
        });

      this.toast.success(`Backup complete! Downloaded ${totalRecords.toLocaleString()} records in ${durationSeconds}s`);
      this.fetchBackupLogs(); // Refresh the log
    } catch (error: unknown) {
      console.error('Backup failed:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log failure
      await this.supabaseService.getClient()
        .from('backup_logs')
        .insert({
          backup_date: new Date().toISOString(),
          status: 'failed',
          error_message: errorMessage,
          total_records: 0
        });

      this.toast.error('Backup failed: ' + errorMessage);
    } finally {
      this.backingUp = false;
    }
  }

  async handleManualRestore(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!confirm(`Are you absolutely sure you want to restore from "${file.name}"?\n\nThis will ERASE ALL current data!`)) {
      input.value = '';
      return;
    }

    this.restoring = true;
    this.showRestoreDialog = false;

    try {
      // Read the file
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.tables || typeof backup.tables !== 'object') {
        throw new Error('Invalid backup file format');
      }

      // Get list of tables to restore
      const tablesInBackup = Object.keys(backup.tables);

      // Tables to skip during restore (operational data that shouldn't be restored)
      const skipTables = ['analytics', 'backup_logs'];

      // Define dependency order for known tables (for proper foreign key handling)
      const knownOrder = [
        'prayer_types',
        'prayers',
        'prayer_updates',
        'prayer_prompts',
        'email_subscribers',
        'user_preferences',
        'status_change_requests',
        'update_deletion_requests',
        'admin_settings'
      ];

      // Sort tables: known tables in dependency order first, then any unknown tables
      const tables = [
        ...knownOrder.filter(t => tablesInBackup.includes(t) && !skipTables.includes(t)),
        ...tablesInBackup.filter(t => !knownOrder.includes(t) && !skipTables.includes(t))
      ];

      let totalRestored = 0;
      const errors: string[] = [];

      for (const tableName of tables) {
        if (!backup.tables[tableName]) continue;

        const tableData = backup.tables[tableName];
        const records = tableData.data || [];

        if (records.length === 0) continue;

        try {
          // Get all existing records to delete them by their actual IDs
          const { data: existingRecords, error: fetchError } = await this.supabaseService.getClient()
            .from(tableName)
            .select('id');

          if (fetchError) {
            errors.push(`Error fetching ${tableName}: ${fetchError.message}`);
            continue;
          }

          // Delete all existing records in batches
          if (existingRecords && existingRecords.length > 0) {
            const ids = existingRecords.map((r: any) => r.id);
            const deleteBatchSize = 100;

            for (let i = 0; i < ids.length; i += deleteBatchSize) {
              const idBatch = ids.slice(i, i + deleteBatchSize);
              const { error: deleteError } = await this.supabaseService.getClient()
                .from(tableName)
                .delete()
                .in('id', idBatch);

              if (deleteError) {
                errors.push(`Error deleting from ${tableName}: ${deleteError.message}`);
                break;
              }
            }
          }

          // Use upsert to handle any remaining conflicts
          const batchSize = 100;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);

            const { error: insertError } = await this.supabaseService.getClient()
              .from(tableName)
              .upsert(batch, { onConflict: 'id' });

            if (insertError) {
              errors.push(`Error inserting into ${tableName}: ${insertError.message}`);
              continue;
            }

            totalRestored += batch.length;
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          errors.push(`Exception restoring ${tableName}: ${errorMessage}`);
        }
      }

      // Log skipped tables info
      if (skipTables.length > 0) {
        console.log(`Skipped tables (operational data): ${skipTables.join(', ')}`);
      }

      if (errors.length > 0) {
        console.error('Restore errors:', errors);
        this.toast.warning(`Restore completed with ${errors.length} error(s). Restored ${totalRestored.toLocaleString()} records. Check console for details.`);
      } else {
        const skipMsg = skipTables.length > 0
          ? `\n\nSkipped: ${skipTables.join(', ')} (operational data)`
          : '';
        this.toast.success(`Restore complete! Restored ${totalRestored.toLocaleString()} records.${skipMsg}`);
      }

      // Refresh the page to show updated data
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: unknown) {
      console.error('Restore failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.toast.error('Restore failed: ' + errorMessage);
    } finally {
      this.restoring = false;
      input.value = '';
    }
  }

  toggleExpanded(backupId: string): void {
    this.expandedBackupId = this.expandedBackupId === backupId ? null : backupId;
  }

  toggleShowFullLog(): void {
    this.showFullLog = !this.showFullLog;
    if (!this.showFullLog) {
      this.expandedBackupId = null;
    }
  }

  getTableEntries(backup: BackupLog): [string, number][] {
    return Object.entries(backup.tables_backed_up).sort(([a], [b]) => a.localeCompare(b));
  }

  getVisibleBackups(): BackupLog[] {
    return this.showFullLog ? this.allBackups : this.allBackups.slice(0, 5);
  }
}
