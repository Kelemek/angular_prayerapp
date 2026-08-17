import { describe, expect, it } from 'vitest';
import {
  formatBackupStatusDate,
  formatBackupStatusDuration,
} from './admin-backup-status-format';
import {
  backupStatusTableEntries,
  backupStatusVisibleBackups,
  toggleBackupStatusExpanded,
  toggleBackupStatusShowFullLog,
} from './admin-backup-status-list';

describe('admin-backup-status-format', () => {
  it('formats dates as locale strings', () => {
    const out = formatBackupStatusDate('2020-01-02T12:34:56Z');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('formatDuration handles branches', () => {
    expect(formatBackupStatusDuration(undefined)).toBe('N/A');
    expect(formatBackupStatusDuration(30)).toBe('30s');
    expect(formatBackupStatusDuration(90)).toBe('1m 30s');
  });
});

describe('admin-backup-status-list', () => {
  it('sorts table entries', () => {
    const entries = backupStatusTableEntries({
      id: '1',
      backup_date: '2020',
      status: 'success',
      tables_backed_up: { b: 2, a: 1 },
      total_records: 3,
      created_at: '2020',
    });
    expect(entries).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('limits visible backups', () => {
    const all = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      backup_date: '2020',
      status: 'success' as const,
      tables_backed_up: {},
      total_records: 0,
      created_at: '2020',
    }));
    expect(backupStatusVisibleBackups(all, false).length).toBe(5);
    expect(backupStatusVisibleBackups(all, true).length).toBe(10);
  });

  it('toggles expanded id', () => {
    expect(toggleBackupStatusExpanded(null, 'a')).toBe('a');
    expect(toggleBackupStatusExpanded('a', 'a')).toBeNull();
  });

  it('toggles show full log and clears expansion when collapsing', () => {
    expect(toggleBackupStatusShowFullLog(false, 'x')).toEqual({
      showFullLog: true,
      expandedBackupId: 'x',
    });
    expect(toggleBackupStatusShowFullLog(true, 'x')).toEqual({
      showFullLog: false,
      expandedBackupId: null,
    });
  });
});
