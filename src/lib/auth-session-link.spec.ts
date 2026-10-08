import { describe, it, expect, vi } from 'vitest';
import {
  VERIFY_CODE_LINK_AUTH_SESSION,
  linkAuthSessionAfterVerify,
  resumeMfaSubscriberAuthLink,
  stampSubscriberAuthLink,
} from './auth-session-link';

describe('auth-session-link', () => {
  it('exports the verify-code body flag', () => {
    expect(VERIFY_CODE_LINK_AUTH_SESSION).toBe('linkAuthSession');
  });

  it('verifyOtp then stamps subscriber via RPC', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      auth: { verifyOtp },
      rpc,
    };

    const result = await linkAuthSessionAfterVerify(
      client as never,
      'hash-token-abc'
    );

    expect(result).toEqual({ ok: true });
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash-token-abc',
      type: 'email',
    });
    expect(rpc).toHaveBeenCalledWith('link_email_subscriber_auth');
  });

  it('stampSubscriberAuthLink calls RPC only', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const result = await stampSubscriberAuthLink({ rpc } as never);
    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('link_email_subscriber_auth');
  });

  it('resumeMfaSubscriberAuthLink uses existing JWT with stamp only', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { email: 'User@Example.com' } } },
        }),
      },
      functions: { invoke: vi.fn() },
      rpc,
    };
    const result = await resumeMfaSubscriberAuthLink(
      client as never,
      'user@example.com'
    );
    expect(result).toEqual({ ok: true });
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it('resumeMfaSubscriberAuthLink skips edge call without resume proof', async () => {
    localStorage.removeItem('mfa_auth_resume_token');
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
      functions: { invoke: vi.fn() },
    };
    const result = await resumeMfaSubscriberAuthLink(
      client as never,
      'user@example.com'
    );
    expect(result).toEqual({ ok: false, error: 'missing resume proof' });
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it('resumeMfaSubscriberAuthLink mints session when no JWT', async () => {
    localStorage.setItem('mfa_auth_resume_token', 'signed.resume.proof');
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        verifyOtp,
      },
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: { hashed_token: 'resume-hash' },
          error: null,
        }),
      },
      rpc,
    };
    const result = await resumeMfaSubscriberAuthLink(
      client as never,
      'user@example.com'
    );
    expect(result).toEqual({ ok: true });
    expect(client.functions.invoke).toHaveBeenCalledWith('resume-auth-link', {
      body: {
        email: 'user@example.com',
        auth_resume_token: 'signed.resume.proof',
      },
    });
  });

  it('returns error when verifyOtp fails without calling RPC', async () => {
    const verifyOtp = vi
      .fn()
      .mockResolvedValue({ error: { message: 'invalid token' } });
    const rpc = vi.fn();
    const client = { auth: { verifyOtp }, rpc };

    const result = await linkAuthSessionAfterVerify(client as never, 'bad');

    expect(result).toEqual({ ok: false, error: 'invalid token' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
