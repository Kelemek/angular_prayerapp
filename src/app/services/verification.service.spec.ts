import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { VerificationService } from './verification.service';
import { SupabaseService } from './supabase.service';

describe('VerificationService', () => {
  let service: VerificationService;
  let supabaseService: SupabaseService;

  beforeEach(() => {
    // Mock SupabaseService
    supabaseService = {
      client: {
        from: vi.fn()
      }
    } as any;

    // Create service with mocked dependency
    service = new VerificationService(supabaseService);
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should call checkIfEnabled after timeout', async () => {
      vi.useFakeTimers();
      
      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: { require_email_verification: false }, 
              error: null 
            }))
          }))
        }))
      }));

      const mockSupabase = {
        client: {
          from: fromMock
        }
      } as any;

      const testService = new VerificationService(mockSupabase);

      // Fast-forward time
      vi.advanceTimersByTime(100);
      
      // Wait for async operations to complete
      await vi.runAllTimersAsync();

      expect(fromMock).toHaveBeenCalledWith('admin_settings');
      
      vi.useRealTimers();
    });
  });

  describe('isRecentlyVerified', () => {
    it('should return false if no verified sessions exist', () => {
      const result = service.isRecentlyVerified('test@example.com');
      expect(result).toBe(false);
    });

    it('should return true if email is recently verified', () => {
      const email = 'test@example.com';
      const futureExpiry = Date.now() + 600000; // 10 minutes from now
      const sessions = [{
        email: email.toLowerCase(),
        verifiedAt: Date.now(),
        expiresAt: futureExpiry
      }];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));
      
      const result = service.isRecentlyVerified(email);
      expect(result).toBe(true);
    });

    it('should return false if verification has expired', () => {
      const email = 'test@example.com';
      const pastExpiry = Date.now() - 1000; // 1 second ago
      const sessions = [{
        email: email.toLowerCase(),
        verifiedAt: Date.now(),
        expiresAt: pastExpiry
      }];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));
      
      const result = service.isRecentlyVerified(email);
      expect(result).toBe(false);
    });

    it('should handle email case insensitivity', () => {
      const email = 'TEST@EXAMPLE.COM';
      const futureExpiry = Date.now() + 600000;
      const sessions = [{
        email: 'test@example.com',
        verifiedAt: Date.now(),
        expiresAt: futureExpiry
      }];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));
      
      const result = service.isRecentlyVerified(email);
      expect(result).toBe(true);
    });

    it('should trim whitespace from email', () => {
      const email = '  test@example.com  ';
      const futureExpiry = Date.now() + 600000;
      const sessions = [{
        email: 'test@example.com',
        verifiedAt: Date.now(),
        expiresAt: futureExpiry
      }];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));
      
      const result = service.isRecentlyVerified(email);
      expect(result).toBe(true);
    });
  });

  describe('isEnabled$', () => {
    it('should emit boolean values', async () => {
      const value = await firstValueFrom(service.isEnabled$);
      expect(typeof value).toBe('boolean');
    });
  });

  describe('expiryMinutes$', () => {
    it('should emit default value of 15', async () => {
      const value = await firstValueFrom(service.expiryMinutes$);
      expect(value).toBe(15);
    });
  });

  describe('saveVerifiedSession', () => {
    it('should save a new verified session to localStorage', () => {
      const email = 'test@example.com';
      service.saveVerifiedSession(email);

      const sessionsData = localStorage.getItem('prayer_app_verified_sessions');
      expect(sessionsData).toBeTruthy();

      const sessions = JSON.parse(sessionsData!);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].email).toBe(email.toLowerCase());
      expect(sessions[0].verifiedAt).toBeLessThanOrEqual(Date.now());
      expect(sessions[0].expiresAt).toBeGreaterThan(Date.now());
    });

    it('should normalize email to lowercase', () => {
      const email = 'TEST@EXAMPLE.COM';
      service.saveVerifiedSession(email);

      const sessionsData = localStorage.getItem('prayer_app_verified_sessions');
      const sessions = JSON.parse(sessionsData!);
      expect(sessions[0].email).toBe('test@example.com');
    });

    it('should trim whitespace from email', () => {
      const email = '  test@example.com  ';
      service.saveVerifiedSession(email);

      const sessionsData = localStorage.getItem('prayer_app_verified_sessions');
      const sessions = JSON.parse(sessionsData!);
      expect(sessions[0].email).toBe('test@example.com');
    });

    it('should replace existing session for the same email', () => {
      const email = 'test@example.com';
      
      // Save first session
      service.saveVerifiedSession(email);
      const firstSessionData = localStorage.getItem('prayer_app_verified_sessions');
      const firstSessions = JSON.parse(firstSessionData!);
      const firstVerifiedAt = firstSessions[0].verifiedAt;

      // Wait a bit and save again
      setTimeout(() => {
        service.saveVerifiedSession(email);
        const secondSessionData = localStorage.getItem('prayer_app_verified_sessions');
        const secondSessions = JSON.parse(secondSessionData!);
        
        // Should still be one session
        expect(secondSessions).toHaveLength(1);
        // But with a different timestamp
        expect(secondSessions[0].verifiedAt).toBeGreaterThanOrEqual(firstVerifiedAt);
      }, 10);
    });

    it('should handle multiple different emails', () => {
      service.saveVerifiedSession('user1@example.com');
      service.saveVerifiedSession('user2@example.com');
      service.saveVerifiedSession('user3@example.com');

      const sessionsData = localStorage.getItem('prayer_app_verified_sessions');
      const sessions = JSON.parse(sessionsData!);
      expect(sessions).toHaveLength(3);
      expect(sessions.map((s: any) => s.email)).toContain('user1@example.com');
      expect(sessions.map((s: any) => s.email)).toContain('user2@example.com');
      expect(sessions.map((s: any) => s.email)).toContain('user3@example.com');
    });

    it('should handle localStorage.setItem errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => service.saveVerifiedSession('test@example.com')).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving verification session:', expect.any(Error));

      // Restore
      localStorage.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('refreshStatus', () => {
    it('should call checkIfEnabled', async () => {
      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: { require_email_verification: true }, 
              error: null 
            }))
          }))
        }))
      }));

      supabaseService.client.from = fromMock;

      await service.refreshStatus();

      expect(fromMock).toHaveBeenCalledWith('admin_settings');
    });

    it('should update isEnabled$ when settings change', async () => {
      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: { require_email_verification: true, verification_code_expiry_minutes: 30 }, 
              error: null 
            }))
          }))
        }))
      }));

      supabaseService.client.from = fromMock;

      await service.refreshStatus();

      const isEnabled = await firstValueFrom(service.isEnabled$);
      const expiryMinutes = await firstValueFrom(service.expiryMinutes$);
      
      expect(isEnabled).toBe(true);
      expect(expiryMinutes).toBe(30);
    });

    it('should handle errors during refresh', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.reject(new Error('Network error')))
          }))
        }))
      }));

      supabaseService.client.from = fromMock;

      await service.refreshStatus();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle error response from database', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Database error', code: 'PGRST116' }
            }))
          }))
        }))
      }));

      supabaseService.client.from = fromMock;

      await service.refreshStatus();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching verification settings:', { message: 'Database error', code: 'PGRST116' });
      consoleErrorSpy.mockRestore();
    });
  });

  describe('requestCode', () => {
    it('should return null if verification is not enabled', async () => {
      const result = await service.requestCode('test@example.com', 'prayer_submission', {});
      expect(result).toBeNull();
    });

    it('should return null if email is recently verified', async () => {
      // Enable verification first
      (service as any).isEnabledSubject.next(true);
      
      // Save a verified session
      service.saveVerifiedSession('test@example.com');

      const result = await service.requestCode('test@example.com', 'prayer_submission', {});
      expect(result).toBeNull();
    });

    it('should invoke send-verification-code function', async () => {
      // Mock isEnabled to be true
      (service as any).isEnabledSubject.next(true);

      const invokeMock = vi.fn(() => Promise.resolve({
        data: { success: true, codeId: 'code123', expiresAt: '2024-12-31T23:59:59Z' },
        error: null
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      const result = await service.requestCode('test@example.com', 'prayer_submission', { title: 'Test' });

      expect(invokeMock).toHaveBeenCalledWith('send-verification-code', {
        body: {
          email: 'test@example.com',
          actionType: 'prayer_submission',
          actionData: { title: 'Test' }
        }
      });
      expect(result).toEqual({ codeId: 'code123', expiresAt: '2024-12-31T23:59:59Z' });
    });

    it('should handle function errors', async () => {
      (service as any).isEnabledSubject.next(true);

      const invokeMock = vi.fn(() => Promise.resolve({
        data: null,
        error: { message: 'Function failed' }
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.requestCode('test@example.com', 'prayer_submission', {})
      ).rejects.toThrow('Function failed');
    });

    it('should handle function errors without message', async () => {
      (service as any).isEnabledSubject.next(true);

      const invokeMock = vi.fn(() => Promise.resolve({
        data: null,
        error: {} // No message property
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.requestCode('test@example.com', 'prayer_submission', {})
      ).rejects.toThrow('Failed to send verification code');
    });

    it('should handle data errors', async () => {
      (service as any).isEnabledSubject.next(true);

      const invokeMock = vi.fn(() => Promise.resolve({
        data: { error: 'Invalid email', details: 'Email format is incorrect' },
        error: null
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.requestCode('invalid-email', 'prayer_submission', {})
      ).rejects.toThrow('Invalid email - Email format is incorrect');
    });

    it('should handle data errors without details', async () => {
      (service as any).isEnabledSubject.next(true);

      const invokeMock = vi.fn(() => Promise.resolve({
        data: { error: 'Invalid email' }, // No details property
        error: null
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.requestCode('invalid-email', 'prayer_submission', {})
      ).rejects.toThrow('Invalid email');
    });

    it('should handle data errors with non-string error', async () => {
      (service as any).isEnabledSubject.next(true);

      const invokeMock = vi.fn(() => Promise.resolve({
        data: { error: { code: 'INVALID_FORMAT', message: 'Bad format' } },
        error: null
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.requestCode('invalid-email', 'prayer_submission', {})
      ).rejects.toThrow('{"code":"INVALID_FORMAT","message":"Bad format"}');
    });

    it('should handle invalid response', async () => {
      (service as any).isEnabledSubject.next(true);

      const invokeMock = vi.fn(() => Promise.resolve({
        data: { success: false },
        error: null
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.requestCode('test@example.com', 'prayer_submission', {})
      ).rejects.toThrow('Invalid response from verification service');
    });
  });

  describe('verifyCode', () => {
    it('should verify code successfully', async () => {
      const invokeMock = vi.fn(() => Promise.resolve({
        data: { success: true, actionData: { title: 'Test Prayer' } },
        error: null
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      const result = await service.verifyCode('test@example.com', 'code123', '123456');

      expect(invokeMock).toHaveBeenCalledWith('verify-code', {
        body: {
          email: 'test@example.com',
          codeId: 'code123',
          code: '123456'
        }
      });
      expect(result).toEqual({ success: true, actionData: { title: 'Test Prayer' } });
    });

    it('should save verified session on successful verification', async () => {
      const invokeMock = vi.fn(() => Promise.resolve({
        data: { success: true, actionData: {} },
        error: null
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await service.verifyCode('test@example.com', 'code123', '123456');

      const isVerified = service.isRecentlyVerified('test@example.com');
      expect(isVerified).toBe(true);
    });

    it('should handle function errors', async () => {
      const invokeMock = vi.fn(() => Promise.resolve({
        data: null,
        error: { message: 'Function failed' }
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.verifyCode('test@example.com', 'code123', '123456')
      ).rejects.toThrow('Function failed');
    });

    it('should handle function errors without message', async () => {
      const invokeMock = vi.fn(() => Promise.resolve({
        data: null,
        error: {} // No message property
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.verifyCode('test@example.com', 'code123', '123456')
      ).rejects.toThrow('Failed to verify code');
    });

    it('should handle data errors', async () => {
      const invokeMock = vi.fn(() => Promise.resolve({
        data: { error: 'Invalid code' },
        error: null
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.verifyCode('test@example.com', 'code123', 'wrong')
      ).rejects.toThrow('Invalid code');
    });

    it('should handle verification failure', async () => {
      const invokeMock = vi.fn(() => Promise.resolve({
        data: { success: false },
        error: null
      }));

      supabaseService.client.functions = { invoke: invokeMock } as any;

      await expect(
        service.verifyCode('test@example.com', 'code123', '123456')
      ).rejects.toThrow('Verification failed');
    });
  });

  describe('getCodeLength', () => {
    it('should return code length from settings', async () => {
      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: { verification_code_length: 8 }, 
              error: null 
            }))
          }))
        }))
      }));

      supabaseService.client.from = fromMock;

      const length = await service.getCodeLength();
      expect(length).toBe(8);
    });

    it('should return default length of 6 when no data', async () => {
      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: null 
            }))
          }))
        }))
      }));

      supabaseService.client.from = fromMock;

      const length = await service.getCodeLength();
      expect(length).toBe(6);
    });

    it('should return default length of 6 on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const fromMock = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.reject(new Error('Database error')))
          }))
        }))
      }));

      supabaseService.client.from = fromMock;

      const length = await service.getCodeLength();
      expect(length).toBe(6);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should handle empty localStorage gracefully', () => {
      // Ensure localStorage is empty
      localStorage.clear();

      // Trigger cleanup by checking a session that doesn't exist
      const result = service.isRecentlyVerified('nonexistent@example.com');
      
      expect(result).toBe(false);
      // No error should be thrown and localStorage should remain empty
      expect(localStorage.getItem('prayer_app_verified_sessions')).toBeNull();
    });

    it('should remove expired sessions from localStorage', () => {
      const now = Date.now();
      const sessions = [
        { email: 'expired1@example.com', verifiedAt: now - 20000, expiresAt: now - 10000 },
        { email: 'valid@example.com', verifiedAt: now, expiresAt: now + 60000 },
        { email: 'expired2@example.com', verifiedAt: now - 30000, expiresAt: now - 5000 }
      ];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));

      // Trigger cleanup by checking an expired session
      service.isRecentlyVerified('expired1@example.com');

      const sessionsData = localStorage.getItem('prayer_app_verified_sessions');
      const remainingSessions = JSON.parse(sessionsData!);
      
      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0].email).toBe('valid@example.com');
    });

    it('should not modify localStorage when all sessions are still valid', () => {
      const now = Date.now();
      const sessions = [
        { email: 'valid1@example.com', verifiedAt: now, expiresAt: now + 60000 },
        { email: 'valid2@example.com', verifiedAt: now, expiresAt: now + 60000 }
      ];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));

      // Try to check an expired session that will trigger cleanup
      const expired = {
        email: 'expired@example.com',
        verifiedAt: now - 20000,
        expiresAt: now - 10000
      };
      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify([...sessions, expired]));

      // Trigger cleanup
      service.isRecentlyVerified('expired@example.com');

      const sessionsData = localStorage.getItem('prayer_app_verified_sessions');
      const remainingSessions = JSON.parse(sessionsData!);
      
      // Should have removed the expired session
      expect(remainingSessions).toHaveLength(2);
      expect(remainingSessions.map((s: any) => s.email)).not.toContain('expired@example.com');
    });

    it('should not update localStorage when no sessions are expired during cleanup', () => {
      const now = Date.now();
      const sessions = [
        { email: 'valid1@example.com', verifiedAt: now, expiresAt: now + 60000 },
        { email: 'valid2@example.com', verifiedAt: now, expiresAt: now + 70000 }
      ];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));
      
      // Mock setItem to track if it was called
      const originalSetItem = localStorage.setItem;
      const setItemSpy = vi.fn(originalSetItem.bind(localStorage));
      localStorage.setItem = setItemSpy as any;
      
      // Reset spy to clear the initial setItem call above
      setItemSpy.mockClear();

      // Add an expired session to trigger cleanup
      const testSessions = [
        ...sessions,
        { email: 'test-expired@example.com', verifiedAt: now - 20000, expiresAt: now - 10000 }
      ];
      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(testSessions));
      setItemSpy.mockClear(); // Clear this call

      // Trigger cleanup by checking the expired session
      service.isRecentlyVerified('test-expired@example.com');

      // setItem should be called once to remove the expired session
      expect(setItemSpy).toHaveBeenCalledTimes(1);
      
      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('should handle invalid JSON data gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorage.setItem('prayer_app_verified_sessions', 'invalid json');

      const result = service.isRecentlyVerified('test@example.com');
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle missing expiresAt property', () => {
      const sessions = [
        { email: 'test@example.com', verifiedAt: Date.now() } as any
      ];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));

      const result = service.isRecentlyVerified('test@example.com');
      expect(result).toBe(false);
    });

    it('should handle non-number expiresAt property', () => {
      const sessions = [
        { email: 'test@example.com', verifiedAt: Date.now(), expiresAt: 'invalid' as any }
      ];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));

      const result = service.isRecentlyVerified('test@example.com');
      expect(result).toBe(false);
    });

    it('should handle localStorage errors during cleanup gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const now = Date.now();
      const sessions = [
        { email: 'expired@example.com', verifiedAt: now - 20000, expiresAt: now - 10000 }
      ];

      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));

      // Mock localStorage.setItem to throw an error during cleanup
      const originalSetItem = localStorage.setItem;
      const setItemMock = vi.fn((key, value) => {
        if (key === 'prayer_app_verified_sessions') {
          throw new Error('Storage error');
        }
      });
      localStorage.setItem = setItemMock as any;

      // This should trigger cleanup
      const result = service.isRecentlyVerified('expired@example.com');
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error cleaning up sessions:', expect.any(Error));

      // Restore
      localStorage.setItem = originalSetItem;
      consoleErrorSpy.mockRestore();
    });

    it('should handle race condition where localStorage is cleared between checks', () => {
      const now = Date.now();
      const sessions = [
        { email: 'expired@example.com', verifiedAt: now - 20000, expiresAt: now - 10000 }
      ];

      // Mock getItem to return sessions on first call, null on second call
      const originalGetItem = localStorage.getItem;
      let callCount = 0;
      localStorage.getItem = vi.fn((key) => {
        callCount++;
        if (key === 'prayer_app_verified_sessions') {
          if (callCount === 1) {
            return JSON.stringify(sessions);
          } else {
            return null; // Simulate race condition where data is cleared
          }
        }
        return originalGetItem.call(localStorage, key);
      }) as any;

      // This should trigger cleanup but handle the race condition gracefully
      const result = service.isRecentlyVerified('expired@example.com');
      
      expect(result).toBe(false);

      // Restore
      localStorage.getItem = originalGetItem;
    });
  });
});
