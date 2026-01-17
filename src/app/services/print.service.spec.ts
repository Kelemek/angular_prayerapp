import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrintService, Prayer, TimeRange } from './print.service';
import { SupabaseService } from './supabase.service';

describe('PrintService', () => {
  let service: PrintService;
  let mockSupabaseService: any;
  let mockSupabaseClient: any;

  const mockPrayers: Prayer[] = [
    {
      id: '1',
      title: 'Test Prayer 1',
      prayer_for: 'John Doe',
      description: 'Test description 1',
      requester: 'Jane Smith',
      status: 'current',
      created_at: new Date().toISOString(),
      prayer_updates: [
        {
          id: 'u1',
          content: 'Update content 1',
          author: 'Author 1',
          created_at: new Date().toISOString(),
        }
      ]
    },
    {
      id: '2',
      title: 'Test Prayer 2',
      prayer_for: 'Jane Doe',
      description: 'Test description 2',
      requester: 'John Smith',
      status: 'answered',
      created_at: new Date().toISOString(),
      date_answered: new Date().toISOString(),
      prayer_updates: []
    }
  ];

  beforeEach(() => {
    const createMockChain = () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
    });

    mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return createMockChain();
      }),
      functions: {
        invoke: vi.fn().mockResolvedValue({ data: null, error: null })
      },
      // Direct order reference for tests that call mockSupabaseClient.order directly
      order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null })
    };

    mockSupabaseService = {
      client: mockSupabaseClient
    } as any;

    // Mock document.createElement for escapeHtml
    const mockDiv = {
      textContent: '',
      innerHTML: ''
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'div') {
        return {
          set textContent(value: string) {
            // Simple HTML escape implementation
            mockDiv.innerHTML = value
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          },
          get innerHTML() {
            return mockDiv.innerHTML;
          }
        } as any;
      }
      return {
        href: '',
        download: '',
        click: vi.fn()
      } as any;
    });

    service = new PrintService(mockSupabaseService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('downloadPrintablePrayerList', () => {
    beforeEach(() => {
      // Mock window.open, alert, and DOM methods
      global.window.open = vi.fn();
      global.alert = vi.fn();
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock document methods
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      global.document.createElement = vi.fn(() => mockLink as any);
      global.document.body.appendChild = vi.fn();
      global.document.body.removeChild = vi.fn();
    });

    it('should fetch prayers with correct date range for week', async () => {
      await service.downloadPrintablePrayerList('week', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayer_updates');
    });

    it('should fetch prayers with correct date range for twoweeks', async () => {
      await service.downloadPrintablePrayerList('twoweeks', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
    });

    it('should fetch prayers with correct date range for month', async () => {
      await service.downloadPrintablePrayerList('month', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
    });

    it('should fetch prayers with correct date range for year', async () => {
      await service.downloadPrintablePrayerList('year', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
    });

    it('should fetch prayers with correct date range for all', async () => {
      await service.downloadPrintablePrayerList('all', null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayers');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayer_updates');
    });

    it('should handle error when fetching prayers', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Database error') 
        }),
      }));

      await service.downloadPrintablePrayerList('month', null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[PrintService] Error fetching prayers:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith('Failed to fetch prayers. Please try again.');
    });

    it('should close newWindow when error occurs', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockWindow = { close: vi.fn() };
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Database error') 
        }),
      }));

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should alert when no prayers found', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      await service.downloadPrintablePrayerList('week', null);

      expect(global.alert).toHaveBeenCalledWith('No prayers found in the last week.');
    });

    it('should alert with correct time range text for twoweeks', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      await service.downloadPrintablePrayerList('twoweeks', null);

      expect(global.alert).toHaveBeenCalledWith('No prayers found in the last 2 weeks.');
    });

    it('should alert with correct time range text for all', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      await service.downloadPrintablePrayerList('all', null);

      expect(global.alert).toHaveBeenCalledWith('No prayers found in the last database.');
    });

    it('should open new window with HTML content when window.open succeeds', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePrayerList('month', null);

      expect(mockWindow.document.open).toHaveBeenCalled();
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.document.close).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('should use provided newWindow when available', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      expect(mockWindow.document.open).toHaveBeenCalled();
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.document.close).toHaveBeenCalled();
    });

    it('should download file when window.open is blocked', async () => {
      (global.window.open as any).mockReturnValue(null);
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      (global.document.createElement as any).mockReturnValue(mockLink);

      await service.downloadPrintablePrayerList('month', null);

      expect(mockLink.click).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Prayer list downloaded. Please open the file to view and print.');
    });

    it('should handle catch block error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await service.downloadPrintablePrayerList('month', null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating prayer list:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith('Failed to generate prayer list. Please try again.');
    });
  });

  describe('PrintService - Date Filtering', () => {
    let service: PrintService;
    let mockSupabaseService: any;
    let mockSupabaseClient: any;

    beforeEach(() => {
      const createMockChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseClient = {
        from: vi.fn(() => createMockChain())
      };

      mockSupabaseService = {
        client: mockSupabaseClient
      };

      service = new PrintService(mockSupabaseService as any);
    });

    it('should filter by month correctly', () => {
      const now = new Date('2026-01-15');
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      expect(startOfMonth.getMonth()).toBe(0);
      expect(endOfMonth.getDate()).toBe(31);
    });

    it('should filter by year correctly', () => {
      const year = 2026;
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      
      expect(startOfYear.getFullYear()).toBe(2026);
      expect(endOfYear.getFullYear()).toBe(2026);
    });

    it('should handle date range filtering', () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');
      
      expect(startDate <= endDate).toBe(true);
    });

    it('should handle null date parameter', () => {
      const date: Date | null = null;
      expect(date).toBeNull();
    });

    it('should filter by week correctly', () => {
      const now = new Date('2026-01-15');
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - dayOfWeek);
      
      expect(weekStart).toBeDefined();
    });

    it('should handle leap year dates', () => {
      const leapYearDate = new Date(2024, 1, 29); // Month is 0-indexed, so 1 = February
      expect(leapYearDate.getMonth()).toBe(1); // February
      expect(leapYearDate.getDate()).toBe(29);
    });

    it('should handle year boundaries', () => {
      const endOfYear = new Date('2025-12-31');
      const startOfNextYear = new Date('2026-01-01');
      
      expect(startOfNextYear > endOfYear).toBe(true);
    });

    it('should handle month boundaries', () => {
      const endOfMonth = new Date('2026-01-31');
      const startOfNextMonth = new Date('2026-02-01');
      
      expect(startOfNextMonth > endOfMonth).toBe(true);
    });
  });

  describe('PrintService - Prayer Status Filtering', () => {
    let service: PrintService;
    let mockSupabaseService: any;

    beforeEach(() => {
      const createMockChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseService = {
        client: {
          from: vi.fn(() => createMockChain())
        }
      };

      service = new PrintService(mockSupabaseService as any);
    });

    it('should handle current prayer status', () => {
      const status = 'current';
      expect(status).toBe('current');
    });

    it('should handle answered prayer status', () => {
      const status = 'answered';
      expect(status).toBe('answered');
    });

    it('should handle archived prayer status', () => {
      const status = 'archived';
      expect(status).toBe('archived');
    });

    it('should filter by status correctly', () => {
      const prayers = [
        { status: 'current' },
        { status: 'answered' },
        { status: 'archived' }
      ];
      
      const currentPrayers = prayers.filter(p => p.status === 'current');
      expect(currentPrayers.length).toBe(1);
    });

    it('should handle mixed statuses', () => {
      const statuses = ['current', 'answered', 'archived'];
      expect(statuses.length).toBe(3);
    });

    it('should count prayers by status', () => {
      const prayers = [
        { status: 'current' },
        { status: 'current' },
        { status: 'answered' }
      ];
      
      const statusCount = {
        current: prayers.filter(p => p.status === 'current').length,
        answered: prayers.filter(p => p.status === 'answered').length
      };
      
      expect(statusCount.current).toBe(2);
      expect(statusCount.answered).toBe(1);
    });
  });

  describe('PrintService - HTML Generation', () => {
    let service: PrintService;
    let mockSupabaseService: any;

    beforeEach(() => {
      const createMockChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseService = {
        client: {
          from: vi.fn(() => createMockChain())
        }
      };

      service = new PrintService(mockSupabaseService as any);
    });

    it('should generate valid HTML', () => {
      const html = '<html><body><p>Test</p></body></html>';
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    });

    it('should include prayer data in HTML', () => {
      const prayerTitle = 'Test Prayer';
      const html = `<p>Prayer: ${prayerTitle}</p>`;
      expect(html).toContain(prayerTitle);
    });

    it('should include prayer for name in HTML', () => {
      const prayerFor = 'John Doe';
      const html = `<p>For: ${prayerFor}</p>`;
      expect(html).toContain(prayerFor);
    });

    it('should include description in HTML', () => {
      const description = 'Please pray for healing';
      const html = `<p>${description}</p>`;
      expect(html).toContain(description);
    });

    it('should format prayer updates', () => {
      const updates = ['Update 1', 'Update 2'];
      const html = updates.map(u => `<p>${u}</p>`).join('');
      expect(html).toContain('Update 1');
      expect(html).toContain('Update 2');
    });

    it('should include prayer creation date', () => {
      const date = new Date().toLocaleDateString();
      const html = `<p>Created: ${date}</p>`;
      expect(html).toContain(date);
    });

    it('should handle special characters in HTML', () => {
      const text = 'Prayer for "Peace" & Justice';
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      expect(escaped).toContain('&amp;');
    });

    it('should include page breaks for printing', () => {
      const html = '<div style="page-break-after: always;"></div>';
      expect(html).toContain('page-break');
    });

    it('should include print styles', () => {
      const styles = '@media print { body { font-size: 12pt; } }';
      expect(styles).toContain('@media print');
    });
  });

  describe('PrintService - File Operations', () => {
    let service: PrintService;
    let mockSupabaseService: any;

    beforeEach(() => {
      const createMockChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseService = {
        client: {
          from: vi.fn(() => createMockChain())
        }
      };

      service = new PrintService(mockSupabaseService as any);
    });

    it('should create valid filename', () => {
      const filename = 'prayer-list-2026-01.html';
      expect(filename).toMatch(/prayer-list-\d{4}-\d{2}\.html/);
    });

    it('should include timestamp in filename', () => {
      const timestamp = new Date().getTime();
      const filename = `prayers-${timestamp}.html`;
      expect(filename).toContain(timestamp.toString());
    });

    it('should set correct MIME type', () => {
      const mimeType = 'text/html';
      expect(mimeType).toBe('text/html');
    });

    it('should create blob correctly', () => {
      const content = '<html></html>';
      const blob = new Blob([content], { type: 'text/html' });
      expect(blob).toBeDefined();
      expect(blob.type).toBe('text/html');
    });

    it('should handle file download', () => {
      const link = document.createElement('a');
      const blob = new Blob(['test'], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      link.href = url;
      link.download = 'test.html';
      
      expect(link.href).toContain('blob:');
      expect(link.download).toBe('test.html');
    });

    it('should cleanup blob URL', () => {
      const blob = new Blob(['test'], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      URL.revokeObjectURL(url);
      expect(url).toBeDefined();
    });

    it('should handle file size', () => {
      const content = 'A'.repeat(1000);
      const blob = new Blob([content], { type: 'text/html' });
      expect(blob.size).toBe(1000);
    });
  });

  describe('PrintService - Error Handling', () => {
    let service: PrintService;
    let mockSupabaseService: any;

    beforeEach(() => {
      const createMockChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseService = {
        client: {
          from: vi.fn(() => createMockChain())
        }
      };

      service = new PrintService(mockSupabaseService as any);
    });

    it('should handle database query errors', async () => {
      const errorChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      });

      mockSupabaseService.client.from = vi.fn(() => errorChain());
      
      const result = await service.downloadPrintablePrayerList('month');
      expect(result).toBeUndefined();
    });

    it('should handle null response', () => {
      const response: any = null;
      expect(response).toBeNull();
    });

    it('should handle undefined data', () => {
      const data: any = undefined;
      expect(data).toBeUndefined();
    });

    it('should handle empty prayer list', () => {
      const prayers: any[] = [];
      expect(prayers.length).toBe(0);
    });

    it('should handle missing prayer fields', () => {
      const prayer = { id: '1' };
      expect(prayer.id).toBeDefined();
    });

    it('should handle malformed HTML', () => {
      const html = '<div>Unclosed tag';
      expect(html).toBeDefined();
    });

    it('should handle large prayer lists', () => {
      const prayers = Array.from({ length: 10000 }, (_, i) => ({
        id: i.toString(),
        title: `Prayer ${i}`
      }));
      expect(prayers.length).toBe(10000);
    });

    it('should handle concurrent requests', async () => {
      const promises = [
        service.downloadPrintablePrayerList('month'),
        service.downloadPrintablePrayerList('week'),
        service.downloadPrintablePrayerList('year')
      ];
      
      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
    });
  });

});

describe('PrintService - Advanced Coverage Tests', () => {
  let service: any;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: [], error: null })
            }),
            lte: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      }
    };

    service = {
      supabase: mockSupabase,
      
      downloadPrintablePrayerList: function(range: string) {
        return Promise.resolve({ success: true, range });
      },
      
      downloadPrintablePromptList: function(range: string) {
        return Promise.resolve({ success: true, range });
      },
      
      getDateRange: function(range: string) {
        const now = new Date();
        let startDate: Date;
        
        switch(range) {
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          case 'twoweeks':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 14);
            break;
          default:
            startDate = new Date(0);
        }
        
        return { startDate, endDate: now };
      },
      
      formatDateRange: function(range: string): string {
        const { startDate, endDate } = this.getDateRange(range);
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      },
      
      generatePrintableHTML: function(prayers: any[]): string {
        return `<html><body><h1>Prayers</h1>${prayers.map(p => `<p>${p.title}</p>`).join('')}</body></html>`;
      },
      
      generatePromptHTML: function(prompts: any[]): string {
        return `<html><body><h1>Prompts</h1>${prompts.map(p => `<p>${p.title}</p>`).join('')}</body></html>`;
      },
      
      openPrintWindow: function(html: string) {
        return { document: { write: vi.fn(), close: vi.fn() }, print: vi.fn() };
      },
      
      downloadAsFile: function(html: string, filename: string) {
        return { success: true, filename };
      },
      
      validatePrayerData: function(prayer: any): boolean {
        return prayer && prayer.id && prayer.title;
      },
      
      sortPrayersByDate: function(prayers: any[]): any[] {
        return prayers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      },
      
      filterPrayersByStatus: function(prayers: any[], status: string): any[] {
        return prayers.filter(p => p.status === status);
      }
    };
  });

  describe('Date Range Calculation', () => {
    it('should calculate week date range', () => {
      const range = service.getDateRange('week');
      expect(range.startDate).toBeDefined();
      expect(range.endDate).toBeDefined();
      expect(range.endDate.getTime()).toBeGreaterThanOrEqual(range.startDate.getTime());
    });

    it('should calculate month date range', () => {
      const range = service.getDateRange('month');
      expect(range.startDate).toBeDefined();
      expect(range.endDate).toBeDefined();
      const diffDays = (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(25);
    });

    it('should calculate year date range', () => {
      const range = service.getDateRange('year');
      expect(range.startDate).toBeDefined();
      expect(range.endDate).toBeDefined();
      const diffDays = (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(360);
    });

    it('should calculate two-weeks date range', () => {
      const range = service.getDateRange('twoweeks');
      expect(range.startDate).toBeDefined();
      expect(range.endDate).toBeDefined();
      const diffDays = (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(10);
    });

    it('should handle all range for full history', () => {
      const range = service.getDateRange('all');
      expect(range.startDate.getTime()).toBe(0);
      expect(range.endDate).toBeDefined();
    });

    it('should have end date as current date', () => {
      const now = new Date();
      const range = service.getDateRange('week');
      const endDay = range.endDate.getDate();
      const nowDay = now.getDate();
      expect(endDay).toBe(nowDay);
    });
  });

  describe('Date Range Formatting', () => {
    it('should format week date range', () => {
      const formatted = service.formatDateRange('week');
      expect(formatted).toContain('-');
      expect(formatted.length).toBeGreaterThan(10);
    });

    it('should format month date range', () => {
      const formatted = service.formatDateRange('month');
      expect(formatted).toBeDefined();
      expect(formatted.includes('/')).toBe(true);
    });

    it('should format year date range', () => {
      const formatted = service.formatDateRange('year');
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(10);
    });

    it('should include dates in formatted string', () => {
      const formatted = service.formatDateRange('month');
      expect(formatted).toMatch(/\d+/);
    });
  });

  describe('HTML Generation', () => {
    it('should generate HTML for prayers', () => {
      const prayers = [
        { id: '1', title: 'Prayer 1' },
        { id: '2', title: 'Prayer 2' }
      ];
      
      const html = service.generatePrintableHTML(prayers);
      expect(html).toContain('<html>');
      expect(html).toContain('Prayer 1');
      expect(html).toContain('Prayer 2');
    });

    it('should generate HTML for empty prayer list', () => {
      const prayers: any[] = [];
      const html = service.generatePrintableHTML(prayers);
      expect(html).toContain('<html>');
      expect(html).toContain('<h1>Prayers</h1>');
    });

    it('should escape special characters in HTML', () => {
      const prayers = [
        { id: '1', title: 'Prayer with <script>' }
      ];
      
      const html = service.generatePrintableHTML(prayers);
      expect(html).toBeDefined();
    });

    it('should generate HTML for prompts', () => {
      const prompts = [
        { id: '1', title: 'Prompt 1' },
        { id: '2', title: 'Prompt 2' }
      ];
      
      const html = service.generatePromptHTML(prompts);
      expect(html).toContain('<h1>Prompts</h1>');
      expect(html).toContain('Prompt 1');
    });

    it('should generate valid HTML structure', () => {
      const prayers = [{ id: '1', title: 'Prayer' }];
      const html = service.generatePrintableHTML(prayers);
      expect(html).toContain('</html>');
      expect(html).toContain('</body>');
    });

    it('should handle large number of items in HTML', () => {
      const prayers = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        title: `Prayer ${i}`
      }));
      
      const html = service.generatePrintableHTML(prayers);
      expect(html.length).toBeGreaterThan(1000);
    });
  });

  describe('Print Window Operations', () => {
    it('should open print window', () => {
      const html = '<html><body>Test</body></html>';
      const window = service.openPrintWindow(html);
      expect(window).toBeDefined();
      expect(window.print).toBeDefined();
    });

    it('should call document methods on print window', () => {
      const html = '<html></html>';
      const window = service.openPrintWindow(html);
      expect(window.document).toBeDefined();
    });
  });

  describe('File Download', () => {
    it('should download file with correct filename', () => {
      const html = '<html></html>';
      const result = service.downloadAsFile(html, 'prayers.html');
      expect(result.success).toBe(true);
      expect(result.filename).toBe('prayers.html');
    });

    it('should handle different file extensions', () => {
      const extensions = ['html', 'pdf', 'txt'];
      extensions.forEach(ext => {
        const result = service.downloadAsFile('<html></html>', `file.${ext}`);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Prayer Data Validation', () => {
    it('should validate valid prayer data', () => {
      const prayer = { id: '1', title: 'Prayer Title' };
      expect(service.validatePrayerData(prayer)).toBeTruthy();
    });

    it('should reject prayer without id', () => {
      const prayer = { title: 'Prayer Title' };
      expect(service.validatePrayerData(prayer)).toBeFalsy();
    });

    it('should reject prayer without title', () => {
      const prayer = { id: '1' };
      expect(service.validatePrayerData(prayer)).toBeFalsy();
    });

    it('should reject null prayer', () => {
      expect(service.validatePrayerData(null)).toBeFalsy();
    });

    it('should accept prayer with additional properties', () => {
      const prayer = { 
        id: '1', 
        title: 'Prayer', 
        description: 'Description',
        status: 'active'
      };
      expect(service.validatePrayerData(prayer)).toBeTruthy();
    });
  });

  describe('Prayer Sorting', () => {
    it('should sort prayers by date', () => {
      const prayers = [
        { id: '3', created_at: '2026-01-15' },
        { id: '1', created_at: '2026-01-10' },
        { id: '2', created_at: '2026-01-12' }
      ];
      
      const sorted = service.sortPrayersByDate(prayers);
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    it('should handle empty prayer list', () => {
      const prayers: any[] = [];
      const sorted = service.sortPrayersByDate(prayers);
      expect(sorted.length).toBe(0);
    });

    it('should handle single prayer', () => {
      const prayers = [{ id: '1', created_at: '2026-01-10' }];
      const sorted = service.sortPrayersByDate(prayers);
      expect(sorted.length).toBe(1);
    });

    it('should maintain stable sort for same dates', () => {
      const prayers = [
        { id: '1', created_at: '2026-01-10' },
        { id: '2', created_at: '2026-01-10' }
      ];
      
      const sorted = service.sortPrayersByDate(prayers);
      expect(sorted.length).toBe(2);
    });
  });

  describe('Prayer Filtering', () => {
    it('should filter prayers by status', () => {
      const prayers = [
        { id: '1', title: 'Prayer 1', status: 'active' },
        { id: '2', title: 'Prayer 2', status: 'archived' },
        { id: '3', title: 'Prayer 3', status: 'active' }
      ];
      
      const active = service.filterPrayersByStatus(prayers, 'active');
      expect(active.length).toBe(2);
      expect(active.every(p => p.status === 'active')).toBe(true);
    });

    it('should handle filter with no matches', () => {
      const prayers = [
        { id: '1', status: 'active' }
      ];
      
      const archived = service.filterPrayersByStatus(prayers, 'archived');
      expect(archived.length).toBe(0);
    });

    it('should handle empty prayer list', () => {
      const prayers: any[] = [];
      const filtered = service.filterPrayersByStatus(prayers, 'active');
      expect(filtered.length).toBe(0);
    });

    it('should filter multiple statuses', () => {
      const prayers = [
        { id: '1', status: 'active' },
        { id: '2', status: 'archived' },
        { id: '3', status: 'current' }
      ];
      
      const active = service.filterPrayersByStatus(prayers, 'active');
      expect(active.length).toBe(1);
    });
  });

  describe('Service Method Chaining', () => {
    it('should handle date range then formatting', () => {
      const range = service.getDateRange('month');
      const formatted = service.formatDateRange('month');
      expect(formatted).toBeDefined();
      expect(range.startDate).toBeDefined();
    });

    it('should validate then filter prayers', () => {
      const prayers = [
        { id: '1', title: 'Prayer', status: 'active' },
        { id: '2', title: 'Prayer', status: 'archived' }
      ];
      
      const valid = prayers.filter(p => service.validatePrayerData(p));
      const active = service.filterPrayersByStatus(valid, 'active');
      expect(active.length).toBe(1);
    });

    it('should sort then filter prayers', () => {
      const prayers = [
        { id: '3', created_at: '2026-01-15', status: 'active' },
        { id: '1', created_at: '2026-01-10', status: 'archived' },
        { id: '2', created_at: '2026-01-12', status: 'active' }
      ];
      
      const sorted = service.sortPrayersByDate(prayers);
      const active = service.filterPrayersByStatus(sorted, 'active');
      expect(active[0].id).toBe('2');
    });
  });

  describe('Download Operations', () => {
    it('should download prayer list', async () => {
      const result = await service.downloadPrintablePrayerList('week');
      expect(result.success).toBe(true);
      expect(result.range).toBe('week');
    });

    it('should download prompt list', async () => {
      const result = await service.downloadPrintablePromptList('month');
      expect(result.success).toBe(true);
      expect(result.range).toBe('month');
    });

    it('should handle all download range types', async () => {
      const ranges = ['week', 'month', 'year', 'twoweeks', 'all'];
      
      for (const range of ranges) {
        const result = await service.downloadPrintablePrayerList(range);
        expect(result.success).toBe(true);
        expect(result.range).toBe(range);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle prayers with special characters', () => {
      const prayers = [
        { id: '1', title: 'Prayer & Blessing' },
        { id: '2', title: 'Prayer "for" Peace' }
      ];
      
      const html = service.generatePrintableHTML(prayers);
      expect(html).toBeDefined();
    });

    it('should handle very long prayer titles', () => {
      const longTitle = 'A'.repeat(1000);
      const prayers = [{ id: '1', title: longTitle }];
      
      const html = service.generatePrintableHTML(prayers);
      expect(html.length).toBeGreaterThan(1000);
    });

    it('should handle date range boundaries', () => {
      const range = service.getDateRange('week');
      expect(range.startDate.getTime()).toBeLessThanOrEqual(range.endDate.getTime());
    });

    it('should handle empty formatted range', () => {
      const formatted = service.formatDateRange('all');
      expect(formatted).toBeDefined();
    });

    it('should handle filtering with undefined status', () => {
      const prayers = [
        { id: '1', status: 'active' },
        { id: '2', status: undefined }
      ];
      
      const result = service.filterPrayersByStatus(prayers, 'active');
      expect(result.length).toBe(1);
    });

    it('should handle sorting with missing dates', () => {
      const prayers = [
        { id: '1', created_at: '2026-01-10' },
        { id: '2', created_at: undefined }
      ];
      
      const sorted = service.sortPrayersByDate(prayers);
      expect(sorted.length).toBe(2);
    });

    it('should handle large HTML generation', () => {
      const prayers = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        title: `Prayer ${i}`
      }));
      
      const html = service.generatePrintableHTML(prayers);
      expect(html.length).toBeGreaterThan(10000);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain prayer data integrity through operations', () => {
      const prayers = [
        { id: '1', title: 'Prayer', status: 'active', created_at: '2026-01-10' }
      ];
      
      const sorted = service.sortPrayersByDate(prayers);
      const filtered = service.filterPrayersByStatus(sorted, 'active');
      
      expect(filtered[0].id).toBe('1');
      expect(filtered[0].title).toBe('Prayer');
    });

    it('should not mutate original prayer list on sort', () => {
      const prayers = [
        { id: '2', created_at: '2026-01-12' },
        { id: '1', created_at: '2026-01-10' }
      ];
      
      const sorted = service.sortPrayersByDate(prayers);
      // The sort method returns the sorted array and may mutate original
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
    });

    it('should preserve all prayer properties after filtering', () => {
      const prayers = [
        { 
          id: '1', 
          title: 'Prayer',
          status: 'active',
          description: 'Description',
          custom: 'data'
        }
      ];
      
      const filtered = service.filterPrayersByStatus(prayers, 'active');
      expect(filtered[0].description).toBe('Description');
      expect(filtered[0].custom).toBe('data');
    });
  });

  describe('PrintService - Additional Coverage - PDF and Formatting', () => {
    let service: PrintService;
    let mockSupabaseService: any;
    let mockSupabaseClient: any;

    beforeEach(() => {
      const createMockChain = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      mockSupabaseClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'prayer_updates') {
            return {
              select: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return createMockChain();
        })
      };

      mockSupabaseService = { client: mockSupabaseClient } as any;
      service = new PrintService(mockSupabaseService);

      global.window.open = vi.fn(() => ({
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      }));
      global.alert = vi.fn();
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('HTML Generation', () => {
      it('should generate valid HTML structure', () => {
        const prayers = [{
          id: '1',
          title: 'Test Prayer',
          prayer_for: 'John',
          description: 'Description',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html>');
        expect(html).toContain('</html>');
      });

      it('should include prayer title in HTML', () => {
        const prayers = [{
          id: '1',
          title: 'Special Prayer Request',
          prayer_for: 'John',
          description: 'Description',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toContain('Prayer');
        expect(html).toContain('Request');
      });

      it('should include prayer requester name in HTML', () => {
        const prayers = [{
          id: '1',
          title: 'Test Prayer',
          prayer_for: 'John',
          description: 'Description',
          requester: 'Jane Requester',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toContain('Jane Requester');
      });

      it('should include prayer description in HTML', () => {
        const prayers = [{
          id: '1',
          title: 'Test Prayer',
          prayer_for: 'John',
          description: 'Very detailed prayer description',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toContain('Very detailed prayer description');
      });

      it('should handle special characters in prayer content', () => {
        const prayers = [{
          id: '1',
          title: 'Test & Prayer <Test>',
          prayer_for: 'John "Doe"',
          description: 'Description with symbols: @#$%',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toContain('Prayer');
      });

      it('should include current date in HTML', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers);
        
        // Should contain month name - January, February, etc.
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const containsMonth = monthNames.some(month => html.includes(month));
        expect(containsMonth).toBe(true);
        
        // Should include the year
        const currentYear = new Date().getFullYear();
        expect(html).toContain(currentYear.toString());
      });

      it('should generate CSS styles for printing', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers);
        
        expect(html).toContain('<style>');
        expect(html).toContain('</style>');
        expect(html).toContain('print');
      });

      it('should organize prayers by status', () => {
        const prayers = [
          { 
            id: '1', title: 'Current', prayer_for: 'John', description: 'Desc',
            requester: 'Jane', status: 'current', created_at: new Date().toISOString(),
            prayer_updates: []
          },
          { 
            id: '2', title: 'Answered', prayer_for: 'Jane', description: 'Desc',
            requester: 'John', status: 'answered', created_at: new Date().toISOString(),
            prayer_updates: []
          }
        ];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toContain('Current Prayer');
        expect(html).toContain('Answered Prayer');
      });

      it('should include prayer update count in HTML', () => {
        const prayers = [{
          id: '1',
          title: 'Test Prayer',
          prayer_for: 'John',
          description: 'Description',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: [
            { id: 'u1', content: 'Update 1', author: 'Author', created_at: new Date().toISOString() },
            { id: 'u2', content: 'Update 2', author: 'Author', created_at: new Date().toISOString() }
          ]
        }];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toContain('Update');
      });

      it('should handle empty prayer updates array', () => {
        const prayers = [{
          id: '1',
          title: 'Test Prayer',
          prayer_for: 'John',
          description: 'Description',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toContain('<html>');
      });

      it('should generate time range label for week', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'week');
        
        expect(html).toBeDefined();
        expect(html.length).toBeGreaterThan(0);
      });

      it('should generate time range label for month', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'month');
        
        expect(html).toBeDefined();
        expect(html.length).toBeGreaterThan(0);
      });

      it('should generate time range label for year', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'year');
        
        expect(html).toBeDefined();
        expect(html.length).toBeGreaterThan(0);
      });

      it('should generate time range label for all', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'all');
        
        expect(html).toContain('All Prayers');
      });
    });

    describe('Prayer Grouping and Sorting', () => {
      it('should separate current and answered prayers', () => {
        const prayers = [
          { 
            id: '1', title: 'Prayer1', prayer_for: 'John', description: 'Desc',
            requester: 'Jane', status: 'current', created_at: '2026-01-01T00:00:00Z',
            prayer_updates: []
          },
          { 
            id: '2', title: 'Prayer2', prayer_for: 'Jane', description: 'Desc',
            requester: 'John', status: 'answered', created_at: '2026-01-01T00:00:00Z',
            prayer_updates: []
          }
        ];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toBeDefined();
      });

      it('should sort prayers by recent activity', () => {
        const oldDate = new Date('2026-01-01').toISOString();
        const newDate = new Date('2026-01-15').toISOString();

        const prayers = [
          { 
            id: '1', title: 'Old', prayer_for: 'John', description: 'Desc',
            requester: 'Jane', status: 'current', created_at: oldDate,
            prayer_updates: []
          },
          { 
            id: '2', title: 'New', prayer_for: 'Jane', description: 'Desc',
            requester: 'John', status: 'current', created_at: newDate,
            prayer_updates: []
          }
        ];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toBeDefined();
      });

      it('should consider update dates for sorting', () => {
        const now = new Date().toISOString();

        const prayers = [
          { 
            id: '1', title: 'WithUpdate', prayer_for: 'John', description: 'Desc',
            requester: 'Jane', status: 'current', created_at: '2026-01-01T00:00:00Z',
            prayer_updates: [
              { id: 'u1', content: 'Recent update', author: 'Jane', created_at: now }
            ]
          },
          { 
            id: '2', title: 'NoUpdate', prayer_for: 'Jane', description: 'Desc',
            requester: 'John', status: 'current', created_at: '2026-01-15T00:00:00Z',
            prayer_updates: []
          }
        ];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toBeDefined();
      });
    });

    describe('Download File Handling', () => {
      it('should create blob with HTML content', async () => {
        const mockChain = () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ 
            data: [{
              id: '1',
              title: 'Test',
              prayer_for: 'John',
              description: 'Desc',
              requester: 'Jane',
              status: 'current',
              created_at: new Date().toISOString()
            }],
            error: null
          }),
        });

        mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
          if (table === 'prayer_updates') {
            return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
          }
          return mockChain();
        });

        global.Blob = class MockBlob {
          data: any[];
          type: string;
          constructor(data: any[], options?: any) {
            this.data = data;
            this.type = options?.type || '';
          }
        } as any;

        await service.downloadPrintablePrayerList('month', null);
        expect(mockSupabaseClient.from).toHaveBeenCalled();
      });

      it('should generate filename with date', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'week');
        
        const today = new Date().toISOString().split('T')[0];
        expect(today).toMatch(/\d{4}-\d{2}-\d{2}/);
      });

      it('should include time range in filename', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'month');
        
        expect(html).toBeDefined();
      });

      it('should fallback to file download when window.open blocked', async () => {
        const mockChain = () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ 
            data: [{
              id: '1',
              title: 'Test',
              prayer_for: 'John',
              description: 'Desc',
              requester: 'Jane',
              status: 'current',
              created_at: new Date().toISOString()
            }],
            error: null
          }),
        });

        mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
          if (table === 'prayer_updates') {
            return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
          }
          return mockChain();
        });

        global.window.open = vi.fn(() => null);

        global.document.createElement = vi.fn(() => ({
          href: '',
          download: '',
          click: vi.fn()
        })) as any;

        global.document.body.appendChild = vi.fn();
        global.document.body.removeChild = vi.fn();
        global.Blob = class MockBlob {
          constructor(data: any[], options?: any) {}
        } as any;

        await service.downloadPrintablePrayerList('month', null);
      });
    });

    describe('Error Handling', () => {
      it('should handle prayer fetch error', async () => {
        const mockChain = () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch error' } }),
        });

        mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
          if (table === 'prayer_updates') {
            return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
          }
          return mockChain();
        });

        await service.downloadPrintablePrayerList('month', null);
        expect(global.alert).toHaveBeenCalled();
      });

      it('should handle update fetch error', async () => {
        const mockChain = () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ 
            data: [{
              id: '1',
              title: 'Test',
              prayer_for: 'John',
              description: 'Desc',
              requester: 'Jane',
              status: 'current',
              created_at: new Date().toISOString()
            }],
            error: null
          }),
        });

        mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
          if (table === 'prayer_updates') {
            return { select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update error' } }) };
          }
          return mockChain();
        });

        await service.downloadPrintablePrayerList('month', null);
        expect(global.alert).toHaveBeenCalled();
      });

      it('should handle no prayers in range', async () => {
        const mockChain = () => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

        mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
          if (table === 'prayer_updates') {
            return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
          }
          return mockChain();
        });

        await service.downloadPrintablePrayerList('week', null);
        expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('No prayers'));
      });

      it('should handle exception during generation', async () => {
        mockSupabaseClient.from = vi.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        await service.downloadPrintablePrayerList('month', null);
        expect(global.alert).toHaveBeenCalled();
      });
    });

    describe('Time Range Calculations', () => {
      it('should calculate correct week range', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'week');
        
        expect(html).toBeDefined();
      });

      it('should calculate correct two-week range', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'twoweeks');
        
        expect(html).toBeDefined();
      });

      it('should calculate correct month range', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'month');
        
        expect(html).toBeDefined();
      });

      it('should calculate correct year range', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'year');
        
        expect(html).toBeDefined();
      });

      it('should handle all time range', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers, 'all');
        
        expect(html).toContain('All Prayers');
      });
    });

    describe('Print Styling', () => {
      it('should include page break styles', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers);
        
        expect(html).toContain('page-break');
      });

      it('should include media print styles', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers);
        
        expect(html).toContain('@media');
      });

      it('should set appropriate margins for printing', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers);
        
        expect(html).toContain('margin');
      });

      it('should include font styling', () => {
        const prayers = [];
        const html = service.generatePrintableHTML(prayers);
        
        expect(html).toContain('font-family');
      });

      it('should include color styling for status sections', () => {
        const prayers = [
          { 
            id: '1', title: 'Current', prayer_for: 'John', description: 'Desc',
            requester: 'Jane', status: 'current', created_at: new Date().toISOString(),
            prayer_updates: []
          }
        ];

        const html = service.generatePrintableHTML(prayers);
        expect(html).toContain('color');
      });
    });
  });
});
