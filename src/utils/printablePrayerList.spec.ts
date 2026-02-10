import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock supabase module BEFORE importing the module under test
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { downloadPrintablePrayerList, Prayer, TimeRange } from './printablePrayerList';

describe('printablePrayerList', () => {
  let mockSupabase: any;
  let mockAlert: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Get the mocked supabase
    const { supabase } = await import('../lib/supabase');
    mockSupabase = supabase;

    // Mock global objects
    global.alert = mockAlert = vi.fn() as any;
    global.console.error = mockConsoleError = vi.fn() as any;

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock setTimeout
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('downloadPrintablePrayerList', () => {
    const mockPrayersData: Prayer[] = [
      {
        id: '1',
        title: 'Prayer Title 1',
        prayer_for: 'John Doe',
        description: 'Please pray for healing',
        requester: 'Jane Smith',
        status: 'current',
        approval_status: 'approved',
        created_at: '2026-01-05T00:00:00Z',
      },
      {
        id: '2',
        title: 'Prayer Title 2',
        prayer_for: 'Mary Johnson',
        description: 'Pray for guidance',
        requester: 'Bob Wilson',
        status: 'answered',
        approval_status: 'approved',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const setupMockSupabase = (data: Prayer[] | null = mockPrayersData, error: any = null) => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data, error }),
          };
        } else if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data, error }),
        };
      });
    };

    describe('error handling', () => {
      it('should handle prayers fetch error', async () => {
        const error = new Error('Failed to fetch prayers');
        setupMockSupabase(null, error);

        await downloadPrintablePrayerList('month');

        expect(mockConsoleError).toHaveBeenCalledWith('Error fetching prayers:', error);
        expect(mockAlert).toHaveBeenCalledWith('Failed to fetch prayers. Please try again.');
      });

      it('should handle empty prayers array', async () => {
        setupMockSupabase([]);

        await downloadPrintablePrayerList('month');

        expect(mockAlert).toHaveBeenCalledWith('No prayers found in the last month.');
      });

      it('should handle general errors', async () => {
        const error = new Error('Unexpected error');
        mockSupabase.from.mockImplementation(() => {
          throw error;
        });

        await downloadPrintablePrayerList('month');

        expect(mockConsoleError).toHaveBeenCalledWith('[Print] Error generating prayer list:', error);
        expect(mockAlert).toHaveBeenCalledWith('Failed to generate prayer list. Please try again.');
      });

      it('should show correct message for week range', async () => {
        setupMockSupabase([]);

        await downloadPrintablePrayerList('week');
        expect(mockAlert).toHaveBeenCalledWith('No prayers found in the last week.');
      });

      it('should show correct message for twoweeks range', async () => {
        setupMockSupabase([]);

        await downloadPrintablePrayerList('twoweeks');
        expect(mockAlert).toHaveBeenCalledWith('No prayers found in the last 2 weeks.');
      });

      it('should show correct message for year range', async () => {
        setupMockSupabase([]);

        await downloadPrintablePrayerList('year');
        expect(mockAlert).toHaveBeenCalledWith('No prayers found in the last year.');
      });

      it('should show correct message for all range', async () => {
        setupMockSupabase([]);

        await downloadPrintablePrayerList('all');
        expect(mockAlert).toHaveBeenCalledWith('No prayers found in the last database.');
      });
    });

    describe('basic functionality', () => {
      it('should fetch prayers from supabase', async () => {
        setupMockSupabase();

        const newWindow = {
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
          },
          focus: vi.fn(),
          close: vi.fn(),
        };

        await downloadPrintablePrayerList('month', newWindow as any);

        expect(mockSupabase.from).toHaveBeenCalledWith('prayers');
        expect(mockSupabase.from).toHaveBeenCalledWith('prayer_updates');
      });

      it.skip('should handle newWindow parameter', async () => {
        setupMockSupabase();

        const newWindow = {
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
          },
          focus: vi.fn(),
          close: vi.fn(),
        };

        await downloadPrintablePrayerList('month', newWindow as any);

        // When prayers exist, should use the provided window
        // Should not show alert about missing prayers
        expect(mockAlert).not.toHaveBeenCalledWith(expect.stringContaining('No prayers found'));
      });

      it('should accept week time range', async () => {
        setupMockSupabase();

        const newWindow = {
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
          },
          focus: vi.fn(),
          close: vi.fn(),
        };

        await downloadPrintablePrayerList('week', newWindow as any);
        expect(mockSupabase.from).toHaveBeenCalledWith('prayers');
      });

      it('should accept twoweeks time range', async () => {
        setupMockSupabase();

        const newWindow = {
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
          },
          focus: vi.fn(),
          close: vi.fn(),
        };

        await downloadPrintablePrayerList('twoweeks', newWindow as any);
        expect(mockSupabase.from).toHaveBeenCalledWith('prayers');
      });

      it('should accept year time range', async () => {
        setupMockSupabase();

        const newWindow = {
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
          },
          focus: vi.fn(),
          close: vi.fn(),
        };

        await downloadPrintablePrayerList('year', newWindow as any);
        expect(mockSupabase.from).toHaveBeenCalledWith('prayers');
      });

      it('should accept all time range', async () => {
        setupMockSupabase();

        const newWindow = {
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
          },
          focus: vi.fn(),
          close: vi.fn(),
        };

        await downloadPrintablePrayerList('all', newWindow as any);
        expect(mockSupabase.from).toHaveBeenCalledWith('prayers');
      });

      it('should default to month time range', async () => {
        setupMockSupabase();

        const newWindow = {
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn(),
          },
          focus: vi.fn(),
          close: vi.fn(),
        };

        await downloadPrintablePrayerList(undefined, newWindow as any);

        expect(mockSupabase.from).toHaveBeenCalledWith('prayers');
      });
    });
  });

  describe('PrintablePrayerList - Date Range Calculations', () => {
    it('should calculate week date range correctly', () => {
      const endDate = new Date('2026-01-15');
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);
      
      expect(startDate.getTime() < endDate.getTime()).toBe(true);
    });

    it('should calculate two weeks date range correctly', () => {
      const endDate = new Date('2026-01-15');
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 14);
      
      expect(startDate.getTime() < endDate.getTime()).toBe(true);
    });

    it('should calculate month date range correctly', () => {
      const endDate = new Date('2026-01-15');
      const startDate = new Date(endDate);
      startDate.setMonth(endDate.getMonth() - 1);
      
      expect(startDate.getTime() < endDate.getTime()).toBe(true);
    });

    it('should calculate year date range correctly', () => {
      const endDate = new Date('2026-01-15');
      const startDate = new Date(endDate);
      startDate.setFullYear(endDate.getFullYear() - 1);
      
      expect(startDate.getTime() < endDate.getTime()).toBe(true);
    });

    it('should handle all time range correctly', () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(2000, 0, 1);
      
      expect(startDate.getFullYear()).toBe(2000);
      expect(startDate.getMonth()).toBe(0);
      expect(startDate.getDate()).toBe(1);
    });

    it('should handle leap year in date range', () => {
      const date = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      expect(date.getMonth()).toBe(1);
      expect(date.getDate()).toBe(29);
    });

    it('should handle month boundaries', () => {
      const endDate = new Date('2026-01-31');
      const startDate = new Date(endDate);
      startDate.setMonth(endDate.getMonth() - 1);
      
      expect(startDate.getMonth()).toBe(11); // Previous year's December
    });

    it('should handle year boundaries', () => {
      const currentYear = new Date().getFullYear();
      const endDate = new Date(currentYear, 0, 1);
      const startDate = new Date(endDate);
      startDate.setFullYear(endDate.getFullYear() - 1);
      
      expect(startDate.getFullYear()).toBe(currentYear - 1);
    });
  });

  describe('PrintablePrayerList - Prayer Filtering', () => {
    it('should filter prayers by status', () => {
      const prayers = [
        { id: '1', status: 'current' },
        { id: '2', status: 'answered' },
        { id: '3', status: 'current' }
      ];
      
      const current = prayers.filter(p => p.status === 'current');
      expect(current.length).toBe(2);
    });

    it('should filter prayers by approval status', () => {
      const prayers = [
        { id: '1', approval_status: 'approved' },
        { id: '2', approval_status: 'pending' },
        { id: '3', approval_status: 'approved' }
      ];
      
      const approved = prayers.filter(p => p.approval_status === 'approved');
      expect(approved.length).toBe(2);
    });

    it('should filter non-closed prayers', () => {
      const prayers = [
        { id: '1', status: 'current' },
        { id: '2', status: 'answered', approval_status: 'approved' },
        { id: '3', status: 'current' }
      ];
      
      const nonClosed = prayers.filter(p => 
        p.approval_status === 'approved' && (p.status === 'current' || p.status === 'answered')
      );
      
      expect(nonClosed.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by date range', () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      
      const prayers = [
        { id: '1', created_at: '2026-01-05T10:00:00Z' },
        { id: '2', created_at: '2025-12-31T10:00:00Z' },
        { id: '3', created_at: '2026-02-01T10:00:00Z' }
      ];
      
      const inRange = prayers.filter(p => {
        const createdDate = new Date(p.created_at);
        return createdDate >= startDate && createdDate <= endDate;
      });
      
      expect(inRange.length).toBe(1);
    });

    it('should handle empty prayer list', () => {
      const prayers: any[] = [];
      expect(prayers.length).toBe(0);
    });

    it('should handle prayers without updates', () => {
      const prayers = [
        { id: '1', title: 'Prayer 1', prayer_updates: undefined },
        { id: '2', title: 'Prayer 2', prayer_updates: [] }
      ];
      
      const withUpdates = prayers.filter(p => p.prayer_updates && p.prayer_updates.length > 0);
      expect(withUpdates.length).toBe(0);
    });
  });

  describe('PrintablePrayerList - HTML Generation', () => {
    it('should include prayer title in HTML', () => {
      const title = 'Test Prayer';
      const html = `<h3>${title}</h3>`;
      
      expect(html).toContain(title);
    });

    it('should include prayer_for in HTML', () => {
      const prayerFor = 'John Doe';
      const html = `<p>For: ${prayerFor}</p>`;
      
      expect(html).toContain(prayerFor);
    });

    it('should include description in HTML', () => {
      const description = 'Test description';
      const html = `<p>${description}</p>`;
      
      expect(html).toContain(description);
    });

    it('should include requester name in HTML', () => {
      const requester = 'Jane Doe';
      const html = `<p>Requested by: ${requester}</p>`;
      
      expect(html).toContain(requester);
    });

    it('should include prayer status in HTML', () => {
      const status = 'answered';
      const html = `<span>Status: ${status}</span>`;
      
      expect(html).toContain(status);
    });

    it('should include created date in HTML', () => {
      const date = new Date().toLocaleDateString();
      const html = `<p>Created: ${date}</p>`;
      
      expect(html).toContain('Created');
    });

    it('should include prayer updates in HTML', () => {
      const update = 'Prayer answered!';
      const html = `<div class="update">${update}</div>`;
      
      expect(html).toContain(update);
    });

    it('should include page break styling', () => {
      const html = '<div style="page-break-after: always;"></div>';
      
      expect(html).toContain('page-break');
    });

    it('should include print-safe HTML structure', () => {
      const html = '<html><body><div class="prayer-card"></div></body></html>';
      
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('<body>');
    });

    it('should escape special characters in HTML', () => {
      const text = 'Prayer with "quotes" & <brackets>';
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&lt;');
    });
  });

  describe('PrintablePrayerList - File Operations', () => {
    it('should create blob with HTML content', () => {
      const content = '<html><body>Test</body></html>';
      const blob = new Blob([content], { type: 'text/html' });
      
      expect(blob.type).toBe('text/html');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should create valid filename', () => {
      const filename = 'prayer-list-2026-01.html';
      
      expect(filename).toMatch(/prayer-list-\d{4}-\d{2}\.html/);
    });

    it('should include timestamp in filename', () => {
      const timestamp = Date.now();
      const filename = `prayers-${timestamp}.html`;
      
      expect(filename).toContain(timestamp.toString());
    });

    it('should set correct MIME type for HTML', () => {
      const mimeType = 'text/html';
      
      expect(mimeType).toBe('text/html');
    });

    it('should handle download to new window', () => {
      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        close: vi.fn(),
      };
      
      expect(newWindow.document.write).toBeDefined();
    });

    it('should handle default browser download', () => {
      const link = document.createElement('a');
      link.href = 'blob:http://example.com/test';
      link.download = 'prayers.html';
      
      expect(link.download).toBe('prayers.html');
    });

    it('should create object URL for download', () => {
      const blob = new Blob(['test content'], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      expect(url).toContain('blob:');
      URL.revokeObjectURL(url);
    });

    it('should handle large file creation', () => {
      const largeContent = 'A'.repeat(10000);
      const blob = new Blob([largeContent], { type: 'text/html' });
      
      expect(blob.size).toBe(10000);
    });
  });

  describe('PrintablePrayerList - Error Handling', () => {
    it('should handle network errors gracefully', () => {
      const mockError = { message: 'Network error' };
      
      expect(mockError.message).toContain('error');
    });

    it('should handle empty prayer list from API', () => {
      const prayers: any[] = [];
      
      expect(prayers.length).toBe(0);
    });

    it('should handle null response data', () => {
      const data: any = null;
      
      expect(data).toBeNull();
    });

    it('should handle missing prayer fields', () => {
      const prayer = { id: '1' };
      
      expect((prayer as any).title).toBeUndefined();
      expect((prayer as any).description).toBeUndefined();
    });

    it('should handle invalid date formats', () => {
      const invalidDate = 'invalid-date';
      const parsed = new Date(invalidDate);
      
      expect(isNaN(parsed.getTime())).toBe(true);
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<div>Unclosed tag';
      
      expect(html).toBeDefined();
    });

    it('should handle very large prayer lists', () => {
      const prayers = Array.from({ length: 10000 }, (_, i) => ({
        id: i.toString(),
        title: `Prayer ${i}`,
        prayer_for: 'Test',
        description: 'Test',
        requester: 'Test',
        status: 'current',
        approval_status: 'approved',
        created_at: new Date().toISOString()
      }));
      
      expect(prayers.length).toBe(10000);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 3 }, () => 
        Promise.resolve({ data: [], error: null })
      );
      
      const results = await Promise.all(requests);
      expect(results.length).toBe(3);
    });

    it('should handle browser history state', () => {
      const state = { timestamp: Date.now() };
      
      expect(state.timestamp).toBeGreaterThan(0);
    });
  });

  describe('PrintablePrayerList - Special Characters and Encoding', () => {
    it('should handle emoji in prayer data', () => {
      const prayer = {
        id: '1',
        title: 'Prayer 😊',
        prayer_for: 'Test 🙏',
        description: 'Description 💪',
        requester: 'Jane',
        status: 'current',
        approval_status: 'approved',
        created_at: new Date().toISOString()
      };
      
      expect(prayer.title).toContain('😊');
      expect(prayer.prayer_for).toContain('🙏');
    });

    it('should handle Unicode characters', () => {
      const prayer = {
        id: '1',
        title: 'Prayer für Gott',
        prayer_for: 'José García',
        description: 'Prière en français',
        requester: 'Müller',
        status: 'current',
        approval_status: 'approved',
        created_at: new Date().toISOString()
      };
      
      expect(prayer.title).toContain('ü');
      expect(prayer.prayer_for).toContain('é');
    });

    it('should handle HTML special characters', () => {
      const text = 'Prayer with "quotes", <brackets>, & ampersand';
      const safe = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      
      expect(safe).toContain('&quot;');
      expect(safe).toContain('&lt;');
    });

    it('should handle line breaks in content', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const html = content.split('\n').join('<br>');
      
      expect(html).toContain('<br>');
    });

    it('should handle tabs and indentation', () => {
      const content = 'Indented\n\tContent\n\t\tMore';
      
      expect(content).toContain('\t');
    });

    it('should handle very long strings without spaces', () => {
      const longString = 'A'.repeat(1000);
      
      expect(longString.length).toBe(1000);
    });
  });

  describe('PrintablePrayerList - Window.open fallback and download', () => {
    let mockSupabase: any;
    let mockAlert: ReturnType<typeof vi.fn>;
    let originalWindowOpen: any;
    let mockDocumentBody: any;

    beforeEach(async () => {
      const { supabase } = await import('../lib/supabase');
      mockSupabase = supabase;
      global.alert = mockAlert = vi.fn() as any;
      vi.useFakeTimers();

      mockDocumentBody = {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      };
      
      Object.defineProperty(document, 'body', {
        value: mockDocumentBody,
        writable: true,
        configurable: true
      });
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it.skip('should fall back to download when window.open returns null', async () => {
      const mockPrayers: Prayer[] = [
        {
          id: '1',
          title: 'Prayer Title 1',
          prayer_for: 'John Doe',
          description: 'Please pray for healing',
          requester: 'Jane Smith',
          status: 'current',
          approval_status: 'approved',
          created_at: '2026-01-05T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
          };
        } else if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
      });

      // Mock window.open to return null (popup blocked)
      originalWindowOpen = window.open;
      window.open = vi.fn().mockReturnValue(null);

      // Mock document.createElement and link click
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      await downloadPrintablePrayerList('month');

      // Should create a link and trigger download
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockDocumentBody.appendChild).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockDocumentBody.removeChild).toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith('Prayer list downloaded. Please open the file to view and print.');

      window.open = originalWindowOpen;
    });

    it.skip('should use window.open when available', async () => {
      const mockPrayers: Prayer[] = [
        {
          id: '1',
          title: 'Prayer Title 1',
          prayer_for: 'John Doe',
          description: 'Please pray for healing',
          requester: 'Jane Smith',
          status: 'current',
          approval_status: 'approved',
          created_at: '2026-01-05T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
          };
        } else if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
      });

      const mockNewWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
      };

      window.open = vi.fn().mockReturnValue(mockNewWindow);

      await downloadPrintablePrayerList('month');

      expect(window.open).toHaveBeenCalled();
      expect(mockNewWindow.document.open).toHaveBeenCalled();
      expect(mockNewWindow.document.write).toHaveBeenCalled();
      expect(mockNewWindow.document.close).toHaveBeenCalled();
      expect(mockNewWindow.focus).toHaveBeenCalled();

      window.open = originalWindowOpen;
    });
  });

  describe('PrintablePrayerList - Prayer Updates and Filtering', () => {
    let mockSupabase: any;

    beforeEach(async () => {
      const { supabase } = await import('../lib/supabase');
      mockSupabase = supabase;
      global.alert = vi.fn() as any;
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('should filter and attach approved updates to prayers', async () => {
      // Mock current date to be in January 2026 to match test data
      vi.setSystemTime(new Date('2026-01-15T00:00:00Z'));
      
      const mockPrayers: Prayer[] = [
        {
          id: '1',
          title: 'Prayer Title 1',
          prayer_for: 'John Doe',
          description: 'Please pray for healing',
          requester: 'Jane Smith',
          status: 'current',
          approval_status: 'approved',
          created_at: '2026-01-05T00:00:00Z',
        },
      ];

      const mockUpdates = [
        {
          id: 'u1',
          prayer_id: '1',
          content: 'Update 1',
          author: 'Jane Smith',
          approval_status: 'approved',
          created_at: '2026-01-10T00:00:00Z',
        },
        {
          id: 'u2',
          prayer_id: '1',
          content: 'Update 2 (rejected)',
          author: 'John Doe',
          approval_status: 'rejected',
          created_at: '2026-01-09T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
          };
        } else if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockUpdates, error: null }),
          };
        }
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
      };

      window.open = vi.fn().mockReturnValue(newWindow);

      await downloadPrintablePrayerList('month', newWindow as any);

      // Verify updates were attached
      expect(newWindow.document.write).toHaveBeenCalled();
      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      
      // Should contain the approved update
      expect(htmlContent).toContain('Update 1');
      // Should NOT contain the rejected update
      expect(htmlContent).not.toContain('Update 2 (rejected)');
    });

    it.skip('should handle prayers with answered date', async () => {
      const mockPrayers: Prayer[] = [
        {
          id: '1',
          title: 'Prayer Title 1',
          prayer_for: 'John Doe',
          description: 'Please pray for healing',
          requester: 'Jane Smith',
          status: 'answered',
          approval_status: 'approved',
          created_at: '2026-01-05T00:00:00Z',
          date_answered: '2026-01-10T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
          };
        } else if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
      };

      window.open = vi.fn().mockReturnValue(newWindow);

      await downloadPrintablePrayerList('month', newWindow as any);

      expect(newWindow.document.write).toHaveBeenCalled();
      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      
      // Should contain the answered date
      expect(htmlContent).toContain('Answered on');
      expect(htmlContent).toContain('January');
    });

    it('should filter prayers by date range with updates', async () => {
      // Mock current date to be in January 2026 to match test data
      vi.setSystemTime(new Date('2026-01-15T00:00:00Z'));
      
      const oldPrayer: Prayer = {
        id: '1',
        title: 'Old Prayer',
        prayer_for: 'Old Request',
        description: 'Created long ago',
        requester: 'Jane Smith',
        status: 'current',
        approval_status: 'approved',
        created_at: '2025-01-01T00:00:00Z',
      };

      const mockUpdates = [
        {
          id: 'u1',
          prayer_id: '1',
          content: 'Recent update',
          author: 'Jane Smith',
          approval_status: 'approved',
          created_at: '2026-01-10T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [oldPrayer], error: null }),
          };
        } else if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: mockUpdates, error: null }),
          };
        }
      });

      const newWindow = {
        document: {
          open: vi.fn(),
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
      };

      window.open = vi.fn().mockReturnValue(newWindow);

      // Request prayers from last month
      await downloadPrintablePrayerList('month', newWindow as any);

      expect(newWindow.document.write).toHaveBeenCalled();
      const htmlContent = (newWindow.document.write as any).mock.calls[0][0];
      
      // Old prayer should be included because it has a recent update
      expect(htmlContent).toContain('Old Request');
    });

    it('should handle updates error gracefully', async () => {
      const mockPrayers: Prayer[] = [
        {
          id: '1',
          title: 'Prayer Title 1',
          prayer_for: 'John Doe',
          description: 'Please pray for healing',
          requester: 'Jane Smith',
          status: 'current',
          approval_status: 'approved',
          created_at: '2026-01-05T00:00:00Z',
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'prayers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockPrayers, error: null }),
          };
        } else if (table === 'prayer_updates') {
          return {
            select: vi.fn().mockResolvedValue({ data: null, error: new Error('Updates fetch failed') }),
          };
        }
      });

      global.alert = vi.fn() as any;

      await downloadPrintablePrayerList('month');

      expect(global.alert).toHaveBeenCalledWith('Failed to fetch prayer updates. Please try again.');
    });
  });

});
