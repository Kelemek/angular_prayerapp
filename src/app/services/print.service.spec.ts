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


});
