import { describe, it, expect, vi } from 'vitest';
import { completeMfaVerifySupabaseLink } from './admin-auth-mfa-verify';

describe('completeMfaVerifySupabaseLink', () => {
  it('returns user when session email matches after hashed token path', async () => {
    const user = { id: '1', email: 'a@b.com' };
    const client = {
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user } },
        }),
      },
      rpc: vi.fn().mockResolvedValue({ error: null }),
    };

    const result = await completeMfaVerifySupabaseLink(
      client as never,
      'a@b.com',
      { hashed_token: 'tok' }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe('a@b.com');
    }
  });

  it('fails when no session after link', async () => {
    const client = {
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
      rpc: vi.fn().mockResolvedValue({ error: null }),
    };

    const result = await completeMfaVerifySupabaseLink(
      client as never,
      'a@b.com',
      { hashed_token: 'tok' }
    );

    expect(result.ok).toBe(false);
  });
});
