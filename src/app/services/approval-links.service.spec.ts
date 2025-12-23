import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApprovalLinksService } from './approval-links.service';
import { SupabaseService } from './supabase.service';

describe('ApprovalLinksService', () => {
  let service: ApprovalLinksService;
  let mockSupabaseService: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock SupabaseService
    mockSupabaseService = {
      client: {
        from: vi.fn(() => ({
          insert: vi.fn(() => Promise.resolve({ error: null })),
        })),
        functions: {
          invoke: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }
      }
    };
    
    service = new ApprovalLinksService(mockSupabaseService);

    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://test.com' },
      writable: true,
      configurable: true
    });

    // Mock crypto.getRandomValues
    const mockGetRandomValues = vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = i;
      }
      return array;
    });

    Object.defineProperty(global, 'crypto', {
      value: {
        getRandomValues: mockGetRandomValues
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateApprovalLink', () => {
    it('should generate approval link for prayer request', async () => {
      const requestType = 'prayer';
      const requestId = 'prayer-123';
      const adminEmail = 'admin@example.com';

      const result = await service.generateApprovalLink(requestType, requestId, adminEmail);

      expect(result).toBeTruthy();
      expect(result).toContain('https://test.com');
      expect(result).toContain('approval_type=prayer');
      expect(result).toContain('approval_id=prayer-123');
      expect(result).toContain('code=');
      expect(mockSupabaseService.client.from).toHaveBeenCalledWith('approval_codes');
    });

    it('should generate approval link for update request', async () => {
      const result = await service.generateApprovalLink('update', 'update-123', 'admin@test.com');

      expect(result).toContain('approval_type=update');
      expect(result).toContain('approval_id=update-123');
    });

    it('should generate approval link for deletion request', async () => {
      const result = await service.generateApprovalLink('deletion', 'del-123', 'admin@test.com');

      expect(result).toContain('approval_type=deletion');
      expect(result).toContain('approval_id=del-123');
    });

    it('should generate approval link for status_change request', async () => {
      const result = await service.generateApprovalLink('status_change', 'status-123', 'admin@test.com');

      expect(result).toContain('approval_type=status_change');
      expect(result).toContain('approval_id=status-123');
    });

    it('should generate approval link for preference-change request', async () => {
      const result = await service.generateApprovalLink('preference-change', 'pref-123', 'admin@test.com');

      expect(result).toContain('approval_type=preference-change');
      expect(result).toContain('approval_id=pref-123');
    });

    it('should normalize admin email to lowercase and trim', async () => {
      let insertedData: any;
      
      mockSupabaseService.client.from = vi.fn(() => ({
        insert: vi.fn((data: any) => {
          insertedData = data;
          return Promise.resolve({ error: null });
        })
      }));

      await service.generateApprovalLink('prayer', 'test-123', '  Admin@Example.COM  ');

      expect(insertedData.admin_email).toBe('admin@example.com');
    });

    it('should set expiry to 24 hours from now', async () => {
      let insertedData: any;
      const now = new Date();
      
      mockSupabaseService.client.from = vi.fn(() => ({
        insert: vi.fn((data: any) => {
          insertedData = data;
          return Promise.resolve({ error: null });
        })
      }));

      await service.generateApprovalLink('prayer', 'test-123', 'admin@test.com');

      const expiresAt = new Date(insertedData.expires_at);
      const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should include all required fields in database insert', async () => {
      let insertedData: any;
      
      mockSupabaseService.client.from = vi.fn(() => ({
        insert: vi.fn((data: any) => {
          insertedData = data;
          return Promise.resolve({ error: null });
        })
      }));

      await service.generateApprovalLink('prayer', 'test-123', 'admin@test.com');

      expect(insertedData).toHaveProperty('code');
      expect(insertedData).toHaveProperty('admin_email');
      expect(insertedData).toHaveProperty('approval_type');
      expect(insertedData).toHaveProperty('approval_id');
      expect(insertedData).toHaveProperty('expires_at');
      expect(insertedData.approval_type).toBe('prayer');
      expect(insertedData.approval_id).toBe('test-123');
    });

    it('should return null if database insert fails', async () => {
      const mockError = new Error('Database error');
      mockSupabaseService.client.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: mockError }))
      }));

      const result = await service.generateApprovalLink('prayer', 'test-123', 'admin@test.com');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create approval code:', mockError);
    });

    it('should return null if exception is thrown', async () => {
      mockSupabaseService.client.from = vi.fn(() => {
        throw new Error('Network error');
      });

      const result = await service.generateApprovalLink('prayer', 'test-123', 'admin@test.com');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error generating approval link:', expect.any(Error));
    });

    it('should generate different codes for multiple calls', async () => {
      let codes: string[] = [];
      
      mockSupabaseService.client.from = vi.fn(() => ({
        insert: vi.fn((data: any) => {
          codes.push(data.code);
          return Promise.resolve({ error: null });
        })
      }));

      // Update the mock crypto to return different values
      let callCount = 0;
      const mockGetRandomValues = vi.fn((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = (i + callCount) % 256;
        }
        callCount++;
        return array;
      });

      Object.defineProperty(global, 'crypto', {
        value: {
          getRandomValues: mockGetRandomValues
        },
        writable: true,
        configurable: true
      });

      await service.generateApprovalLink('prayer', 'test-1', 'admin@test.com');
      await service.generateApprovalLink('prayer', 'test-2', 'admin@test.com');

      expect(codes).toHaveLength(2);
      expect(codes[0]).not.toBe(codes[1]);
    });
  });

  describe('validateApprovalCode', () => {
    it('should validate approval code and return approval info', async () => {
      const mockData = {
        success: true,
        approval_type: 'prayer',
        approval_id: 'prayer-123',
        user: { email: 'admin@test.com' }
      };

      mockSupabaseService.client.functions.invoke = vi.fn(() =>
        Promise.resolve({ data: mockData, error: null })
      );

      const result = await service.validateApprovalCode('test-code-123');

      expect(result).toEqual({
        approval_type: 'prayer',
        approval_id: 'prayer-123',
        user: { email: 'admin@test.com' }
      });
      expect(mockSupabaseService.client.functions.invoke).toHaveBeenCalledWith(
        'validate-approval-code',
        { body: { code: 'test-code-123' } }
      );
    });

    it('should return null if validation fails with error', async () => {
      const mockError = new Error('Validation failed');
      mockSupabaseService.client.functions.invoke = vi.fn(() =>
        Promise.resolve({ data: null, error: mockError })
      );

      const result = await service.validateApprovalCode('invalid-code');

      expect(result).toBeNull();
    });

    it('should return null if response indicates failure', async () => {
      mockSupabaseService.client.functions.invoke = vi.fn(() =>
        Promise.resolve({ data: { success: false }, error: null })
      );

      const result = await service.validateApprovalCode('expired-code');

      expect(result).toBeNull();
    });

    it('should return null if data is null', async () => {
      mockSupabaseService.client.functions.invoke = vi.fn(() =>
        Promise.resolve({ data: null, error: null })
      );

      const result = await service.validateApprovalCode('missing-code');

      expect(result).toBeNull();
    });

    it('should return null if exception is thrown', async () => {
      mockSupabaseService.client.functions.invoke = vi.fn(() => {
        throw new Error('Network error');
      });

      const result = await service.validateApprovalCode('error-code');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error validating approval code:', expect.any(Error));
    });
  });

  describe('generateRandomCode', () => {
    it('should generate a 48-character hex string', async () => {
      // Access private method through code generation
      let generatedCode: string = '';
      
      mockSupabaseService.client.from = vi.fn(() => ({
        insert: vi.fn((data: any) => {
          generatedCode = data.code;
          return Promise.resolve({ error: null });
        })
      }));

      await service.generateApprovalLink('prayer', 'test', 'admin@test.com');

      expect(generatedCode).toHaveLength(48); // 24 bytes * 2 hex chars per byte
      expect(generatedCode).toMatch(/^[0-9a-f]+$/);
    });
  });
});
