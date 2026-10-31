import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService, analyticsWindowStarts } from './analytics.service';
import { ADMIN_SITE_ANALYTICS_TILES, emptyAdminAnalyticsStats } from '../lib/admin-analytics-tiles';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockSupabaseService: any;
  let mockUserSessionService: any;
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
      rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
      from: vi.fn((table: string) => {
        if (table === 'analytics') {
          return createDefaultAnalyticsChain();
        } else if (table === 'prayers') {
          return createDefaultSimpleChain();
        } else if (table === 'email_subscribers') {
          return createDefaultSimpleChain();
        } else if (table === 'memorized_items') {
          return {
            select: vi.fn(() => Promise.resolve({ data: [], error: null }))
          };
        }
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
        };
      })
    };

    // Create mock SupabaseService
    mockSupabaseService = wireGatedSupabaseMock({
      client: mockSupabaseClient
    }) as unknown as SupabaseService;

    // Create mock UserSessionService
    mockUserSessionService = {
      currentSession: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      },
      getCurrentSession: vi.fn(() => ({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }))
    } as unknown as UserSessionService;

    service = new AnalyticsService(mockSupabaseService, mockUserSessionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('trackPageView', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should update user last activity date', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }));
      
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'email_subscribers') {
          return { update: updateMock };
        }
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
        };
      });

      await service.trackPageView();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('email_subscribers');
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          last_activity_date: expect.any(String)
        })
      );
    });

    it('should throttle updates - skip if updated within 5 minutes', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }));
      
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'email_subscribers') {
          return { update: updateMock };
        }
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
        };
      });

      // First call should update
      await service.trackPageView();
      expect(updateMock).toHaveBeenCalledTimes(1);

      // Second call immediately should be throttled
      await service.trackPageView();
      expect(updateMock).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Insert failed');
      
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'analytics') {
          return {
            insert: vi.fn(() => Promise.reject(error))
          };
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        };
      });

      await service.trackPageView();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Analytics] Failed to track page view:', error);
      consoleErrorSpy.mockRestore();
    });

    it('should not track if user is not logged in', async () => {
      const insertMock = vi.fn();
      const updateMock = vi.fn();
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'analytics') {
          return { insert: insertMock };
        }
        return { update: updateMock };
      });
      
      // Mock null session
      mockUserSessionService.getCurrentSession = vi.fn(() => null);

      await service.trackPageView();

      // Should not insert or update when not logged in
      expect(insertMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe('getPageViewTimeSeries', () => {
    it('should call both bucket RPCs with hour bucket for 24h preset', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T18:30:00.000Z'));

      const rpcMock = vi.fn(() => Promise.resolve({ data: [], error: null }));
      mockSupabaseClient.rpc = rpcMock;

      await service.getPageViewTimeSeries('24h');

      const expected = {
        p_start: '2024-06-14T18:30:00.000Z',
        p_end: '2024-06-15T18:30:00.000Z',
        p_bucket: 'hour'
      };
      expect(rpcMock).toHaveBeenCalledWith('analytics_page_view_buckets', expected);
      expect(rpcMock).toHaveBeenCalledWith('analytics_approval_buckets', expected);

      vi.useRealTimers();
    });

    it('should call both bucket RPCs with day bucket for 7d preset', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));

      const rpcMock = vi.fn(() => Promise.resolve({ data: [], error: null }));
      mockSupabaseClient.rpc = rpcMock;

      await service.getPageViewTimeSeries('7d');

      const expected = {
        p_start: '2024-06-08T12:00:00.000Z',
        p_end: '2024-06-15T12:00:00.000Z',
        p_bucket: 'day'
      };
      expect(rpcMock).toHaveBeenCalledWith('analytics_page_view_buckets', expected);
      expect(rpcMock).toHaveBeenCalledWith('analytics_approval_buckets', expected);

      vi.useRealTimers();
    });

    it('should call both bucket RPCs with day bucket for 365d preset', async () => {
      vi.useFakeTimers();
      const end = new Date('2024-06-15T12:00:00.000Z');
      vi.setSystemTime(end);

      const rpcMock = vi.fn(() => Promise.resolve({ data: [], error: null }));
      mockSupabaseClient.rpc = rpcMock;

      await service.getPageViewTimeSeries('365d');

      const start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
      const expected = {
        p_start: start.toISOString(),
        p_end: end.toISOString(),
        p_bucket: 'day'
      };
      expect(rpcMock).toHaveBeenCalledWith('analytics_page_view_buckets', expected);
      expect(rpcMock).toHaveBeenCalledWith('analytics_approval_buckets', expected);

      vi.useRealTimers();
    });

    it('should zero-fill missing buckets and merge RPC counts', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T03:15:00.000Z'));

      mockSupabaseClient.rpc = vi.fn((name: string) => {
        if (name === 'analytics_page_view_buckets') {
          return Promise.resolve({
            data: [
              { bucket_start: '2024-06-15T01:00:00.000Z', event_count: 5 },
              { bucket_start: '2024-06-15T02:00:00.000Z', event_count: 3 }
            ],
            error: null
          });
        }
        return Promise.resolve({ data: [], error: null });
      });

      const series = await service.getPageViewTimeSeries('12h');

      // 12h back from 03:15 -> 15:15 prior day; hour buckets from 15:00 previous day through 02:00 same day
      expect(series.length).toBeGreaterThan(0);
      const byHour = Object.fromEntries(series.map((p) => [p.bucketStart, p]));
      expect(byHour['2024-06-15T01:00:00.000Z'].count).toBe(5);
      expect(byHour['2024-06-15T02:00:00.000Z'].count).toBe(3);
      expect(byHour['2024-06-14T15:00:00.000Z'].count).toBe(0);
      expect(byHour['2024-06-15T01:00:00.000Z'].approvalCount).toBe(0);

      vi.useRealTimers();
    });

    it('should merge approval buckets by bucket_start', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T03:15:00.000Z'));

      mockSupabaseClient.rpc = vi.fn((name: string) => {
        if (name === 'analytics_page_view_buckets') {
          return Promise.resolve({ data: [], error: null });
        }
        return Promise.resolve({
          data: [
            {
              bucket_start: '2024-06-15T01:00:00.000Z',
              approval_count: 2,
              approval_labels: 'Prayer A\nPrayer B (update)'
            }
          ],
          error: null
        });
      });

      const series = await service.getPageViewTimeSeries('12h');
      const row = series.find((p) => p.bucketStart === '2024-06-15T01:00:00.000Z');
      expect(row?.approvalCount).toBe(2);
      expect(row?.approvalLabels).toBe('Prayer A\nPrayer B (update)');

      vi.useRealTimers();
    });

    it('should return zero-filled series when RPC errors', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T18:00:00.000Z'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.rpc = vi.fn(() =>
        Promise.resolve({ data: null, error: { message: 'rpc failed' } })
      );

      const series = await service.getPageViewTimeSeries('24h');

      expect(series.length).toBe(24);
      expect(series.every((p) => p.count === 0 && p.approvalCount === 0)).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('analyticsWindowStarts', () => {
    it('uses local Sunday midnight when now is Sunday, and does not change the input', () => {
      const now = new Date(2026, 10, 1, 18, 30, 45, 12);
      expect(now.getDay()).toBe(0);
      const stamp = now.getTime();
      const starts = analyticsWindowStarts(now);
      expect(now.getTime()).toBe(stamp);
      const sunday = new Date(2026, 10, 1, 0, 0, 0, 0);
      expect(starts.today.getTime()).toBe(sunday.getTime());
      expect(starts.week.getTime()).toBe(sunday.getTime());
      expect(starts.month.getTime()).toBe(sunday.getTime());
      expect(starts.year.getTime()).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).getTime());
    });

    it('uses the local 1st when now is the first of a month', () => {
      const now = new Date(2026, 9, 1, 9, 15, 0);
      expect(now.getDate()).toBe(1);
      expect(now.getDay()).toBe(4);
      const starts = analyticsWindowStarts(now);
      expect(starts.today.getTime()).toBe(new Date(2026, 9, 1, 0, 0, 0, 0).getTime());
      expect(starts.month.getTime()).toBe(starts.today.getTime());
      expect(starts.week.getTime()).toBe(new Date(2026, 8, 27, 0, 0, 0, 0).getTime());
      expect(starts.week.getDay()).toBe(0);
      expect(starts.year.getTime()).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).getTime());
    });

    it('uses local January 1 when now is January 1', () => {
      const now = new Date(2026, 0, 1, 16, 0, 0);
      expect(now.getMonth()).toBe(0);
      expect(now.getDate()).toBe(1);
      const starts = analyticsWindowStarts(now);
      const newYear = new Date(2026, 0, 1, 0, 0, 0, 0);
      expect(starts.today.getTime()).toBe(newYear.getTime());
      expect(starts.month.getTime()).toBe(newYear.getTime());
      expect(starts.year.getTime()).toBe(newYear.getTime());
      expect(starts.week.getTime()).toBe(new Date(2025, 11, 28, 0, 0, 0, 0).getTime());
      expect(starts.week.getDay()).toBe(0);
    });

    it('keeps local midnight across the spring DST change', () => {
      const now = new Date(2026, 2, 11, 15, 45, 30);
      expect(now.getDay()).toBe(3);
      const stamp = now.getTime();
      const starts = analyticsWindowStarts(now);
      expect(now.getTime()).toBe(stamp);
      expect(starts.today.getTime()).toBe(new Date(2026, 2, 11, 0, 0, 0, 0).getTime());
      expect(starts.week.getTime()).toBe(new Date(2026, 2, 8, 0, 0, 0, 0).getTime());
      expect(starts.week.getDay()).toBe(0);
      expect(starts.week.getHours()).toBe(0);
      expect(starts.today.getHours()).toBe(0);
      expect(starts.month.getTime()).toBe(new Date(2026, 2, 1, 0, 0, 0, 0).getTime());
      expect(starts.year.getTime()).toBe(new Date(2026, 0, 1, 0, 0, 0, 0).getTime());
      if (starts.week.getTimezoneOffset() !== starts.today.getTimezoneOffset()) {
        expect(starts.week.getUTCHours()).not.toBe(starts.today.getUTCHours());
      }
    });
  });

  describe('getStats', () => {
    it('returns 0 for every card when the body is not an object', async () => {
      const stats = await service.getStats();
      expect(stats).toEqual(emptyAdminAnalyticsStats(false));
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'admin_site_analytics_stats',
        expect.objectContaining({
          p_today: expect.any(String),
          p_week: expect.any(String),
          p_month: expect.any(String),
          p_year: expect.any(String),
        })
      );
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(mockSupabaseService.from).not.toHaveBeenCalled();
    });

    it('sends one admin_site_analytics_stats call with the local window starts', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 15, 14, 30, 0));
      expect(new Date(2026, 0, 15).getDay()).toBe(4);
      expect(new Date(2026, 0, 11).getDay()).toBe(0);
      mockSupabaseClient.rpc = vi.fn(() => Promise.resolve({ data: {}, error: null }));
      try {
        await service.getStats();
        expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1);
        expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('admin_site_analytics_stats', {
          p_today: new Date(2026, 0, 15, 0, 0, 0, 0).toISOString(),
          p_week: new Date(2026, 0, 11, 0, 0, 0, 0).toISOString(),
          p_month: new Date(2026, 0, 1, 0, 0, 0, 0).toISOString(),
          p_year: new Date(2026, 0, 1, 0, 0, 0, 0).toISOString(),
        });
        expect(mockSupabaseClient.from).not.toHaveBeenCalled();
        expect(mockSupabaseService.from).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('maps every catalog key, including numeric strings', async () => {
      const data: Record<string, unknown> = {};
      const expected = emptyAdminAnalyticsStats(false);
      ADMIN_SITE_ANALYTICS_TILES.forEach((tile, index) => {
        const n = index + 1;
        data[tile.statKey] = index % 2 === 0 ? String(n) : n;
        expected[tile.statKey] = n;
      });
      mockSupabaseClient.rpc = vi.fn(() => Promise.resolve({ data, error: null }));
      const stats = await service.getStats();
      expect(stats).toEqual(expected);
    });

    it('returns 0 for a missing or invalid key and keeps the other numbers', async () => {
      const data: Record<string, unknown> = {};
      for (const tile of ADMIN_SITE_ANALYTICS_TILES) {
        data[tile.statKey] = 4;
      }
      delete data.prayerGroups;
      data.groupMembers = 0;
      data.todayPageViews = null;
      data.weekPageViews = 'nope';
      data.monthPageViews = true;
      data.yearPageViews = Number.POSITIVE_INFINITY;
      mockSupabaseClient.rpc = vi.fn(() => Promise.resolve({ data, error: null }));
      const stats = await service.getStats();
      expect(stats.prayerGroups).toBe(0);
      expect(stats.groupMembers).toBe(0);
      expect(stats.groupNonMembers).toBe(4);
      expect(stats.todayPageViews).toBe(0);
      expect(stats.weekPageViews).toBe(0);
      expect(stats.monthPageViews).toBe(0);
      expect(stats.yearPageViews).toBe(0);
      expect(stats.totalPageViews).toBe(4);
      expect(stats.loading).toBe(false);
    });

    it('resolves zeros when the RPC returns an error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.rpc = vi.fn(() =>
        Promise.resolve({
          data: { totalPageViews: 8 },
          error: { message: 'Not authorized' },
        })
      );
      await expect(service.getStats()).resolves.toEqual(emptyAdminAnalyticsStats(false));
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('resolves zeros when the RPC rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSupabaseClient.rpc = vi.fn(() => Promise.reject(new Error('network')));
      await expect(service.getStats()).resolves.toEqual(emptyAdminAnalyticsStats(false));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching analytics stats:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('trackPageView - comprehensive coverage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should include valid ISO timestamp', async () => {
      const updateMock: any = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }));
      
      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'email_subscribers') {
          return { 
            update: updateMock,
            insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
          };
        }
        if (table === 'analytics') {
          return {
            insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
          };
        }
        return {
          insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
        };
      });

      const beforeCall = new Date();
      await service.trackPageView();
      const afterCall = new Date();

      // Verify the update was called
      expect(updateMock).toHaveBeenCalled();
      
      // Get the call arguments
      const calls: any[] = (updateMock as any).mock.calls;
      if (calls.length > 0) {
        const callArgs = calls[0]?.[0] as any;
        expect(callArgs).toBeDefined();
        expect(callArgs?.last_activity_date).toBeDefined();

        const timestamp = new Date(callArgs?.last_activity_date);
        expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
        expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000);
      }
    });

    it('should handle Promise rejection gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Update error');

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'analytics') {
          return {
            insert: vi.fn(() => Promise.reject(error))
          };
        }
        if (table === 'email_subscribers') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.reject(error))
            }))
          };
        }
        return {
          insert: vi.fn(() => Promise.reject(error)),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.reject(error))
          }))
        };
      });

      await service.trackPageView();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Analytics] Failed to track page view:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });
});
