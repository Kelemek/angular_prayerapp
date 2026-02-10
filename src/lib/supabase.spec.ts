import { describe, it, expect, vi } from 'vitest';

// Mock the @supabase/supabase-js module
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key) => ({
    _url: url,
    _key: key,
    auth: {},
    from: vi.fn(),
  })),
}));

// Mock the environment
vi.mock('../environments/environment', () => ({
  environment: {
    production: false,
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-anon-key',
  },
}));

describe('supabase', () => {
  it('should create and export a supabase client', async () => {
    // Import after mocks are set up
    const { supabase } = await import('./supabase');
    const { createClient } = await import('@supabase/supabase-js');

    // Verify createClient was called with correct parameters
    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          lock: expect.any(Function)
        })
      })
    );

    // Verify the exported client exists
    expect(supabase).toBeDefined();
    expect(supabase).toHaveProperty('_url', 'https://test.supabase.co');
    expect(supabase).toHaveProperty('_key', 'test-anon-key');
  });

  it('should execute lock function without acquiring locks', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    
    // Get the lock function from the createClient call
    const call = (createClient as any).mock.calls[0];
    const lockFn = call[2].auth.lock;
    
    // Test the lock function
    const mockFn = vi.fn(async () => 'test-result');
    const result = await lockFn('test-lock', 5000, mockFn);
    
    expect(result).toBe('test-result');
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('should handle lock function with async operations', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    
    const call = (createClient as any).mock.calls[0];
    const lockFn = call[2].auth.lock;
    
    // Test with a more complex async function
    const testValue = { data: 'value' };
    const asyncFn = vi.fn(async () => testValue);
    const result = await lockFn('another-lock', 3000, asyncFn);
    
    expect(result).toEqual(testValue);
    expect(asyncFn).toHaveBeenCalledOnce();
  });

  it('should pass through function errors from lock callback', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    
    const call = (createClient as any).mock.calls[0];
    const lockFn = call[2].auth.lock;
    
    const testError = new Error('Lock operation failed');
    const errorFn = vi.fn(async () => {
      throw testError;
    });
    
    await expect(lockFn('error-lock', 1000, errorFn)).rejects.toThrow(
      'Lock operation failed'
    );
    expect(errorFn).toHaveBeenCalledOnce();
  });
});
