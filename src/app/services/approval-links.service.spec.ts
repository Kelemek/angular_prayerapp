import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApprovalLinksService } from './approval-links.service';

describe('ApprovalLinksService', () => {
  let service: ApprovalLinksService;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    service = new ApprovalLinksService();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateCode', () => {
    it('should generate account_approve code with base64 email', () => {
      const email = 'test@example.com';
      const code = service.generateCode('account_approve', email);
      
      expect(code).toContain('account_approve_');
      expect(code.length).toBeGreaterThan('account_approve_'.length);
    });

    it('should generate account_deny code with base64 email', () => {
      const email = 'test@example.com';
      const code = service.generateCode('account_deny', email);
      
      expect(code).toContain('account_deny_');
      expect(code.length).toBeGreaterThan('account_deny_'.length);
    });

    it('should lowercase email before encoding', () => {
      const code1 = service.generateCode('account_approve', 'Test@Example.COM');
      const code2 = service.generateCode('account_approve', 'test@example.com');
      
      expect(code1).toBe(code2);
    });

    it('should generate unique codes for different emails', () => {
      const code1 = service.generateCode('account_approve', 'test1@example.com');
      const code2 = service.generateCode('account_approve', 'test2@example.com');
      
      expect(code1).not.toBe(code2);
    });

    it('should handle special characters in email', () => {
      const email = 'test+tag@sub.example.com';
      const code = service.generateCode('account_approve', email);
      const decodedEmail = atob(code.replace('account_approve_', ''));
      
      expect(decodedEmail).toBe(email.toLowerCase());
    });
  });

  describe('decodeAccountCode', () => {
    it('should decode account_approve code', () => {
      const email = 'admin@example.com';
      const code = service.generateCode('account_approve', email);
      
      const result = service.decodeAccountCode(code);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe('approve');
      expect(result?.email).toBe(email);
    });

    it('should decode account_deny code', () => {
      const email = 'admin@example.com';
      const code = service.generateCode('account_deny', email);
      
      const result = service.decodeAccountCode(code);
      
      expect(result).toBeTruthy();
      expect(result?.type).toBe('deny');
      expect(result?.email).toBe(email);
    });

    it('should return null for invalid code format', () => {
      const result = service.decodeAccountCode('invalid_code_format');
      
      expect(result).toBeNull();
    });

    it('should return null for empty code', () => {
      const result = service.decodeAccountCode('');
      
      expect(result).toBeNull();
    });

    it('should return null for malformed base64', () => {
      const result = service.decodeAccountCode('account_approve_invalid!!!base64');
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle special characters in decoded email', () => {
      const email = 'test+tag@sub.example.com';
      const code = service.generateCode('account_approve', email);
      
      const result = service.decodeAccountCode(code);
      
      expect(result?.email).toBe(email);
    });

    it('should be case-insensitive for email', () => {
      const code = service.generateCode('account_approve', 'Test@Example.COM');
      const result = service.decodeAccountCode(code);
      
      expect(result?.email).toBe('test@example.com');
    });

    it('should handle multiple underscores in email', () => {
      const email = 'test_user_name@example.com';
      const code = service.generateCode('account_approve', email);
      
      const result = service.decodeAccountCode(code);
      
      expect(result?.email).toBe(email);
    });
  });

  describe('roundtrip encoding/decoding', () => {
    it('should encode and decode approve code correctly', () => {
      const email = 'user@test.com';
      const code = service.generateCode('account_approve', email);
      const decoded = service.decodeAccountCode(code);
      
      expect(decoded?.type).toBe('approve');
      expect(decoded?.email).toBe(email);
    });

    it('should encode and decode deny code correctly', () => {
      const email = 'user@test.com';
      const code = service.generateCode('account_deny', email);
      const decoded = service.decodeAccountCode(code);
      
      expect(decoded?.type).toBe('deny');
      expect(decoded?.email).toBe(email);
    });

    it('should handle complex emails in roundtrip', () => {
      const complexEmails = [
        'simple@test.com',
        'test+tag@test.com',
        'test_underscore@test.co.uk',
        'test.dot@test.com',
        'test-dash@test.com',
        'uppercase@TEST.COM'
      ];

      complexEmails.forEach(email => {
        const approveCode = service.generateCode('account_approve', email);
        const approveResult = service.decodeAccountCode(approveCode);
        
        expect(approveResult?.email).toBe(email.toLowerCase());
        expect(approveResult?.type).toBe('approve');

        const denyCode = service.generateCode('account_deny', email);
        const denyResult = service.decodeAccountCode(denyCode);
        
        expect(denyResult?.email).toBe(email.toLowerCase());
        expect(denyResult?.type).toBe('deny');
      });
    });
  });
});
