import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeMfaVerifySupabaseLink } from './admin-auth-mfa-verify';
import * as authSessionLink from './auth-session-link';

vi.mock('./auth-session-link', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./auth-session-link')>();
  return {
    ...actual,
    linkAuthSessionAfterVerify: vi.fn(),
    resumeMfaSubscriberAuthLink: vi.fn(),
    stampSubscriberAuthLink: vi.fn(),
  };
});

describe('completeMfaVerifySupabaseLink', () => {
  const user = { id: '1', email: 'a@b.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when session email matches after hashed token path', async () => {
    vi.mocked(authSessionLink.linkAuthSessionAfterVerify).mockResolvedValue({
      ok: true,
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user } },
        }),
      },
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

  it('stamps subscriber when link returns ok:false but session exists', async () => {
    vi.mocked(authSessionLink.linkAuthSessionAfterVerify).mockResolvedValue({
      ok: false,
      error: 'already linked',
    });
    vi.mocked(authSessionLink.stampSubscriberAuthLink).mockResolvedValue({
      ok: true,
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user } },
        }),
      },
    };

    const result = await completeMfaVerifySupabaseLink(
      client as never,
      'a@b.com',
      { hashed_token: 'tok' }
    );

    expect(result.ok).toBe(true);
    expect(authSessionLink.stampSubscriberAuthLink).toHaveBeenCalled();
  });

  it('fails when no session after hashed token link', async () => {
    vi.mocked(authSessionLink.linkAuthSessionAfterVerify).mockResolvedValue({
      ok: true,
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
    };

    const result = await completeMfaVerifySupabaseLink(
      client as never,
      'a@b.com',
      { hashed_token: 'tok' }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('secure session');
    }
  });

  it('surfaces link error when hashed token path has no session', async () => {
    vi.mocked(authSessionLink.linkAuthSessionAfterVerify).mockResolvedValue({
      ok: false,
      error: 'link blew up',
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
    };

    const result = await completeMfaVerifySupabaseLink(
      client as never,
      'a@b.com',
      { hashed_token: 'tok' }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('link blew up');
    }
  });

  it('warns when stamp fails after link ok:false', async () => {
    vi.mocked(authSessionLink.linkAuthSessionAfterVerify).mockResolvedValue({
      ok: false,
      error: 'already linked',
    });
    vi.mocked(authSessionLink.stampSubscriberAuthLink).mockResolvedValue({
      ok: false,
      error: 'stamp failed',
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user } },
        }),
      },
    };

    const result = await completeMfaVerifySupabaseLink(
      client as never,
      'a@b.com',
      { hashed_token: 'tok' }
    );

    expect(result.ok).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('treats whitespace hashed_token as absent and resumes', async () => {
    vi.mocked(authSessionLink.resumeMfaSubscriberAuthLink).mockResolvedValue({
      ok: true,
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user } },
        }),
      },
    };

    await completeMfaVerifySupabaseLink(client as never, 'a@b.com', {
      hashed_token: '   ',
    });

    expect(authSessionLink.resumeMfaSubscriberAuthLink).toHaveBeenCalled();
    expect(authSessionLink.linkAuthSessionAfterVerify).not.toHaveBeenCalled();
  });

  it('uses resume path when hashed_token is absent', async () => {
    vi.mocked(authSessionLink.resumeMfaSubscriberAuthLink).mockResolvedValue({
      ok: true,
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user } },
        }),
      },
    };

    const result = await completeMfaVerifySupabaseLink(
      client as never,
      'a@b.com',
      {}
    );

    expect(authSessionLink.resumeMfaSubscriberAuthLink).toHaveBeenCalledWith(
      client,
      'a@b.com'
    );
    expect(result.ok).toBe(true);
  });

  it('surfaces resume error when session never appears', async () => {
    vi.mocked(authSessionLink.resumeMfaSubscriberAuthLink).mockResolvedValue({
      ok: false,
      error: 'resume failed',
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      },
    };

    const result = await completeMfaVerifySupabaseLink(
      client as never,
      'a@b.com',
      {}
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('resume failed');
    }
  });

  it('warns when getSession throws after link', async () => {
    vi.mocked(authSessionLink.resumeMfaSubscriberAuthLink).mockResolvedValue({
      ok: true,
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = {
      auth: {
        getSession: vi.fn().mockRejectedValue(new Error('network')),
      },
    };

    const result = await completeMfaVerifySupabaseLink(
      client as never,
      'a@b.com',
      {}
    );

    expect(result.ok).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
