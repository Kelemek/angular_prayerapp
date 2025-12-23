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
      'test-anon-key'
    );

    // Verify the exported client exists
    expect(supabase).toBeDefined();
    expect(supabase).toHaveProperty('_url', 'https://test.supabase.co');
    expect(supabase).toHaveProperty('_key', 'test-anon-key');
  });
});
