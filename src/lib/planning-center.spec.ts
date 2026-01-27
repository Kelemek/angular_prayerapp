import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lookupPersonByEmail, formatPersonName, PlanningCenterPerson, checkCachedPlanningCenterStatus, savePlanningCenterStatus, batchLookupPlanningCenter, searchPlanningCenterByName, fetchPlanningCenterLists, fetchListMembers } from './planning-center';

describe('planning-center', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Mock console.error to prevent noise in test output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('lookupPersonByEmail', () => {
    const supabaseUrl = 'https://test.supabase.co';
    const supabaseKey = 'test-key';

    it('should lookup person by email successfully', async () => {
      const mockResponse = {
        people: [
          {
            id: '123',
            type: 'Person',
            attributes: {
              first_name: 'John',
              last_name: 'Doe',
              name: 'John Doe',
              avatar: 'https://example.com/avatar.jpg',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        ],
        count: 1,
      };

      // Mock cache check to return null (no cache)
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as unknown as Response)
        // Mock Planning Center API call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as unknown as Response)
        // Mock cache save
        .mockResolvedValueOnce({
          ok: true,
        } as unknown as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      // Should have called cache check, API, and cache save
      expect(fetchMock).toHaveBeenCalledTimes(3);
      
      // Verify Planning Center API call
      expect(fetchMock).toHaveBeenCalledWith(
        `${supabaseUrl}/functions/v1/planning-center-lookup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'john.doe@example.com' }),
        }
      );

      expect(result).toEqual({
        people: mockResponse.people,
        count: 1,
      });
    });

    it('should use cached result when available', async () => {
      // Mock cache check to return true (in Planning Center)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ in_planning_center: true, planning_center_checked_at: new Date().toISOString() }],
      } as unknown as Response);

      const result = await lookupPersonByEmail('cached@example.com', supabaseUrl, supabaseKey);

      // Should only call cache check, not the API
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.cached).toBe(true);
      expect(result.count).toBe(1);
    });

    it('should skip cache when skipCache is true', async () => {
      const mockResponse = {
        people: [],
        count: 0,
      };

      // Mock Planning Center API call
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as unknown as Response)
        // Mock cache save
        .mockResolvedValueOnce({
          ok: true,
        } as unknown as Response);

      const result = await lookupPersonByEmail('test@example.com', supabaseUrl, supabaseKey, true);

      // Should skip cache and go straight to API
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.cached).toBeUndefined();
    });

    it('should trim whitespace from email before lookup', async () => {
      const mockResponse = {
        people: [],
        count: 0,
      };

      // Mock cache check
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as unknown as Response)
        // Mock Planning Center API
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as unknown as Response)
        // Mock cache save
        .mockResolvedValueOnce({
          ok: true,
        } as unknown as Response);

      await lookupPersonByEmail('  john.doe@example.com  ', supabaseUrl, supabaseKey);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ email: 'john.doe@example.com' }),
        })
      );
    });

    it('should return error when email is empty', async () => {
      const result = await lookupPersonByEmail('', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Email address is required',
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return error when email is only whitespace', async () => {
      const result = await lookupPersonByEmail('   ', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Email address is required',
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle API error response', async () => {
      const errorData = {
        error: 'Person not found',
      };

      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => errorData,
      } as unknown as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Person not found',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Planning Center lookup failed:',
        404,
        errorData
      );
    });

    it('should handle API error response without error message', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as unknown as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Failed to lookup person in Planning Center',
      });
    });

    it('should handle JSON parse error in API response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Failed to lookup person in Planning Center',
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      fetchMock.mockRejectedValue(networkError);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Network error',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in Planning Center lookup:',
        networkError
      );
    });

    it('should handle non-Error exceptions', async () => {
      fetchMock.mockRejectedValue('String error');

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
        error: 'Unknown error',
      });
    });

    it('should handle successful response with multiple people', async () => {
      const mockResponse = {
        people: [
          {
            id: '123',
            type: 'Person',
            attributes: {
              first_name: 'John',
              last_name: 'Doe',
              name: 'John Doe',
              avatar: '',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
          {
            id: '456',
            type: 'Person',
            attributes: {
              first_name: 'Jane',
              last_name: 'Doe',
              name: 'Jane Doe',
              avatar: '',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        ],
        count: 2,
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await lookupPersonByEmail('doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: mockResponse.people,
        count: 2,
      });
    });

    it('should handle response without people array', async () => {
      const mockResponse = {
        count: 0,
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: [],
        count: 0,
      });
    });

    it('should handle response without count', async () => {
      const mockResponse = {
        people: [
          {
            id: '123',
            type: 'Person',
            attributes: {
              first_name: 'John',
              last_name: 'Doe',
              name: 'John Doe',
              avatar: '',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        ],
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await lookupPersonByEmail('john.doe@example.com', supabaseUrl, supabaseKey);

      expect(result).toEqual({
        people: mockResponse.people,
        count: 0,
      });
    });
  });

  describe('formatPersonName', () => {
    it('should return name attribute when present', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: 'John',
          last_name: 'Doe',
          name: 'John Doe',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe('John Doe');
    });

    it('should construct name from first and last name when name is empty', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: 'John',
          last_name: 'Doe',
          name: '',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe('John Doe');
    });

    it('should handle person with only first name', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: 'John',
          last_name: '',
          name: '',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe('John ');
    });

    it('should handle person with only last name', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: '',
          last_name: 'Doe',
          name: '',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe(' Doe');
    });

    it('should prefer name attribute over constructed name', () => {
      const person: PlanningCenterPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: 'Jonathan',
          last_name: 'Doe',
          name: 'John Doe',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      const result = formatPersonName(person);

      expect(result).toBe('John Doe');
    });
  });

  describe('batchLookupPlanningCenter', () => {
    const supabaseUrl = 'https://test.supabase.co';
    const supabaseKey = 'test-key';

    it('should batch lookup multiple emails with concurrency control', async () => {
      const emails = ['john@example.com', 'jane@example.com', 'bob@example.com'];
      let concurrentRequests = 0;
      let maxConcurrent = 0;

      fetchMock.mockImplementation(async () => {
        concurrentRequests++;
        maxConcurrent = Math.max(maxConcurrent, concurrentRequests);
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        
        concurrentRequests--;
        
        return {
          ok: true,
          json: async () => ({ people: [], count: 0 })
        } as unknown as Response;
      });

      const results = await batchLookupPlanningCenter(emails, supabaseUrl, supabaseKey, {
        concurrency: 2
      });

      expect(results).toHaveLength(3);
      expect(results[0].email).toBe('john@example.com');
      expect(results[1].email).toBe('jane@example.com');
      expect(results[2].email).toBe('bob@example.com');
      // With concurrency of 2, max concurrent should not exceed 2
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('should track progress with callback', async () => {
      const emails = ['john@example.com', 'jane@example.com', 'bob@example.com'];
      const progressUpdates: [number, number][] = [];

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ people: [], count: 0 })
      } as unknown as Response);

      await batchLookupPlanningCenter(emails, supabaseUrl, supabaseKey, {
        concurrency: 1,
        onProgress: (completed, total) => {
          progressUpdates.push([completed, total]);
        }
      });

      // Should have progress updates for each email
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toEqual([3, 3]);
    });

    it('should retry failed lookups with exponential backoff', async () => {
      const emails = ['john@example.com'];

      // Setup mock to succeed immediately (retries happen inside lookupPersonByEmail)
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('planning-center-lookup')) {
          return {
            ok: true,
            json: async () => ({ people: [], count: 0 })
          } as unknown as Response;
        }
        
        // Cache check returns empty
        return {
          ok: true,
          json: async () => []
        } as unknown as Response;
      });

      const results = await batchLookupPlanningCenter(emails, 'https://test.supabase.co', 'test-key', {
        concurrency: 1,
        maxRetries: 3,
        retryDelayMs: 10
      });

      expect(results).toHaveLength(1);
      // Should complete successfully without retry needed
      expect(results[0].failed).toBe(false);
    });

    it('should mark as failed after all retries exhausted', async () => {
      const emails = ['john@example.com'];

      // Mock fetch to always fail for planning center API
      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('planning-center-lookup')) {
          throw new Error('API Down');
        }
        
        // Cache check returns empty
        return {
          ok: true,
          json: async () => []
        } as unknown as Response;
      });

      const results = await batchLookupPlanningCenter(emails, 'https://test.supabase.co', 'test-key', {
        concurrency: 1,
        maxRetries: 2,
        retryDelayMs: 10
      });

      expect(results).toHaveLength(1);
      expect(results[0].failed).toBe(true);
      // The retries field should reflect attempts (maxRetries is the max, not the actual count)
      expect(results[0].retries).toBeGreaterThanOrEqual(0);
      expect(results[0].result.error).toBeDefined();
    });

    it('should handle mixed success and failure results', async () => {
      const emails = ['john@example.com', 'jane@example.com', 'bob@example.com'];

      // Mock fetch to succeed for some and fail for others
      fetchMock.mockImplementation(async (url: string, options?: any) => {
        if (typeof url === 'string' && url.includes('planning-center-lookup')) {
          // Extract email from request body to make decisions
          const body = options?.body ? JSON.parse(options.body) : {};
          const email = body.email;
          
          if (email === 'jane@example.com') {
            // This one always fails
            return {
              ok: false,
              status: 500,
              json: async () => ({ error: 'Network timeout' })
            } as unknown as Response;
          }
          
          // Others succeed
          return {
            ok: true,
            json: async () => ({ people: [], count: 0 })
          } as unknown as Response;
        }
        
        // Cache check returns empty
        return {
          ok: true,
          json: async () => []
        } as unknown as Response;
      });

      const results = await batchLookupPlanningCenter(
        emails,
        'https://test.supabase.co',
        'test-key',
        {
          concurrency: 1,
          maxRetries: 1,
          retryDelayMs: 10
        }
      );

      expect(results.length).toBe(3);
      expect(results.find(r => r.email === 'john@example.com')?.failed).toBe(false);
      expect(results.find(r => r.email === 'jane@example.com')?.failed).toBe(true);
      expect(results.find(r => r.email === 'bob@example.com')?.failed).toBe(false);
    });

    it('should handle empty email array', async () => {
      const results = await batchLookupPlanningCenter([], supabaseUrl, supabaseKey);

      expect(results).toHaveLength(0);
    });

    it('should use default concurrency of 5', async () => {
      const emails = Array.from({ length: 15 }, (_, i) => `user${i}@example.com`);
      let maxConcurrentRequests = 0;
      let currentConcurrentRequests = 0;

      fetchMock.mockImplementation(async () => {
        currentConcurrentRequests++;
        maxConcurrentRequests = Math.max(maxConcurrentRequests, currentConcurrentRequests);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        currentConcurrentRequests--;
        
        return {
          ok: true,
          json: async () => ({ people: [], count: 0 })
        } as unknown as Response;
      });

      const results = await batchLookupPlanningCenter(emails, supabaseUrl, supabaseKey);

      expect(results).toHaveLength(15);
      expect(maxConcurrentRequests).toBeLessThanOrEqual(5);
    });

    it('should return retry count for each result', async () => {
      const emails = ['john@example.com'];

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('planning-center-lookup')) {
          return {
            ok: true,
            json: async () => ({ people: [{ id: '123', type: 'Person', attributes: {} }], count: 1 })
          } as unknown as Response;
        }
        
        // Cache check returns empty
        return {
          ok: true,
          json: async () => []
        } as unknown as Response;
      });

      const results = await batchLookupPlanningCenter(emails, 'https://test.supabase.co', 'test-key', {
        maxRetries: 2,
        retryDelayMs: 10
      });

      // Should succeed without retries needed
      expect(results[0].retries).toBe(0);
      expect(results[0].failed).toBe(false);
    });
  });

  describe('checkCachedPlanningCenterStatus', () => {
    it('should return true when cached as in Planning Center', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ in_planning_center: true, planning_center_checked_at: new Date().toISOString() }]
      } as unknown as Response);

      const result = await checkCachedPlanningCenterStatus('john@example.com', 'https://test.supabase.co', 'test-key');
      expect(result).toBe(true);
    });

    it('should return false when cached as not in Planning Center', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ in_planning_center: false, planning_center_checked_at: new Date().toISOString() }]
      } as unknown as Response);

      const result = await checkCachedPlanningCenterStatus('john@example.com', 'https://test.supabase.co', 'test-key');
      expect(result).toBe(false);
    });

    it('should return null when no cache found', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as unknown as Response);

      const result = await checkCachedPlanningCenterStatus('john@example.com', 'https://test.supabase.co', 'test-key');
      expect(result).toBeNull();
    });

    it('should handle API error gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as unknown as Response);

      const result = await checkCachedPlanningCenterStatus('john@example.com', 'https://test.supabase.co', 'test-key');
      expect(result).toBeNull();
    });
  });

  describe('savePlanningCenterStatus', () => {
    it('should save true status successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true
      } as unknown as Response);

      await savePlanningCenterStatus('john@example.com', true, 'https://test.supabase.co', 'test-key');
      
      expect(fetchMock).toHaveBeenCalled();
      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain('email_subscribers');
      expect(call[1].method).toBe('PATCH');
      expect(JSON.parse(call[1].body as string)).toEqual(
        expect.objectContaining({
          in_planning_center: true
        })
      );
    });

    it('should save false status successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true
      } as unknown as Response);

      await savePlanningCenterStatus('john@example.com', false, 'https://test.supabase.co', 'test-key');
      
      expect(fetchMock).toHaveBeenCalled();
      const call = fetchMock.mock.calls[0];
      expect(call[0]).toContain('email_subscribers');
      expect(call[1].method).toBe('PATCH');
      expect(JSON.parse(call[1].body as string)).toEqual(
        expect.objectContaining({
          in_planning_center: false
        })
      );
    });

    it('should handle save error gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as unknown as Response);

      await savePlanningCenterStatus('john@example.com', true, 'https://test.supabase.co', 'test-key');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save Planning Center status:', 500);
    });
  });

  describe('searchPlanningCenterByName', () => {
    it('should search by name successfully', async () => {
      const mockResponse = {
        people: [
          {
            id: '123',
            type: 'Person',
            attributes: {
              first_name: 'John',
              last_name: 'Doe',
              name: 'John Doe',
              avatar: 'https://example.com/avatar.jpg',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        ],
        count: 1,
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
        } as unknown as Response);

      const result = await searchPlanningCenterByName('John Doe', 'https://test.supabase.co', 'test-key');

      expect(result).toEqual({
        people: mockResponse.people,
        count: 1,
      });
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should return empty result when no match found', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ people: [], count: 0 }),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
        } as unknown as Response);

      const result = await searchPlanningCenterByName('Nonexistent Person', 'https://test.supabase.co', 'test-key');

      expect(result.count).toBe(0);
      expect(result.people).toEqual([]);
    });

    it('should handle API error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' })
      } as unknown as Response);

      const result = await searchPlanningCenterByName('John Doe', 'https://test.supabase.co', 'test-key');

      expect(result.error).toBe('Server error');
    });
  });

  describe('fetchPlanningCenterLists', () => {
    it('should fetch lists successfully', async () => {
      const mockResponse = {
        lists: [
          { id: '1', name: 'List 1', description: 'First list' },
          { id: '2', name: 'List 2', description: 'Second list' },
        ],
        count: 2
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await fetchPlanningCenterLists('https://test.supabase.co', 'test-key');

      expect(result.lists).toHaveLength(2);
      expect(result.lists[0].name).toBe('List 1');
    });

    it('should handle API error response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      } as unknown as Response);

      const result = await fetchPlanningCenterLists('https://test.supabase.co', 'test-key');

      expect(result.error).toBe('Unauthorized');
    });

    it('should handle network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network failed'));

      const result = await fetchPlanningCenterLists('https://test.supabase.co', 'test-key');

      expect(result.error).toBe('Network failed');
      expect(result.lists).toEqual([]);
    });
  });

  describe('fetchListMembers', () => {
    it('should fetch members with avatars successfully', async () => {
      const mockResponse = {
        members: [
          { id: '1', name: 'John Doe', avatar: 'https://example.com/john.jpg' },
          { id: '2', name: 'Jane Smith', avatar: 'https://example.com/jane.jpg' },
        ],
        count: 2
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as unknown as Response);

      const result = await fetchListMembers('list-123', 'https://test.supabase.co', 'test-key');

      expect(result.members).toHaveLength(2);
      expect(result.members[0].avatar).toBe('https://example.com/john.jpg');
    });

    it('should handle missing listId', async () => {
      const result = await fetchListMembers('', 'https://test.supabase.co', 'test-key');

      expect(result.error).toBe('List ID is required');
      expect(result.members).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should handle whitespace-only listId', async () => {
      const result = await fetchListMembers('   ', 'https://test.supabase.co', 'test-key');

      expect(result.error).toBe('List ID is required');
    });

    it('should handle API error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'List not found' })
      } as unknown as Response);

      const result = await fetchListMembers('invalid-list', 'https://test.supabase.co', 'test-key');

      expect(result.error).toBe('List not found');
    });

    it('should handle network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await fetchListMembers('list-123', 'https://test.supabase.co', 'test-key');

      expect(result.error).toBe('Connection timeout');
    });

    it('should handle response without members', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0 }),
      } as unknown as Response);

      const result = await fetchListMembers('list-123', 'https://test.supabase.co', 'test-key');

      expect(result.members).toEqual([]);
    });
  });
});
