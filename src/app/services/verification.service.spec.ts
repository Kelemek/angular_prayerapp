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
});
