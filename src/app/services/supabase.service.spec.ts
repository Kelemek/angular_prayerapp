import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseService } from './supabase.service';

// Mock Sentry
vi.mock('@sentry/angular', () => ({
  captureException: vi.fn()
}));

// Mock environment
vi.mock('../../environments/environment', () => ({
  environment: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-anon-key-123'
  }
}));

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key, options) => ({
    _url: url,
    _key: key,
    _options: options,
    auth: {},
    from: vi.fn()
  }))
}));

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get fresh instance
    const { SupabaseService } = await import('./supabase.service');
    service = new SupabaseService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('constructor', () => {
    it('should create supabase client with correct options', () => {
      // Verify the service was created successfully
      expect(service).toBeTruthy();
      expect(service.client).toBeDefined();
      expect(service.getSupabaseUrl()).toBe('https://test.supabase.co');
      expect(service.getSupabaseKey()).toBe('test-anon-key-123');
    });
  });

  describe('client getter', () => {
    it('should return the supabase client', () => {
      const client = service.client;
      expect(client).toBeDefined();
      expect(client).toHaveProperty('_url', 'https://test.supabase.co');
      expect(client).toHaveProperty('_key', 'test-anon-key-123');
    });
  });

  describe('getConfig', () => {
    it('should return supabase configuration', () => {
      const config = service.getConfig();
      
      expect(config).toEqual({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key-123'
      });
    });
  });

  describe('getSupabaseUrl', () => {
    it('should return supabase URL', () => {
      const url = service.getSupabaseUrl();
      expect(url).toBe('https://test.supabase.co');
    });
  });

  describe('getSupabaseKey', () => {
    it('should return supabase anon key', () => {
      const key = service.getSupabaseKey();
      expect(key).toBe('test-anon-key-123');
    });
  });

  describe('getClient', () => {
    it('should return the supabase client', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
      expect(client).toHaveProperty('_url', 'https://test.supabase.co');
    });
  });

  describe('isNetworkError', () => {
    it('should return false for null/undefined', () => {
      expect(service.isNetworkError(null)).toBe(false);
      expect(service.isNetworkError(undefined)).toBe(false);
    });

    it('should detect "failed to fetch" errors', () => {
      const error = new Error('Failed to fetch data');
      expect(service.isNetworkError(error)).toBe(true);
      expect(service.isNetworkError('failed to fetch')).toBe(true);
    });

    it('should detect network errors', () => {
      const error = new Error('Network request failed');
      expect(service.isNetworkError(error)).toBe(true);
      expect(service.isNetworkError('network error')).toBe(true);
    });

    it('should detect timeout errors', () => {
      const error = new Error('Request timeout');
      expect(service.isNetworkError(error)).toBe(true);
      expect(service.isNetworkError('timeout exceeded')).toBe(true);
    });

    it('should detect aborted errors', () => {
      expect(service.isNetworkError('request aborted')).toBe(true);
    });

    it('should detect connection errors', () => {
      expect(service.isNetworkError('connection refused')).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = new Error('Invalid data');
      expect(service.isNetworkError(error)).toBe(false);
      expect(service.isNetworkError('something else')).toBe(false);
    });
  });

  describe('directQuery', () => {
    it('should perform a successful GET query', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1, name: 'Test' }]),
          headers: new Map()
        } as any)
      );

      const result = await service.directQuery('test_table', {
        select: '*',
        eq: { id: 1 }
      });

      expect(result.data).toEqual([{ id: 1, name: 'Test' }]);
      expect(result.error).toBeNull();
    });

    it('should handle query with order parameter', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
          headers: new Map()
        } as any)
      );

      await service.directQuery('test_table', {
        order: { column: 'created_at', ascending: false }
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('order=created_at.desc');
    });

    it('should handle query with limit parameter', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
          headers: new Map()
        } as any)
      );

      await service.directQuery('test_table', {
        limit: 10
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('limit=10');
    });

    it('should perform HEAD request when head is true', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          headers: new Map([['Content-Range', '*/100']])
        } as any)
      );

      const result = await service.directQuery('test_table', {
        head: true,
        count: 'exact'
      });

      expect((global.fetch as any).mock.calls[0][1].method).toBe('HEAD');
      expect(result.data).toBeNull();
      expect(result.count).toBe(100);
    });

    it('should handle query errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Bad request')
        } as any)
      );

      const result = await service.directQuery('test_table');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Query failed');
    });

    it('should handle fetch exceptions', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const result = await service.directQuery('test_table');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Network error');
    });

    it('should handle timeout', async () => {
      global.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true } as any), 100);
          })
      );

      const result = await service.directQuery('test_table', { timeout: 50 });

      expect(result.error).toBeDefined();
    });

    it('should parse Content-Range header for count', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
          headers: new Map([['Content-Range', '0-9/42']])
        } as any)
      );

      const result = await service.directQuery('test_table', { count: 'exact' });

      expect(result.count).toBe(42);
    });
  });

  describe('directMutation', () => {
    it('should perform a successful POST mutation', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: 1, name: 'Created' })
        } as any)
      );

      const result = await service.directMutation('test_table', {
        method: 'POST',
        body: { name: 'Test' },
        returning: true
      });

      expect(result.data).toEqual({ id: 1, name: 'Created' });
      expect(result.error).toBeNull();
      expect((global.fetch as any).mock.calls[0][1].method).toBe('POST');
    });

    it('should perform a PATCH mutation', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id: 1, name: 'Updated' })
        } as any)
      );

      const result = await service.directMutation('test_table', {
        method: 'PATCH',
        body: { name: 'Updated' },
        eq: { id: 1 },
        returning: true
      });

      expect(result.data).toEqual({ id: 1, name: 'Updated' });
      expect((global.fetch as any).mock.calls[0][1].method).toBe('PATCH');
    });

    it('should perform a DELETE mutation', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 204
        } as any)
      );

      const result = await service.directMutation('test_table', {
        method: 'DELETE',
        eq: { id: 1 }
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect((global.fetch as any).mock.calls[0][1].method).toBe('DELETE');
    });

    it('should handle mutation errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Bad request')
        } as any)
      );

      const result = await service.directMutation('test_table', {
        method: 'POST',
        body: {}
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Mutation failed');
    });

    it('should handle mutation exceptions', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const result = await service.directMutation('test_table', {
        method: 'POST',
        body: {}
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle timeout', async () => {
      global.fetch = vi.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true } as any), 100);
          })
      );

      const result = await service.directMutation('test_table', {
        method: 'POST',
        body: {},
        timeout: 50
      });

      expect(result.error).toBeDefined();
    });

    it('should not return data when returning is false', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 204
        } as any)
      );

      const result = await service.directMutation('test_table', {
        method: 'POST',
        body: {},
        returning: false
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });
});
