import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from './analytics.service';
import { SupabaseService } from './supabase.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockSupabaseService: any;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Create default mock for analytics queries with proper promise chain
    const createDefaultAnalyticsChain = () => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ count: 0, error: null })),
        gte: vi.fn(() => Promise.resolve({ count: 0, error: null }))
      }))
    });

    const createDefaultSimpleChain = () => ({
      select: vi.fn(() => Promise.resolve({ count: 0, error: null }))
    });

    // Create mock Supabase client
    mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'analytics') {
          return createDefaultAnalyticsChain();
        } else if (table === 'prayers') {
          return createDefaultSimpleChain();
        } else if (table === 'email_subscribers') {
          return createDefaultSimpleChain();
        }
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
        };
      })
    };

    // Create mock SupabaseService
    mockSupabaseService = {
      client: mockSupabaseClient
    } as unknown as SupabaseService;

    service = new AnalyticsService(mockSupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('trackPageView', () => {
    it('should insert a page view event', async () => {
      const insertMock = vi.fn(() => Promise.resolve({ data: null, error: null }));
      mockSupabaseClient.from = vi.fn(() => ({
        insert: insertMock
      }));

      await service.trackPageView();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('analytics');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'page_view',
          event_data: expect.objectContaining({
            timestamp: expect.any(String),
            path: expect.any(String),
            hash: expect.any(String)
          })
        })
      );
    });

    it('should handle insert errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Insert failed');
      
      mockSupabaseClient.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ data: null, error }))
      }));

      await service.trackPageView();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Analytics] Insert error:', error);
      consoleErrorSpy.mockRestore();
    });

    it('should handle exceptions gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      
      mockSupabaseClient.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.reject(error))
      }));

      await service.trackPageView();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Analytics] Tracking failed:', error);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStats', () => {
    it('should return default stats structure', async () => {
      const stats = await service.getStats();

      expect(stats).toEqual({
        todayPageViews: 0,
        weekPageViews: 0,
        monthPageViews: 0,
        yearPageViews: 0,
        totalPageViews: 0,
        totalPrayers: 0,
        currentPrayers: 0,
        answeredPrayers: 0,
        archivedPrayers: 0,
        totalSubscribers: 0,
        activeEmailSubscribers: 0,
        loading: false
      });
    });

    it('should fetch and return analytics stats', async () => {
      const stats = await service.getStats();

      // Since the default mock returns 0 for all counts, just verify the structure is correct
      expect(stats).toEqual(expect.objectContaining({
        todayPageViews: expect.any(Number),
        weekPageViews: expect.any(Number),
        monthPageViews: expect.any(Number),
        yearPageViews: expect.any(Number),
        totalPageViews: expect.any(Number),
        totalPrayers: expect.any(Number),
        currentPrayers: expect.any(Number),
        answeredPrayers: expect.any(Number),
        archivedPrayers: expect.any(Number),
        totalSubscribers: expect.any(Number),
        activeEmailSubscribers: expect.any(Number),
        loading: false
      }));
    });

    it('should handle errors for individual stat queries', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Query failed');

      const createErrorChain = () => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => Promise.resolve({ count: null, error }))
          }))
        }))
      });

      const createErrorSimpleChain = () => ({
        select: vi.fn(() => Promise.resolve({ count: null, error }))
      });

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'analytics') {
          return createErrorChain();
        } else if (table === 'prayers') {
          return createErrorSimpleChain();
        } else if (table === 'email_subscribers') {
          return createErrorSimpleChain();
        }
        return createErrorSimpleChain();
      });

      const stats = await service.getStats();

      // Should return default values on error
      expect(stats.totalPageViews).toBe(0);
      expect(stats.totalPrayers).toBe(0);
      expect(stats.totalSubscribers).toBe(0);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle exceptions in getStats', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSupabaseClient.from = vi.fn(() => {
        throw new Error('Unexpected error');
      });

      const stats = await service.getStats();

      expect(stats.totalPageViews).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching analytics stats:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('should calculate correct date ranges', async () => {
      const selectSpy = vi.fn();
      const eqSpy = vi.fn();
      const gteSpy = vi.fn(() => Promise.resolve({ count: 0, error: null }));

      mockSupabaseClient.from = vi.fn(() => ({
        select: selectSpy.mockReturnValue({
          eq: eqSpy.mockReturnValue({
            gte: gteSpy
          })
        })
      }));

      await service.getStats();

      // Verify date calculations (calls with gte for today, week, month)
      const gteCallsWithDates = gteSpy.mock.calls.filter(
        (call) => call.length > 0 && call[0] === 'created_at'
      );
      
      // Should have calls for today, week, and month
      expect(gteCallsWithDates.length).toBeGreaterThanOrEqual(3);
    });
  });
});
