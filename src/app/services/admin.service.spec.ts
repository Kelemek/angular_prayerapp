import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminService } from './admin.service';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((tableName: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}));

// Mock environment
vi.mock('../../environments/environment', () => ({
  environment: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key'
  }
}));

describe('AdminService', () => {
  let service: AdminService;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    // Mock console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Mock import.meta.env
    (import.meta as any).env = {
      VITE_SUPABASE_SERVICE_KEY: 'test-service-key'
    };
    
    service = new AdminService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log environment variables on construction', () => {
    expect(consoleLogSpy).toHaveBeenCalledWith('All env vars:', expect.any(Object));
    expect(consoleLogSpy).toHaveBeenCalledWith('Service key exists?', expect.any(Boolean));
  });

  it('should log error if service key is not found', () => {
    // Reset mocks
    consoleErrorSpy.mockClear();
    consoleLogSpy.mockClear();
    
    // Mock missing service key
    (import.meta as any).env = {};
    
    new AdminService();
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('VITE_SUPABASE_SERVICE_KEY not found in environment variables');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Available keys:', expect.any(Array));
  });

  describe('getAdminSettings', () => {
    it('should get admin settings', async () => {
      const mockData = { id: 1, setting: 'test' };
      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
            }))
          }))
        }))
      };
      
      (service as any).adminClient = mockClient;
      
      const result = await service.getAdminSettings();
      
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
      expect(mockClient.from).toHaveBeenCalledWith('admin_settings');
    });

    it('should handle errors when getting admin settings', async () => {
      const mockError = new Error('Database error');
      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: mockError }))
            }))
          }))
        }))
      };
      
      (service as any).adminClient = mockClient;
      
      const result = await service.getAdminSettings();
      
      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('updateAdminSettings', () => {
    it('should update admin settings', async () => {
      const mockSettings = { setting: 'new value' };
      const mockClient = {
        from: vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({ data: mockSettings, error: null }))
        }))
      };
      
      (service as any).adminClient = mockClient;
      
      const result = await service.updateAdminSettings(mockSettings);
      
      expect(result.data).toEqual(mockSettings);
      expect(result.error).toBeNull();
      expect(mockClient.from).toHaveBeenCalledWith('admin_settings');
    });

    it('should include id and updated_at in upsert', async () => {
      const mockSettings = { setting: 'new value' };
      let upsertData: any;
      
      const mockClient = {
        from: vi.fn(() => ({
          upsert: vi.fn((data: any) => {
            upsertData = data;
            return Promise.resolve({ data: null, error: null });
          })
        }))
      };
      
      (service as any).adminClient = mockClient;
      
      await service.updateAdminSettings(mockSettings);
      
      expect(upsertData.id).toBe(1);
      expect(upsertData.setting).toBe('new value');
      expect(upsertData.updated_at).toBeDefined();
      expect(typeof upsertData.updated_at).toBe('string');
    });
  });

  describe('getEmailSubscribers', () => {
    it('should get email subscribers', async () => {
      const mockData = [{ id: '1', email: 'test@example.com' }];
      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      };
      
      (service as any).adminClient = mockClient;
      
      const result = await service.getEmailSubscribers();
      
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
      expect(mockClient.from).toHaveBeenCalledWith('email_subscribers');
    });

    it('should order by created_at descending', async () => {
      let orderOptions: any;
      
      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn((field: string, options: any) => {
              orderOptions = { field, options };
              return Promise.resolve({ data: [], error: null });
            })
          }))
        }))
      };
      
      (service as any).adminClient = mockClient;
      
      await service.getEmailSubscribers();
      
      expect(orderOptions.field).toBe('created_at');
      expect(orderOptions.options.ascending).toBe(false);
    });
  });

  describe('updateEmailSubscriber', () => {
    it('should update email subscriber', async () => {
      const mockId = 'subscriber-id';
      const mockUpdates = { subscribed: false };
      const mockClient = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockUpdates, error: null }))
          }))
        }))
      };
      
      (service as any).adminClient = mockClient;
      
      const result = await service.updateEmailSubscriber(mockId, mockUpdates);
      
      expect(result.data).toEqual(mockUpdates);
      expect(result.error).toBeNull();
      expect(mockClient.from).toHaveBeenCalledWith('email_subscribers');
    });
  });

  describe('getAnalytics', () => {
    it('should get analytics data', async () => {
      const mockData = [{ id: '1', event: 'test' }];
      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
          }))
        }))
      };
      
      (service as any).adminClient = mockClient;
      
      const result = await service.getAnalytics();
      
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
      expect(mockClient.from).toHaveBeenCalledWith('analytics');
    });
  });

  describe('query', () => {
    it('should return query builder for any table', () => {
      const mockFrom = vi.fn();
      (service as any).adminClient = { from: mockFrom };
      
      service.query('test_table');
      
      expect(mockFrom).toHaveBeenCalledWith('test_table');
    });

    it('should allow chaining queries', () => {
      const mockSelect = vi.fn(() => Promise.resolve({ data: [], error: null }));
      const mockFrom = vi.fn(() => ({ select: mockSelect }));
      (service as any).adminClient = { from: mockFrom };
      
      const query = service.query('test_table');
      
      expect(query).toHaveProperty('select');
    });
  });
});
