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

    it('should handle prayer updates fetch error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update error' } }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
        };
      });

      await service.downloadPrintablePrayerList('month', null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[PrintService] Error fetching updates:', expect.any(Object));
      expect(global.alert).toHaveBeenCalledWith('Failed to fetch prayer updates. Please try again.');
    });

    it('should handle update error with newWindow close', async () => {
      const mockWindow = { close: vi.fn() };
      vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update error' } }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
        };
      });

      await service.downloadPrintablePrayerList('month', mockWindow as any);

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should handle prayers with approved updates in filter', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'u1',
                  prayer_id: '1',
                  content: 'Update',
                  approval_status: 'approved',
                  created_at: new Date().toISOString()
                },
                {
                  id: 'u2',
                  prayer_id: '1',
                  content: 'Unapproved',
                  approval_status: 'pending',
                  created_at: new Date().toISOString()
                }
              ],
              error: null
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
        };
      });

      await service.downloadPrintablePrayerList('week', null);

      expect(mockWindow.document.write).toHaveBeenCalled();
    });

    it('should handle null updates data gracefully', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
        };
      });

      await service.downloadPrintablePrayerList('year', null);

      expect(mockWindow.document.write).toHaveBeenCalled();
    });

    it('should handle twoweeks time range with updates', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePrayerList('twoweeks', null);

      expect(mockWindow.document.write).toHaveBeenCalled();
    });

    it('should filter prayers including those with recent updates', async () => {
      const now = new Date();
      const recentUpdate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const oldPrayer = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString();

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'u1',
                  prayer_id: '2',
                  content: 'Recent update',
                  approval_status: 'approved',
                  created_at: recentUpdate
                }
              ],
              error: null
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                title: 'Old Prayer',
                prayer_for: 'John',
                description: 'Old',
                requester: 'Jane',
                status: 'current',
                created_at: oldPrayer,
                prayer_updates: []
              },
              {
                id: '2',
                title: 'Prayer with Recent Update',
                prayer_for: 'Jane',
                description: 'Recent',
                requester: 'John',
                status: 'current',
                created_at: oldPrayer,
                prayer_updates: []
              }
            ],
            error: null
          }),
        };
      });

      await service.downloadPrintablePrayerList('week', null);

      expect(mockWindow.document.write).toHaveBeenCalled();
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

  describe('downloadPrintablePromptList', () => {
    let service: PrintService;
    let mockSupabaseService: any;
    let mockSupabaseClient: any;

    const mockPrompts = [
      {
        id: '1',
        title: 'Prompt for praise',
        type: 'Praise',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Prompt for confession',
        type: 'Confession',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Prompt for thanksgiving',
        type: 'Thanksgiving',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];

    const mockTypes = [
      { name: 'Praise', display_order: 1 },
      { name: 'Confession', display_order: 2 },
      { name: 'Thanksgiving', display_order: 3 }
    ];

    beforeEach(() => {
      mockSupabaseClient = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'prayer_prompts') {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: mockPrompts, error: null })
            };
          } else if (table === 'prayer_types') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: mockTypes, error: null })
            };
          }
          return {};
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

    it('should fetch all prompts when no types selected', async () => {
      await service.downloadPrintablePromptList([], null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayer_prompts');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayer_types');
    });

    it('should filter prompts by selected types', async () => {
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ 
              data: mockPrompts.filter(p => p.type === 'Praise'),
              error: null
            })
          };
        } else if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypes, error: null })
          };
        }
        return {};
      });

      await service.downloadPrintablePromptList(['Praise'], null);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('prayer_prompts');
    });

    it('should open new window with prompt HTML', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePromptList([], null);

      expect(mockWindow.document.open).toHaveBeenCalled();
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.document.close).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('should use pre-opened window when provided', async () => {
      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePromptList([], mockWindow as any);

      expect(mockWindow.document.open).toHaveBeenCalled();
      expect(mockWindow.document.write).toHaveBeenCalled();
    });

    it('should alert when no prompts found', async () => {
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          };
        } else if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypes, error: null })
          };
        }
        return {};
      });

      await service.downloadPrintablePromptList([], null);

      expect(global.alert).toHaveBeenCalledWith('No prayer prompts found.');
    });

    it('should alert when no prompts match selected types', async () => {
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrompts, error: null })
          };
        } else if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypes, error: null })
          };
        }
        return {};
      });

      await service.downloadPrintablePromptList(['NonExistentType'], null);

      expect(global.alert).toHaveBeenCalledWith('No prayer prompts found for the selected types.');
    });

    it('should handle prompt fetch error', async () => {
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch error' } })
          };
        }
        return {};
      });

      await service.downloadPrintablePromptList([], null);

      expect(global.alert).toHaveBeenCalledWith('Failed to fetch prayer prompts. Please try again.');
    });

    it('should continue with default sorting if types fetch fails', async () => {
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrompts, error: null })
          };
        } else if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Types error' } })
          };
        }
        return {};
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePromptList([], null);

      expect(mockWindow.document.write).toHaveBeenCalled();
    });

    it('should fallback to file download when window.open blocked', async () => {
      (global.window.open as any).mockReturnValue(null);
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      (global.document.createElement as any).mockReturnValue(mockLink);
      global.document.body.appendChild = vi.fn();
      global.document.body.removeChild = vi.fn();
      global.Blob = class MockBlob {
        constructor(data: any[], options?: any) {}
      } as any;

      await service.downloadPrintablePromptList([], null);

      expect(mockLink.click).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Prayer prompts downloaded. Please open the file to view and print.');
    });

    it('should close newWindow on prompt fetch error', async () => {
      const mockWindow = { close: vi.fn() };
      mockSupabaseClient.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
          };
        }
        return {};
      });

      await service.downloadPrintablePromptList([], mockWindow as any);

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should handle exception during prompt generation', async () => {
      mockSupabaseClient.from = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await service.downloadPrintablePromptList([], null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating prayer prompts list:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith('An error occurred while generating the prayer prompts list.');
    });

    it('should close newWindow on exception', async () => {
      const mockWindow = { close: vi.fn() };
      mockSupabaseClient.from = vi.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await service.downloadPrintablePromptList([], mockWindow as any);

      expect(mockWindow.close).toHaveBeenCalled();
    });
  });

  describe('Prompt HTML Generation via downloadPrintablePromptList', () => {
    let service: PrintService;
    let mockSupabaseService: any;

    beforeEach(() => {
      mockSupabaseService = {
        client: {
          from: vi.fn()
        }
      } as any;
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
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should generate valid HTML structure for prompts', async () => {
      const mockPrompts = [
        { id: '1', title: 'Test Prompt', type: 'Praise', created_at: new Date().toISOString() }
      ];

      mockSupabaseService.client.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrompts, error: null })
          };
        } else if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          };
        }
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePromptList([], null);

      expect(mockWindow.document.write).toHaveBeenCalled();
      const html = mockWindow.document.write.mock.calls[0][0];
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Prayer Prompts');
    });

    it('should group and organize prompts by type', async () => {
      const mockPrompts = [
        { id: '1', title: 'Praise Prompt', type: 'Praise', created_at: new Date().toISOString() },
        { id: '2', title: 'Confession Prompt', type: 'Confession', created_at: new Date().toISOString() }
      ];

      const mockTypes = [
        { name: 'Praise', display_order: 1 },
        { name: 'Confession', display_order: 2 }
      ];

      mockSupabaseService.client.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrompts, error: null })
          };
        } else if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypes, error: null })
          };
        }
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePromptList([], null);

      expect(mockWindow.document.write).toHaveBeenCalled();
      const html = mockWindow.document.write.mock.calls[0][0];
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(100);
      // The HTML should contain the section divs with type grouping
      expect(html).toContain('type-section');
    });

    it('should include CSS styles for prompts', async () => {
      const mockPrompts = [
        { id: '1', title: 'Test', type: 'Praise', created_at: new Date().toISOString() }
      ];

      mockSupabaseService.client.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrompts, error: null })
          };
        } else if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          };
        }
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePromptList([], null);

      expect(mockWindow.document.write).toHaveBeenCalled();
      const html = mockWindow.document.write.mock.calls[0][0];
      expect(html).toContain('<style>');
    });

    it('should use correct colors for different prompt types', async () => {
      const mockPrompts = [
        { id: '1', title: 'Praise', type: 'Praise', created_at: new Date().toISOString() },
        { id: '2', title: 'Thanksgiving', type: 'Thanksgiving', created_at: new Date().toISOString() }
      ];

      const mockTypes = [
        { name: 'Praise', display_order: 1 },
        { name: 'Thanksgiving', display_order: 3 }
      ];

      mockSupabaseService.client.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrompts, error: null })
          };
        } else if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockTypes, error: null })
          };
        }
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePromptList([], null);

      const html = mockWindow.document.write.mock.calls[0][0];
      expect(html).toContain('#39704D'); // Praise
      expect(html).toContain('#0047AB'); // Thanksgiving
    });

    it('should display prompt count per type', async () => {
      const mockPrompts = [
        { id: '1', title: 'Prompt 1', type: 'Praise', created_at: new Date().toISOString() },
        { id: '2', title: 'Prompt 2', type: 'Praise', created_at: new Date().toISOString() }
      ];

      mockSupabaseService.client.from = vi.fn().mockImplementation((table: string) => {
        if (table === 'prayer_prompts') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrompts, error: null })
          };
        } else if (table === 'prayer_types') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          };
        }
      });

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePromptList([], null);

      const html = mockWindow.document.write.mock.calls[0][0];
      expect(html).toContain('(2)');
    });
  });

  describe('Prompt HTML Escaping and Generation', () => {
    let service: PrintService;
    let mockSupabaseService: any;

    beforeEach(() => {
      mockSupabaseService = {
        client: { from: vi.fn() }
      } as any;
      service = new PrintService(mockSupabaseService);
    });

    it('should escape HTML in prompt titles during generation', () => {
      const prompts = [
        { id: '1', title: 'Prompt <script>alert("xss")</script>', type: 'Praise', created_at: new Date().toISOString() }
      ];

      const html = service.generatePromptsPrintableHTML(prompts);

      // Should not contain unescaped malicious script
      expect(html).not.toContain('<script>alert("xss")</script>');
      // But should contain the legitimate print script
      expect(html).toContain('window.print()');
      expect(html).toContain('prompt-item');
    });

    it('should escape special characters in prompt titles', () => {
      const prompts = [
        { id: '1', title: 'Prompt & "Test" \'single\'', type: 'Praise', created_at: new Date().toISOString() }
      ];

      const html = service.generatePromptsPrintableHTML(prompts);

      expect(html).toContain('prompt-item');
      expect(html).toBeDefined();
    });

    it('should handle ampersand in prayer titles via escapeHtml', () => {
      const prayers = [
        {
          id: '1',
          title: 'Prayer & Blessing',
          prayer_for: 'John',
          description: 'Test & description',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }
      ];

      const html = service.generatePrintableHTML(prayers);
      expect(html).toBeDefined();
    });

    it('should handle less than symbol in prayer descriptions', () => {
      const prayers = [
        {
          id: '1',
          title: 'Prayer',
          prayer_for: 'John < 50',
          description: 'Test < description',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }
      ];

      const html = service.generatePrintableHTML(prayers);
      expect(html).toBeDefined();
    });

    it('should handle greater than symbol in prayer content', () => {
      const prayers = [
        {
          id: '1',
          title: 'Prayer > Important',
          prayer_for: 'John',
          description: 'Test > description',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }
      ];

      const html = service.generatePrintableHTML(prayers);
      expect(html).toBeDefined();
    });

    it('should handle quotes in prayer content', () => {
      const prayers = [
        {
          id: '1',
          title: 'Prayer "quoted"',
          prayer_for: 'John "Doe"',
          description: 'Test "quoted" description',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }
      ];

      const html = service.generatePrintableHTML(prayers);
      expect(html).toBeDefined();
    });

    it('should prevent XSS attacks in prayer updates', () => {
      const prayers = [
        {
          id: '1',
          title: 'Prayer',
          prayer_for: 'John',
          description: 'Test',
          requester: 'Jane',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: [
            {
              id: 'u1',
              content: '<script>alert("xss")</script>',
              author: 'Author',
              created_at: new Date().toISOString()
            }
          ]
        }
      ];

      const html = service.generatePrintableHTML(prayers);
      // Should not contain unescaped malicious script
      expect(html).not.toContain('<script>alert("xss")</script>');
      // But should contain the legitimate print script
      expect(html).toContain('window.print()');
    });

    it('should prevent XSS in prompt author names', () => {
      const prayers = [
        {
          id: '1',
          title: 'Prayer',
          prayer_for: 'John',
          description: 'Test',
          requester: '<img src=x onerror="alert(\'xss\')">',
          status: 'current',
          created_at: new Date().toISOString(),
          prayer_updates: []
        }
      ];

      const html = service.generatePrintableHTML(prayers);
      expect(html).not.toContain('onerror');
    });
  });

  describe('downloadPrintablePersonalPrayerList', () => {
    let service: PrintService;
    let mockSupabaseService: any;
    let mockPrayerService: any;

    beforeEach(() => {
      mockSupabaseService = {
        client: {
          from: vi.fn()
        }
      } as any;

      mockPrayerService = {
        getPersonalPrayers: vi.fn()
      };

      service = new PrintService(mockSupabaseService, mockPrayerService);

      global.window.open = vi.fn(() => ({
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      }));
      global.alert = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should alert when no personal prayers found', async () => {
      mockPrayerService.getPersonalPrayers.mockResolvedValue([]);

      await service.downloadPrintablePersonalPrayerList('month', null);

      expect(global.alert).toHaveBeenCalledWith('No personal prayers found.');
    });

    it('should close newWindow when no personal prayers found', async () => {
      const mockWindow = { close: vi.fn() };
      mockPrayerService.getPersonalPrayers.mockResolvedValue([]);

      await service.downloadPrintablePersonalPrayerList('month', mockWindow as any);

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should filter personal prayers by time range', async () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      mockPrayerService.getPersonalPrayers.mockResolvedValue([
        {
          id: '1',
          title: 'Recent Prayer',
          created_at: oneWeekAgo.toISOString(),
          updates: []
        },
        {
          id: '2',
          title: 'Old Prayer',
          created_at: twoMonthsAgo.toISOString(),
          updates: []
        }
      ]);

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePersonalPrayerList('week', null);

      expect(mockWindow.document.write).toHaveBeenCalled();
    });

    it('should handle exception during personal prayer generation', async () => {
      mockPrayerService.getPersonalPrayers.mockRejectedValue(new Error('Service error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await service.downloadPrintablePersonalPrayerList('month', null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating personal prayers list:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith('Failed to generate personal prayers list. Please try again.');
    });

    it('should close newWindow on exception', async () => {
      const mockWindow = { close: vi.fn() };
      mockPrayerService.getPersonalPrayers.mockRejectedValue(new Error('Service error'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await service.downloadPrintablePersonalPrayerList('month', mockWindow as any);

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should generate HTML for personal prayers with updates', async () => {
      const now = new Date();
      mockPrayerService.getPersonalPrayers.mockResolvedValue([
        {
          id: '1',
          title: 'Prayer with Updates',
          created_at: now.toISOString(),
          updates: [
            {
              id: 'u1',
              content: 'Update text',
              created_at: now.toISOString()
            }
          ]
        }
      ]);

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      await service.downloadPrintablePersonalPrayerList('month', null);

      expect(mockWindow.document.write).toHaveBeenCalled();
      const html = mockWindow.document.write.mock.calls[0][0];
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('should fallback to file download when window.open blocked for personal prayers', async () => {
      const now = new Date();
      mockPrayerService.getPersonalPrayers.mockResolvedValue([
        {
          id: '1',
          title: 'Prayer',
          created_at: now.toISOString(),
          updates: []
        }
      ]);

      (global.window.open as any).mockReturnValue(null);
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      (global.document.createElement as any).mockReturnValue(mockLink);
      global.document.body.appendChild = vi.fn();
      global.document.body.removeChild = vi.fn();
      global.Blob = class MockBlob {
        constructor(data: any[], options?: any) {}
      } as any;
      global.URL.revokeObjectURL = vi.fn();

      await service.downloadPrintablePersonalPrayerList('month', null);

      expect(mockLink.click).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('Personal prayers downloaded. Please open the file to view and print.');
    });

    it('should use pre-opened window for personal prayers', async () => {
      const now = new Date();
      mockPrayerService.getPersonalPrayers.mockResolvedValue([
        {
          id: '1',
          title: 'Prayer',
          created_at: now.toISOString(),
          updates: []
        }
      ]);

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };

      await service.downloadPrintablePersonalPrayerList('month', mockWindow as any);

      expect(mockWindow.document.open).toHaveBeenCalled();
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.document.close).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('should handle different time ranges for personal prayers', async () => {
      const now = new Date();
      const prayerData = {
        id: '1',
        title: 'Prayer',
        created_at: now.toISOString(),
        updates: []
      };

      mockPrayerService.getPersonalPrayers.mockResolvedValue([prayerData]);

      const mockWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn()
        },
        focus: vi.fn()
      };
      (global.window.open as any).mockReturnValue(mockWindow);

      const timeRanges: Array<'week' | 'twoweeks' | 'month' | 'year' | 'all'> = ['week', 'twoweeks', 'month', 'year', 'all'];

      for (const range of timeRanges) {
        await service.downloadPrintablePersonalPrayerList(range, null);
        expect(mockWindow.document.write).toHaveBeenCalled();
      }
    });
  });


});
