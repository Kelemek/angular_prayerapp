import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService } from './analytics.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

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
      const gteCallsWithDates = (gteSpy.mock.calls as any[]).filter(
        (call) => call.length > 0 && call[0] === 'created_at'
      );
      
      // Should have calls for today, week, and month
      expect(gteCallsWithDates.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getStats - comprehensive coverage', () => {
    it('should return stats with positive values', async () => {
      let eqCallCount = 0;
      let prayersSelectCount = 0;
      let subscribersSelectCount = 0;

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'analytics') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => {
                eqCallCount++;
                if (eqCallCount === 1) {
                  // First eq returns result directly (no gte)
                  return Promise.resolve({ count: 100, error: null });
                }
                // Subsequent eq calls return gte chain
                return {
                  gte: vi.fn(function(col: string, val: string) {
                    if (eqCallCount === 2) return Promise.resolve({ count: 50, error: null });
                    if (eqCallCount === 3) return Promise.resolve({ count: 75, error: null });
                    if (eqCallCount === 4) return Promise.resolve({ count: 90, error: null });
                    if (eqCallCount === 5) return Promise.resolve({ count: 100, error: null });
                    return Promise.resolve({ count: 0, error: null });
                  })
                };
              })
            }))
          };
        } else if (table === 'prayers') {
          return {
            select: vi.fn(() => {
              prayersSelectCount++;
              if (prayersSelectCount === 1) {
                // First select = total prayers (no eq chaining)
                return Promise.resolve({ count: 50, error: null });
              }
              // Other selects have eq chaining
              return {
                eq: vi.fn(function(column: string, value: any) {
                  if (value === 'current') return Promise.resolve({ count: 30, error: null });
                  if (value === 'answered') return Promise.resolve({ count: 15, error: null });
                  if (value === 'archived') return Promise.resolve({ count: 5, error: null });
                  return Promise.resolve({ count: 50, error: null });
                })
              };
            })
          };
        } else if (table === 'email_subscribers') {
          return {
            select: vi.fn(() => {
              subscribersSelectCount++;
              if (subscribersSelectCount === 1) {
                // First select = total subscribers (no eq)
                return Promise.resolve({ count: 25, error: null });
              }
              // Second select has eq for is_active
              return {
                eq: vi.fn(function(column: string, value: any) {
                  if (value === true) return Promise.resolve({ count: 20, error: null });
                  return Promise.resolve({ count: 25, error: null });
                })
              };
            })
          };
        }
        return { select: vi.fn(() => Promise.resolve({ count: 0, error: null })) };
      });

      const stats = await service.getStats();

      expect(stats.totalPageViews).toBe(100);
      expect(stats.todayPageViews).toBe(50);
      expect(stats.weekPageViews).toBe(75);
      expect(stats.monthPageViews).toBe(90);
      expect(stats.yearPageViews).toBe(100);
      expect(stats.totalPrayers).toBe(50);
      expect(stats.currentPrayers).toBe(30);
      expect(stats.answeredPrayers).toBe(15);
      expect(stats.archivedPrayers).toBe(5);
      expect(stats.totalSubscribers).toBe(25);
      expect(stats.activeEmailSubscribers).toBe(20);
      expect(stats.loading).toBe(false);
    });

    it('should handle different counts for each time period', async () => {
      let eqCallCount = 0;

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'analytics') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => {
                eqCallCount++;
                if (eqCallCount === 1) {
                  // First eq returns result directly (no gte)
                  return Promise.resolve({ count: 100, error: null });
                }
                // Subsequent calls return gte chain
                return {
                  gte: vi.fn(() => {
                    if (eqCallCount === 2) return Promise.resolve({ count: 5, error: null });
                    if (eqCallCount === 3) return Promise.resolve({ count: 20, error: null });
                    if (eqCallCount === 4) return Promise.resolve({ count: 80, error: null });
                    if (eqCallCount === 5) return Promise.resolve({ count: 100, error: null });
                    return Promise.resolve({ count: 0, error: null });
                  })
                };
              })
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ count: 0, error: null }))
          }))
        };
      });

      const stats = await service.getStats();

      expect(stats.totalPageViews).toBe(100);
      expect(stats.todayPageViews).toBe(5);
      expect(stats.weekPageViews).toBe(20);
      expect(stats.monthPageViews).toBe(80);
      expect(stats.yearPageViews).toBe(100);
    });

    it('should handle null count values', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => Promise.resolve({ count: null, error: null }))
          }))
        }))
      }));

      const stats = await service.getStats();

      expect(stats.totalPageViews).toBe(0);
      expect(stats.loading).toBe(false);
    });

    it('should handle errors in specific queries', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Query failed');
      let prayersSelectCount = 0;

      mockSupabaseClient.from = vi.fn((table: string) => {
        if (table === 'analytics') {
          let eqCallCount = 0;
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => {
                eqCallCount++;
                return {
                  gte: vi.fn(() => Promise.resolve({ count: null, error }))
                };
              })
            }))
          };
        } else if (table === 'prayers') {
          return {
            select: vi.fn(() => {
              prayersSelectCount++;
              return {
                eq: vi.fn(function(column: string, value: string) {
                  // Return error for some status queries
                  if (value === 'current') return Promise.resolve({ count: null, error });
                  if (value === 'answered') return Promise.resolve({ count: 15, error: null });
                  if (value === 'archived') return Promise.resolve({ count: null, error });
                  return Promise.resolve({ count: 50, error: null });
                })
              };
            })
          };
        } else if (table === 'email_subscribers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(function(column: string, value: any) {
                if (value === true) return Promise.resolve({ count: null, error });
                return Promise.resolve({ count: 25, error: null });
              })
            }))
          };
        }
        return { select: vi.fn(() => Promise.resolve({ count: 0, error: null })) };
      });

      const stats = await service.getStats();

      expect(stats.yearPageViews).toBe(0);
      expect(stats.currentPrayers).toBe(0);
      expect(stats.archivedPrayers).toBe(0);
      expect(stats.activeEmailSubscribers).toBe(0);
      expect(stats.loading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(7); // All error branches logged
      consoleErrorSpy.mockRestore();
    });

    it('should set loading to false in finally block', async () => {
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: 0, error: null })),
          gte: vi.fn(() => Promise.resolve({ count: 0, error: null }))
        }))
      }));

      const stats = await service.getStats();

      expect(stats.loading).toBe(false);
    });

    it('should handle Promise.all rejection gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockSupabaseClient.from = vi.fn(() => {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.reject(new Error('DB error'))),
            gte: vi.fn(() => Promise.reject(new Error('DB error')))
          }))
        };
      });

      // Should not throw, just log error
      const stats = await service.getStats();

      expect(stats.loading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('trackPageView - comprehensive coverage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should include valid ISO timestamp', async () => {
      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }));
      
      mockSupabaseClient.from = vi.fn(() => ({ update: updateMock }));

      const beforeCall = new Date();
      await service.trackPageView();
      const afterCall = new Date();

      expect(updateMock.mock.calls.length).toBeGreaterThan(0);
      const callArgs = (updateMock.mock.calls[0] as any)?.[0] as any;
      expect(callArgs).toBeDefined();

      const timestamp = new Date(callArgs?.last_activity_date);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000);
    });

    it('should handle Promise rejection gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Update error');

      mockSupabaseClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.reject(error))
        }))
      }));

      await service.trackPageView();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[Analytics] Failed to track page view:', error);
      consoleErrorSpy.mockRestore();
    });
  });
});
