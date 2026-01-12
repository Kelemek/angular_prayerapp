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

      it('should handle newWindow parameter', async () => {
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
});
