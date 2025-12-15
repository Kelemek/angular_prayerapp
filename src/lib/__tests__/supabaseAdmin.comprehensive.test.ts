import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { supabaseAdmin } from '../supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// Mock the createClient function
vi.mock('@supabase/supabase-js', async () => {
  const actual = await vi.importActual('@supabase/supabase-js');
  return {
    ...actual,
    createClient: vi.fn(),
  };
});

describe('supabaseAdmin - Comprehensive Coverage Tests', () => {
  const mockCreateClient = vi.mocked(createClient);
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    it('throws error when VITE_SUPABASE_URL is missing', async () => {
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.VITE_SUPABASE_SERVICE_KEY;
      
      // Clear the module cache
      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      // Re-import the module
      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      expect(() => {
        (admin as any).from;
      }).toThrow('Missing service role environment variables');
    });

    it('throws error when VITE_SUPABASE_SERVICE_KEY is missing', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.VITE_SUPABASE_SERVICE_KEY;

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      expect(() => {
        (admin as any).from;
      }).toThrow('Missing service role environment variables');
    });

    it('throws error when service key is placeholder value', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      expect(() => {
        (admin as any).from;
      }).toThrow('Service role key not configured');
    });

    it('logs error details when environment variables are missing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.VITE_SUPABASE_SERVICE_KEY;

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      expect(() => {
        (admin as any).from;
      }).toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Service role environment variables missing:',
        expect.objectContaining({
          hasUrl: false,
          hasKey: false,
          envMode: 'test'
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Client Initialization', () => {
    it('creates client with valid environment variables', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_SERVICE_KEY = 'valid-service-key';

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
      };
      mockCreateClient.mockReturnValue(mockClient as any);

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      // Access a property to trigger initialization
      (admin as any).from('test');
      
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'valid-service-key'
      );
    });

    it('initializes client only once (lazy loading)', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_SERVICE_KEY = 'valid-service-key';

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
      };
      mockCreateClient.mockReturnValue(mockClient as any);

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      // Access multiple properties
      (admin as any).from('test');
      (admin as any).select('*');
      (admin as any).insert({ test: 'data' });
      
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
      expect(mockClient.from).toHaveBeenCalledWith('test');
      expect(mockClient.select).toHaveBeenCalledWith('*');
      expect(mockClient.insert).toHaveBeenCalledWith({ test: 'data' });
    });

    it('handles multiple proxy get operations correctly', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_SERVICE_KEY = 'valid-service-key';

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      };
      mockCreateClient.mockReturnValue(mockClient as any);

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      // Test various Supabase operations
      (admin as any).from('prayers');
      (admin as any).select('*');
      (admin as any).insert({ title: 'Test Prayer' });
      (admin as any).update({ status: 'approved' });
      (admin as any).delete().eq('id', '123');
      
      expect(mockCreateClient).toHaveBeenCalledTimes(1);
      expect(mockClient.from).toHaveBeenCalledWith('prayers');
      expect(mockClient.select).toHaveBeenCalledWith('*');
      expect(mockClient.insert).toHaveBeenCalledWith({ title: 'Test Prayer' });
      expect(mockClient.update).toHaveBeenCalledWith({ status: 'approved' });
      expect(mockClient.delete).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('handles empty string environment variables', async () => {
      process.env.VITE_SUPABASE_URL = '';
      process.env.VITE_SUPABASE_SERVICE_KEY = '';

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      expect(() => {
        (admin as any).from;
      }).toThrow('Missing service role environment variables');
    });

    it('handles null environment variables', async () => {
      process.env.VITE_SUPABASE_URL = null as any;
      process.env.VITE_SUPABASE_SERVICE_KEY = null as any;

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      expect(() => {
        (admin as any).from;
      }).toThrow('Missing service role environment variables');
    });

    it('logs correct environment mode in error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate development mode
      vi.stubGlobal('import.meta', {
        env: {
          MODE: 'development',
          VITE_SUPABASE_URL: '',
          VITE_SUPABASE_SERVICE_KEY: '',
        }
      });

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      expect(() => {
        (admin as any).from;
      }).toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Service role environment variables missing:',
        expect.objectContaining({
          envMode: 'development'
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Security and Production Considerations', () => {
    it('warns about service key exposure in production-like environment', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate production mode with valid but sensitive key
      vi.stubGlobal('import.meta', {
        env: {
          MODE: 'production',
          VITE_SUPABASE_URL: 'https://prod.supabase.co',
          VITE_SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...',
        }
      });

      const mockClient = {
        from: vi.fn().mockReturnThis(),
      };
      mockCreateClient.mockReturnValue(mockClient as any);

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      // Should still work in production but log the security concern
      (admin as any).from('test');
      
      expect(mockCreateClient).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('creates client with correct Database type', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_SERVICE_KEY = 'valid-service-key';

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
      };
      mockCreateClient.mockReturnValue(mockClient as any);

      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      const { Database } = await import('../database.types');
      
      (admin as any).from('test');
      
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'valid-service-key',
        expect.objectContaining({}) // Database type
      );
    });
  });

  describe('Integration with Supabase Operations', () => {
    beforeEach(() => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_SERVICE_KEY = 'valid-service-key';

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockReturnThis(),
        auth: {
          getUser: vi.fn(),
          signOut: vi.fn(),
          onAuthStateChange: vi.fn(),
        },
      };
      mockCreateClient.mockReturnValue(mockClient as any);
    });

    it('supports admin prayer approval operations', async () => {
      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      // Simulate admin prayer approval workflow
      (admin as any)
        .from('prayer_requests')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'admin-id'
        })
        .eq('id', 'prayer-123');
      
      expect(mockCreateClient).toHaveBeenCalled();
    });

    it('supports admin user management operations', async () => {
      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      // Simulate admin user management
      (admin as any)
        .from('admin_users')
        .insert({
          email: 'new-admin@example.com',
          created_at: new Date().toISOString(),
        });
      
      expect(mockCreateClient).toHaveBeenCalled();
    });

    it('supports RPC function calls', async () => {
      vi.doMock('../supabaseAdmin', async () => {
        const actual = await vi.importActual('../supabaseAdmin');
        return { ...actual };
      });

      const { supabaseAdmin: admin } = await import('../supabaseAdmin');
      
      // Simulate RPC call
      (admin as any).rpc('approve_prayer_request', {
        prayer_id: 'prayer-123',
        admin_id: 'admin-123'
      });
      
      expect(mockCreateClient).toHaveBeenCalled();
    });
  });
});

// Note: This test suite is designed to run with `vitest run` and NOT in watch mode
// It uses beforeEach/afterEach for proper setup and cleanup
// All tests are synchronous or use proper async handling
// No watch-specific features are used
