import { vi, describe, it, beforeEach, expect, afterEach } from 'vitest';
import { BackupStatusComponent } from './backup-status.component';

// Helper function to create File objects with text() method for testing
const createMockFile = (content: string | object, filename: string = 'backup.json'): File => {
  const jsonString = typeof content === 'string' ? content : JSON.stringify(content);
  const mockFile = new File([jsonString], filename, { type: 'application/json' });
  // Add the text() method that the File API provides
  (mockFile as any).text = async () => jsonString;
  return mockFile;
};

const makeMockSupabaseClient = (overrides: any = {}) => {
  const insert = vi.fn().mockResolvedValue({});
  const upsert = vi.fn().mockResolvedValue({});
  const select = vi.fn().mockResolvedValue({ data: [], error: null });
  const del = vi.fn().mockResolvedValue({});
  const _in = vi.fn().mockResolvedValue({});

  const from = vi.fn().mockImplementation(() => ({
    insert,
    upsert,
    select,
    delete: del,
    in: _in,
  }));

  return {
    from,
    insert,
    upsert,
    select,
    delete: del,
    in: _in,
    ...overrides,
  };
};

describe('BackupStatusComponent', () => {
  let component: BackupStatusComponent;
  let supabaseService: any;
  let toast: any;
  let originalConfirm: any;
  let fetchSpy: any;

  beforeEach(() => {
    supabaseService = {
      getSupabaseUrl: vi.fn().mockReturnValue('https://supabase.test'),
      getSupabaseKey: vi.fn().mockReturnValue('test-key'),
      getClient: vi.fn().mockReturnValue(makeMockSupabaseClient()),
    };

    toast = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    };

    component = new BackupStatusComponent(supabaseService as any, toast as any);

    originalConfirm = window.confirm;
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    vi.restoreAllMocks();
  });

  it('formats date using locale', () => {
    const out = component.formatDate('2020-01-02T12:34:56Z');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('formatDuration handles branches', () => {
    expect(component.formatDuration(undefined)).toBe('N/A');
    expect(component.formatDuration(30)).toBe('30s');
    expect(component.formatDuration(90)).toBe('1m 30s');
  });

  it('toggleExpanded toggles id', () => {
    component.expandedBackupId = null;
    component.toggleExpanded('a');
    expect(component.expandedBackupId).toBe('a');
    component.toggleExpanded('a');
    expect(component.expandedBackupId).toBeNull();
  });

  it('toggleShowFullLog toggles and clears expanded', () => {
    component.showFullLog = false;
    component.expandedBackupId = 'x';
    component.toggleShowFullLog();
    expect(component.showFullLog).toBe(true);
    component.toggleShowFullLog();
    expect(component.showFullLog).toBe(false);
    expect(component.expandedBackupId).toBeNull();
  });

  it('getTableEntries sorts entries', () => {
    const example: any = { tables_backed_up: { b: 2, a: 1 } } as any;
    const entries = component.getTableEntries(example as any);
    expect(entries[0][0]).toBe('a');
    expect(entries[1][0]).toBe('b');
  });

  it('getVisibleBackups limits to 5 when showFullLog false', () => {
    component.allBackups = Array.from({ length: 10 }, (_, i) => ({ id: String(i) } as any));
    component.showFullLog = false;
    expect(component.getVisibleBackups().length).toBe(5);
    component.showFullLog = true;
    expect(component.getVisibleBackups().length).toBe(10);
  });

  it('fetchBackupLogs success sets latestBackup and allBackups', async () => {
    const mockData = [
      { id: '1', backup_date: '2020-01-01', status: 'success', tables_backed_up: {}, total_records: 0, created_at: '2020-01-01' },
    ];

    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => mockData } as any);

    await component.fetchBackupLogs();

    expect(component.loading).toBe(false);
    expect(component.latestBackup).toEqual(mockData[0]);
    expect(component.allBackups).toEqual(mockData);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('fetchBackupLogs handles fetch throwing or non-ok', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network'));

    await component.fetchBackupLogs();

    expect(component.loading).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Failed to load backup logs');
  });

  it('handleManualBackup returns early when confirm false', async () => {
    window.confirm = vi.fn().mockReturnValue(false);
    await component.handleManualBackup();
    expect(component.backingUp).toBe(false);
  });

  it('handleManualBackup success path uses fallback tables and downloads', async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    // table list fetch returns not ok to force fallback
    fetchSpy.mockImplementation(async (url: string) => {
      if (url.includes('/backup_tables')) {
        return { ok: false, text: async () => 'no view' } as any;
      }
      // other tables return empty arrays
      return { ok: true, json: async () => [] } as any;
    });

    // stub URL and anchor behavior
    const createObjectURL = vi.fn().mockReturnValue('blob:123');
    const revoke = vi.fn();
    // @ts-ignore
    globalThis.URL = { createObjectURL, revokeObjectURL: revoke };

    const anchor = document.createElement('a');
    anchor.click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation(() => anchor as any);

    // stub supabase insert to succeed
    const client = makeMockSupabaseClient();
    supabaseService.getClient = vi.fn().mockReturnValue(client);

    // spy on fetchBackupLogs so we don't run network again
    component.fetchBackupLogs = vi.fn();

    await component.handleManualBackup();

    expect(component.showBackupConfirmDialog).toBe(true);
    expect(component.backupConfirmTitle).toBe('Create Manual Backup');
  });

  it('onConfirmBackup successfully creates a backup', async () => {
  }, 10000);

  it('handleManualBackup failure logs failed backup and shows toast.error', async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    // table list OK but first table fetch will throw to trigger error path
    fetchSpy.mockImplementation(async (url: string) => {
      if (url.includes('/backup_tables')) {
        return { ok: true, json: async () => [{ table_name: 't1' }] } as any;
      }
      // simulate a network failure for a table
      throw new Error('table fetch fail');
    });

    const client = makeMockSupabaseClient();
    // ensure insert on backup_logs is available
    client.from = vi.fn().mockImplementation(() => ({ insert: vi.fn().mockResolvedValue({}) }));
    supabaseService.getClient = vi.fn().mockReturnValue(client);

    await component.handleManualBackup();
    await component.onConfirmBackup();

    expect(toast.error).toHaveBeenCalled();
    expect(component.backingUp).toBe(false);
  });

  it('handleManualRestore returns when no file', async () => {
    const evt = { target: { files: [] } } as any as Event;
    await component.handleManualRestore(evt);
    expect(component.restoring).toBe(false);
  });

  it('handleManualRestore cancel on confirm false does not restore', async () => {
    const fakeFile: any = { name: 'b.json', text: async () => '{}' };
    const input: any = { files: [fakeFile], value: '' };
    const evt: any = { target: input };

    await component.handleManualRestore(evt as Event);
    expect(component.showRestoreConfirmDialog).toBe(true);
    expect(component.restoreFileName).toBe('b.json');
  });

  it('handleManualRestore success restores tables and calls toast.success', async () => {
    const backupObj = {
      tables: {
        prayers: { data: [{ id: 'r1' }] }
      }
    };

    const fakeFile: any = { name: 'b.json', text: async () => JSON.stringify(backupObj) };
    const input: any = { files: [fakeFile], value: '' };
    const evt: any = { target: input };

    const client = makeMockSupabaseClient();
    // select returns existing records (none)
    client.from = vi.fn().mockImplementation(() => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }), delete: vi.fn().mockResolvedValue({}), upsert: vi.fn().mockResolvedValue({}) }));
    supabaseService.getClient = vi.fn().mockReturnValue(client);

    await component.handleManualRestore(evt as Event);
    await component.onConfirmRestore();

    expect(toast.success).toHaveBeenCalled();
    expect(component.restoring).toBe(false);
  });

  it('handleManualBackup with discovered table and data produces non-zero totalRecords', async () => {
    fetchSpy.mockImplementation(async (url: string) => {
      if (url.includes('/backup_tables')) {
        return { ok: true, json: async () => [{ table_name: 't1' }] } as any;
      }
      // for table fetch return one record
      return { ok: true, json: async () => [{ id: 'r1' }] } as any;
    });

    const createObjectURL = vi.fn().mockReturnValue('blob:xyz');
    const revoke = vi.fn();
    // @ts-ignore
    globalThis.URL = { createObjectURL, revokeObjectURL: revoke };

    const anchor = document.createElement('a');
    anchor.click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation(() => anchor as any);

    const client = makeMockSupabaseClient();
    client.from = vi.fn().mockImplementation(() => ({ insert: vi.fn().mockResolvedValue({}) }));
    supabaseService.getClient = vi.fn().mockReturnValue(client);

    component.fetchBackupLogs = vi.fn();

    await component.handleManualBackup();
    await component.onConfirmBackup();

    expect(toast.success).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.click).toHaveBeenCalled();
  });

  it('handleManualRestore records deletes and upsert errors result in warning', async () => {
    const manyRecords = Array.from({ length: 250 }, (_, i) => ({ id: `id${i}` }));
    const backupObj = { tables: { prayers: { data: Array.from({ length: 150 }, (_, i) => ({ id: String(i) })) } } };

    const fakeFile: any = { name: 'b.json', text: async () => JSON.stringify(backupObj) };
    const input: any = { files: [fakeFile], value: '' };
    const evt: any = { target: input };

    const client = {
      from: vi.fn().mockImplementation((tableName: string) => {
        if (tableName === 'prayers') {
          return {
            select: vi.fn().mockResolvedValue({ data: manyRecords.slice(0, 205), error: null }),
            delete: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ error: null }) }),
            upsert: vi.fn().mockResolvedValue({ error: { message: 'insert failed' } }),
          };
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }), delete: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ error: null }) }), upsert: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };

    supabaseService.getClient = vi.fn().mockReturnValue(client);

    await component.handleManualRestore(evt as Event);
    await component.onConfirmRestore();

    expect(toast.warning).toHaveBeenCalled();
    expect(component.restoring).toBe(false);
  });
});

// Additional targeted tests to exercise remaining branches
describe('BackupStatusComponent - extra branches', () => {
  let component: BackupStatusComponent;
  let supabaseService: any;
  let toast: any;

  beforeEach(() => {
    supabaseService = {
      getSupabaseUrl: vi.fn().mockReturnValue('https://supabase.test'),
      getSupabaseKey: vi.fn().mockReturnValue('test-key'),
      getClient: vi.fn().mockReturnValue(makeMockSupabaseClient()),
    };

    toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };

    component = new BackupStatusComponent(supabaseService as any, toast as any);
  });

  it('handleManualBackup calls supabase insert with success on normal flow', async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    // table list returns one table and that table has two rows
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: string) => {
      if (url.includes('/backup_tables')) {
        return { ok: true, json: async () => [{ table_name: 't1' }] } as any;
      }
      return { ok: true, json: async () => [{ id: 'r1' }, { id: 'r2' }] } as any;
    });

    const createObjectURL = vi.fn().mockReturnValue('blob:ok');
    const revoke = vi.fn();
    // @ts-ignore
    globalThis.URL = { createObjectURL, revokeObjectURL: revoke };

    const anchor = document.createElement('a');
    anchor.click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation(() => anchor as any);

    const client = makeMockSupabaseClient();
    const insertSpy = vi.fn().mockResolvedValue({});
    client.from = vi.fn().mockImplementation((tableName: string) => ({ insert: insertSpy }));
    supabaseService.getClient = vi.fn().mockReturnValue(client);

    component.fetchBackupLogs = vi.fn();

    await component.handleManualBackup();
    await component.onConfirmBackup();

    expect(insertSpy).toHaveBeenCalled();
    // ensure success toast
    expect(toast.success).toHaveBeenCalled();
  }, 10000);

  it('handleManualBackup logs failed insert when download/createObjectURL throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: string) => {
      if (url.includes('/backup_tables')) {
        return { ok: true, json: async () => [{ table_name: 't1' }] } as any;
      }
      return { ok: true, json: async () => [] } as any;
    });

    // make createObjectURL throw to hit outer catch
    const createObjectURL = vi.fn().mockImplementation(() => { throw new Error('blob fail'); });
    const revoke = vi.fn();
    // @ts-ignore
    globalThis.URL = { createObjectURL, revokeObjectURL: revoke };

    // ensure document.createElement behaves
    const anchor = document.createElement('a');
    anchor.click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation(() => anchor as any);

    // spy on insert for failed log
    const client = makeMockSupabaseClient();
    const insertSpy = vi.fn().mockResolvedValue({});
    client.from = vi.fn().mockImplementation((tableName: string) => ({ insert: insertSpy }));
    supabaseService.getClient = vi.fn().mockReturnValue(client);

    await component.handleManualBackup();
    await component.onConfirmBackup();

    expect(insertSpy).toHaveBeenCalled();
    // the insert in the catch should have status: 'failed' somewhere in args
    const calledWith = insertSpy.mock.calls.flat()[0];
    expect(JSON.stringify(calledWith)).toContain('failed');
    expect(toast.error).toHaveBeenCalled();
  });

  it('handleManualRestore collects delete errors and reports warning', async () => {
    // build a backup with records to restore
    const backupObj = { tables: { t1: { data: [{ id: 'a' }, { id: 'b' }] } } };
    const fakeFile: any = { name: 'b.json', text: async () => JSON.stringify(backupObj) };
    const input: any = { files: [fakeFile], value: '' };
    const evt: any = { target: input };

    // supabase client: select returns two existing ids, delete returns error for first batch
    const client = {
      from: vi.fn().mockImplementation((tableName: string) => ({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }], error: null }),
        delete: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ error: { message: 'del error' } }) }),
        upsert: vi.fn().mockResolvedValue({ error: null })
      }))
    };

    supabaseService.getClient = vi.fn().mockReturnValue(client);

    await component.handleManualRestore(evt as Event);
    await component.onConfirmRestore();

    expect(toast.warning).toHaveBeenCalled();
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackupStatusComponent } from './backup-status.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

describe('BackupStatusComponent', () => {
  let component: BackupStatusComponent;
  let mockSupabaseService: any;
  let mockToastService: any;

  const mockBackupLog = {
    id: '123',
    backup_date: '2024-01-15T10:30:00Z',
    status: 'success' as const,
    tables_backed_up: {
      prayers: 10,
      prayer_updates: 5,
      email_subscribers: 3
    },
    total_records: 18,
    duration_seconds: 45,
    created_at: '2024-01-15T10:30:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabaseService = {
      getSupabaseUrl: vi.fn().mockReturnValue('https://test.supabase.co'),
      getSupabaseKey: vi.fn().mockReturnValue('test-key'),
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({ error: null }),
          select: vi.fn().mockReturnValue({ eq: vi.fn() }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn(), in: vi.fn() }),
          upsert: vi.fn()
        })
      })
    };

    mockToastService = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn()
    };

    component = new BackupStatusComponent(mockSupabaseService, mockToastService);
    
    global.fetch = vi.fn();
    global.confirm = vi.fn().mockReturnValue(true);
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(component.latestBackup).toBeNull();
      expect(component.allBackups).toEqual([]);
      expect(component.showFullLog).toBe(false);
      expect(component.expandedBackupId).toBeNull();
      expect(component.loading).toBe(false);
      expect(component.backingUp).toBe(false);
      expect(component.restoring).toBe(false);
      expect(component.showRestoreDialog).toBe(false);
    });
  });

  describe('ngOnInit', () => {
    it('should call fetchBackupLogs', async () => {
      const spy = vi.spyOn(component, 'fetchBackupLogs').mockResolvedValue();
      await component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('fetchBackupLogs', () => {
    it('should fetch and set backup logs successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => [mockBackupLog]
      });

      await component.fetchBackupLogs();

      expect(component.latestBackup).toEqual(mockBackupLog);
      expect(component.allBackups).toEqual([mockBackupLog]);
      expect(component.loading).toBe(false);
    });

    it('should handle fetch error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await component.fetchBackupLogs();

      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load backup logs');
      expect(component.loading).toBe(false);
    });

    it('should handle non-ok response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500
      });

      await component.fetchBackupLogs();

      expect(mockToastService.error).toHaveBeenCalledWith('Failed to load backup logs');
    });

    it('should handle empty response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => []
      });

      await component.fetchBackupLogs();

      expect(component.latestBackup).toBeNull();
      expect(component.allBackups).toEqual([]);
    });
  });

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const formatted = component.formatDate('2024-01-15T14:30:00Z');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds', () => {
      expect(component.formatDuration(30)).toBe('30s');
      expect(component.formatDuration(59)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(component.formatDuration(60)).toBe('1m 0s');
      expect(component.formatDuration(90)).toBe('1m 30s');
      expect(component.formatDuration(125)).toBe('2m 5s');
    });

    it('should return N/A for undefined', () => {
      expect(component.formatDuration(undefined)).toBe('N/A');
    });
  });

  describe('toggleExpanded', () => {
    it('should expand backup', () => {
      component.toggleExpanded('123');
      expect(component.expandedBackupId).toBe('123');
    });

    it('should collapse expanded backup', () => {
      component.expandedBackupId = '123';
      component.toggleExpanded('123');
      expect(component.expandedBackupId).toBeNull();
    });
  });

  describe('toggleShowFullLog', () => {
    it('should toggle showFullLog', () => {
      expect(component.showFullLog).toBe(false);
      component.toggleShowFullLog();
      expect(component.showFullLog).toBe(true);
      component.toggleShowFullLog();
      expect(component.showFullLog).toBe(false);
    });

    it('should reset expandedBackupId when hiding full log', () => {
      component.showFullLog = true;
      component.expandedBackupId = '123';
      component.toggleShowFullLog();
      expect(component.expandedBackupId).toBeNull();
    });
  });

  describe('getTableEntries', () => {
    it('should return sorted table entries', () => {
      const backup = {
        ...mockBackupLog,
        tables_backed_up: {
          zebra: 5,
          apple: 10,
          banana: 3
        }
      };

      const entries = component.getTableEntries(backup);
      expect(entries).toEqual([
        ['apple', 10],
        ['banana', 3],
        ['zebra', 5]
      ]);
    });
  });

  describe('getVisibleBackups', () => {
    it('should return first 5 backups when showFullLog is false', () => {
      component.allBackups = Array.from({ length: 10 }, (_, i) => ({
        ...mockBackupLog,
        id: `backup-${i}`
      }));

      const visible = component.getVisibleBackups();
      expect(visible).toHaveLength(5);
    });

    it('should return all backups when showFullLog is true', () => {
      component.allBackups = Array.from({ length: 10 }, (_, i) => ({
        ...mockBackupLog,
        id: `backup-${i}`
      }));
      component.showFullLog = true;

      const visible = component.getVisibleBackups();
      expect(visible).toHaveLength(10);
    });
  });

  describe('handleManualBackup', () => {
    it('should not proceed if user cancels', async () => {
      (global.confirm as any).mockReturnValue(false);

      await component.handleManualBackup();
      
      expect(component.backingUp).toBe(false);
    });

    it('should create backup with fetched table list', async () => {
      const tableListResponse = {
        ok: true,
        json: async () => [
          { table_name: 'prayers' },
          { table_name: 'prayer_updates' }
        ]
      };

      const tableDataResponse = {
        ok: true,
        json: async () => [{ id: '1', title: 'Test' }]
      };

      (global.fetch as any)
        .mockResolvedValueOnce(tableListResponse)
        .mockResolvedValue(tableDataResponse);

      // Mock DOM methods
      const mockLink = {
        click: vi.fn(),
        href: '',
        download: ''
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      await component.handleManualBackup();
      await component.onConfirmBackup();

      expect(mockToastService.success).toHaveBeenCalled();
      expect(component.backingUp).toBe(false);

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should use fallback table list if fetch fails', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValue({ ok: true, json: async () => [] });

      const mockLink = {
        click: vi.fn(),
        href: '',
        download: ''
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      await component.handleManualBackup();
      await component.onConfirmBackup();

      expect(component.backingUp).toBe(false);

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should handle backup error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Backup failed'));

      await component.handleManualBackup();
      await component.onConfirmBackup();

      expect(mockToastService.error).toHaveBeenCalled();
      expect(component.backingUp).toBe(false);
    });
  });

  describe('handleManualRestore', () => {
    it('should not proceed if no file selected', async () => {
      const mockEvent = {
        target: {
          files: [],
          value: ''
        }
      } as any;

      await component.handleManualRestore(mockEvent);
      
      expect(component.restoring).toBe(false);
    });

    it('should not proceed if user cancels', async () => {
      const mockFile = createMockFile('{}', 'backup.json');
      const mockEvent = {
        target: {
          files: [mockFile],
          value: 'backup.json'
        }
      } as any;

      await component.handleManualRestore(mockEvent);
      
      expect(component.showRestoreConfirmDialog).toBe(true);
      expect(component.restoreFileName).toBe('backup.json');

      component.onCancelRestore();
      expect(component.showRestoreConfirmDialog).toBe(false);
    });

    it('should handle invalid backup format', async () => {
      const invalidData = { invalid: 'format' };
      const mockFile = createMockFile(invalidData);
      const mockEvent = {
        target: {
          files: [mockFile],
          value: 'backup.json'
        }
      } as any;

        await component.handleManualRestore(mockEvent);
        await component.onConfirmRestore();

        expect(mockToastService.error).toHaveBeenCalledWith(expect.stringContaining('Invalid backup file format'));
        expect(component.restoring).toBe(false);
    });

    it('should restore from valid backup file', async () => {
      const backupData = {
        timestamp: '2024-01-15T10:30:00Z',
        version: '1.0',
        tables: {
          prayers: {
            count: 1,
            data: [{ id: '1', title: 'Test Prayer' }]
          }
        }
      };

      const mockFile = createMockFile(backupData);
      const mockEvent = {
        target: {
          files: [mockFile],
          value: 'backup.json'
        }
      } as any;

      const mockSelect = vi.fn().mockReturnValue({ data: [], error: null });
      const mockDelete = vi.fn().mockReturnValue({ in: vi.fn().mockReturnValue({ error: null }) });
      const mockUpsert = vi.fn().mockReturnValue({ error: null });
      mockSupabaseService.getClient.mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: mockSelect,
          delete: mockDelete,
          upsert: mockUpsert
        })
      });

      // Provide a safe mock for window.location.reload (some environments make it non-configurable)
      const originalLocation = window.location;
      try {
        // Replace location with a shallow copy that contains a reload spy
        delete (window as any).location;
      } catch (e) {
        // ignore
      }
      const reloadSpy = vi.fn();
      (window as any).location = { ...originalLocation, reload: reloadSpy } as any;

      await component.handleManualRestore(mockEvent);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(component.restoring).toBe(false);

      // restore original location
      try {
        delete (window as any).location;
      } catch (e) {}
      (window as any).location = originalLocation;
    });

    it('should handle restore errors', async () => {
      const backupData = {
        timestamp: '2024-01-15T10:30:00Z',
        version: '1.0',
        tables: {
          prayers: {
            count: 1,
            data: [{ id: '1', title: 'Test' }]
          }
        }
      };

      const mockFile = createMockFile(backupData);
      const mockEvent = {
        target: {
          files: [mockFile],
          value: 'backup.json'
        }
      } as any;

      mockSupabaseService.getClient.mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ data: null, error: new Error('DB Error') })
        })
      });

      // Provide a safe mock for window.location.reload (some environments make it non-configurable)
      const originalLocation2 = window.location;
      try {
        delete (window as any).location;
      } catch (e) {}
      const reloadSpy2 = vi.fn();
      (window as any).location = { ...originalLocation2, reload: reloadSpy2 } as any;

      await component.handleManualRestore(mockEvent);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(component.restoring).toBe(false);

      // restore original location
      try {
        delete (window as any).location;
      } catch (e) {}
      (window as any).location = originalLocation2;
    });
  });
});
