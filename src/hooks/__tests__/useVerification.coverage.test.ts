import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVerification } from '../useVerification';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Helper to create a supabase.from chain for admin_settings maybeSingle
const createAdminSettingsMock = (requireVerification: boolean | null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue(
    requireVerification === null ? { data: null } : { data: { require_email_verification: requireVerification } }
  )
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

import { supabase } from '../../lib/supabase';

describe('useVerification - additional coverage tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Error handling scenarios', () => {
    it('handles edge function error with data present', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function returning both error and data
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { error: 'Rate limit exceeded', details: 'Too many requests' },
        error: { message: 'Service unavailable' }
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.requestCode('user@example.com', 'test', {}))
          .rejects.toThrow();
      });
    });

    it('handles data.error as string', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function returning data with error field as string
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { error: 'Invalid email format' },
        error: null
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.requestCode('user@example.com', 'test', {}))
          .rejects.toThrow('Invalid email format');
      });
    });

    it('handles data.error as object', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function returning data with error field as object
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { error: { code: 'INVALID_EMAIL', message: 'Bad email' } },
        error: null
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.requestCode('user@example.com', 'test', {}))
          .rejects.toThrow();
      });
    });

    it('handles data.error with details field', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function returning data with both error and details
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { error: 'Validation failed', details: 'Email domain not allowed' },
        error: null
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.requestCode('user@example.com', 'test', {}))
          .rejects.toThrow('Validation failed - Email domain not allowed');
      });
    });

    it('handles invalid response without required fields', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function returning incomplete data (missing codeId)
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, expiresAt: '2030-01-01T00:00:00Z' },
        error: null
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.requestCode('user@example.com', 'test', {}))
          .rejects.toThrow('Invalid response from verification service');
      });
    });

    it('handles verifyCode with data.error', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock verify-code call with data.error
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { error: 'Code expired' },
        error: null
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.verifyCode('code-123', '123456'))
          .rejects.toThrow('Code expired');
      });
    });

    it('handles verifyCode with missing required fields', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock verify-code call without actionType
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, actionData: { foo: 'bar' } },
        error: null
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.verifyCode('code-123', '123456'))
          .rejects.toThrow('Invalid verification response');
      });
    });

    it('handles verifyCode without email field in response', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock verify-code call without email (optional field)
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { 
          success: true, 
          actionType: 'prayer_submission',
          actionData: { foo: 'bar' }
          // no email field
        },
        error: null
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      let verified: any;
      await act(async () => {
        verified = await result.current.verifyCode('code-123', '123456');
      });
      
      expect(verified.actionType).toBe('prayer_submission');
      expect(verified.email).toBeUndefined();
    });

    it('handles non-Error thrown in requestCode', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function throwing non-Error object
      vi.mocked(supabase.functions.invoke).mockRejectedValue('String error');

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.requestCode('user@example.com', 'test', {}))
          .rejects.toThrow();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to send verification code');
      });
    });

    it('handles non-Error thrown in verifyCode', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function throwing non-Error object
      vi.mocked(supabase.functions.invoke).mockRejectedValue({ code: 'NETWORK_ERROR' });

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      await act(async () => {
        await expect(result.current.verifyCode('code-123', '123456'))
          .rejects.toThrow();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to verify code');
      });
    });
  });

  describe('State management', () => {
    it('clearError resets error state', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function error
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: 'Test error' }
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      // Trigger an error
      await act(async () => {
        await expect(result.current.requestCode('user@example.com', 'test', {}))
          .rejects.toThrow();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Clear error
      act(() => {
        result.current.clearError();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });

    it('reset clears verification state and error', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock successful code request
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, codeId: 'code-123', expiresAt: '2030-01-01T00:00:00Z' },
        error: null
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      // Request a code to populate verificationState
      await act(async () => {
        await result.current.requestCode('user@example.com', 'test', {});
      });

      await waitFor(() => {
        expect(result.current.verificationState.codeId).toBe('code-123');
      });

      // Reset the state
      act(() => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.verificationState.codeId).toBeNull();
        expect(result.current.verificationState.expiresAt).toBeNull();
        expect(result.current.verificationState.email).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });

    it('verificationState is cleared after successful verification', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // First mock requestCode
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: true, codeId: 'code-123', expiresAt: '2030-01-01T00:00:00Z' },
        error: null
      } as any);

      // Then mock verifyCode
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { 
          success: true, 
          actionType: 'test_action',
          actionData: { test: true },
          email: 'user@example.com'
        },
        error: null
      } as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      // Request code
      await act(async () => {
        await result.current.requestCode('user@example.com', 'test', {});
      });

      await waitFor(() => {
        expect(result.current.verificationState.codeId).toBe('code-123');
      });

      // Verify code
      await act(async () => {
        await result.current.verifyCode('code-123', '123456');
      });

      // Verification state should be cleared
      await waitFor(() => {
        expect(result.current.verificationState.codeId).toBeNull();
        expect(result.current.verificationState.expiresAt).toBeNull();
        expect(result.current.verificationState.email).toBeNull();
      });
    });
  });

  describe('Session management with localStorage', () => {
    it('skips verification for recently verified email', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Pre-populate localStorage with a valid session
      const sessions = [{
        email: 'recent@example.com',
        verifiedAt: Date.now() - (5 * 60 * 1000), // 5 minutes ago
        expiresAt: Date.now() + (10 * 60 * 1000)  // Expires in 10 minutes
      }];
      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      // Request code should return null for recently verified email
      let response: any;
      await act(async () => {
        response = await result.current.requestCode('recent@example.com', 'test', {});
      });

      expect(response).toBeNull();
      // invoke should not have been called
      expect(vi.mocked(supabase.functions.invoke)).not.toHaveBeenCalled();
    });

    it('triggers cleanup for expired session', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function for new code request
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, codeId: 'new-code', expiresAt: '2030-01-01T00:00:00Z' },
        error: null
      } as any);

      // Pre-populate localStorage with an expired session
      const sessions = [{
        email: 'expired@example.com',
        verifiedAt: Date.now() - (30 * 60 * 1000), // 30 minutes ago
        expiresAt: Date.now() - (5 * 60 * 1000)    // Expired 5 minutes ago
      }];
      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      // Request code for expired email should send new code
      let response: any;
      await act(async () => {
        response = await result.current.requestCode('expired@example.com', 'test', {});
      });

      expect(response).not.toBeNull();
      expect(response.codeId).toBe('new-code');
      
      // The expired session should have been cleaned up
      const storedSessions = JSON.parse(localStorage.getItem('prayer_app_verified_sessions') || '[]');
      expect(storedSessions.length).toBe(0);
    });

    it('handles localStorage errors gracefully in isRecentlyVerified', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, codeId: 'code-123', expiresAt: '2030-01-01T00:00:00Z' },
        error: null
      } as any);

      // Put invalid JSON in localStorage
      localStorage.setItem('prayer_app_verified_sessions', 'invalid{json}');

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      // Should handle corrupted localStorage gracefully and request new code
      let response: any;
      await act(async () => {
        response = await result.current.requestCode('user@example.com', 'test', {});
      });

      expect(response).not.toBeNull();
      expect(response.codeId).toBe('code-123');
    });

    it('handles session with invalid expiresAt field', async () => {
      const mockChain = createAdminSettingsMock(true);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      // Mock edge function
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, codeId: 'code-456', expiresAt: '2030-01-01T00:00:00Z' },
        error: null
      } as any);

      // Pre-populate localStorage with session that has invalid expiresAt
      const sessions: any = [{
        email: 'user@example.com',
        verifiedAt: Date.now(),
        expiresAt: null  // Invalid
      }];
      localStorage.setItem('prayer_app_verified_sessions', JSON.stringify(sessions));

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(true);
      });

      // Should treat invalid session as not verified and request new code
      let response: any;
      await act(async () => {
        response = await result.current.requestCode('user@example.com', 'test', {});
      });

      expect(response).not.toBeNull();
      expect(response.codeId).toBe('code-456');
    });
  });

  describe('Admin settings check', () => {
    it('handles error when checking admin settings', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Database error'))
      };
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useVerification());

      // Should default to disabled on error
      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking verification setting:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles null data from admin settings', async () => {
      const mockChain = createAdminSettingsMock(null);
      vi.mocked(supabase.from).mockReturnValue(mockChain as any);

      const { result } = renderHook(() => useVerification());

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false);
      });
    });
  });
});
