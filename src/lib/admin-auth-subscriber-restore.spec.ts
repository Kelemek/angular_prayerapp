import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  finishSubscriberLinkRestore,
  runDedupedSubscriberAuthLinkOnLoad,
} from './admin-auth-subscriber-restore';
import * as authSessionLink from './auth-session-link';

vi.mock('./auth-session-link', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./auth-session-link')>();
  return {
    ...actual,
    stampSubscriberAuthLink: vi.fn(),
    resumeMfaSubscriberAuthLink: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runDedupedSubscriberAuthLinkOnLoad', () => {
  it('dedupes concurrent links for the same email', async () => {
    const inFlight = new Map<string, Promise<boolean>>();
    let resolveStamp!: () => void;
    const stampPromise = new Promise<{ ok: true }>((resolve) => {
      resolveStamp = () => resolve({ ok: true });
    });
    vi.mocked(authSessionLink.stampSubscriberAuthLink).mockReturnValue(stampPromise);
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { email: 'user@example.com' } } },
        }),
      },
    };

    const first = runDedupedSubscriberAuthLinkOnLoad(
      'user@example.com',
      inFlight,
      client as never
    );
    const second = runDedupedSubscriberAuthLinkOnLoad(
      'user@example.com',
      inFlight,
      client as never
    );

    expect(client.auth.getSession).toHaveBeenCalledTimes(1);
    resolveStamp();
    expect(await first).toBe(true);
    expect(await second).toBe(true);
  });

  it('returns false for blank email', async () => {
    const result = await runDedupedSubscriberAuthLinkOnLoad(
      '   ',
      new Map(),
      { auth: { getSession: vi.fn() } } as never
    );
    expect(result).toBe(false);
  });

  it('returns false when stamp fails', async () => {
    vi.mocked(authSessionLink.stampSubscriberAuthLink).mockResolvedValue({
      ok: false,
      error: 'rpc error',
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { email: 'a@b.com' } } },
        }),
      },
    };
    const result = await runDedupedSubscriberAuthLinkOnLoad(
      'a@b.com',
      new Map(),
      client as never
    );
    expect(result).toBe(false);
  });

  it('uses resume when session email does not match', async () => {
    vi.mocked(authSessionLink.resumeMfaSubscriberAuthLink).mockResolvedValue({
      ok: true,
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { email: 'other@b.com' } } },
        }),
      },
    };
    const result = await runDedupedSubscriberAuthLinkOnLoad(
      'a@b.com',
      new Map(),
      client as never
    );
    expect(authSessionLink.resumeMfaSubscriberAuthLink).toHaveBeenCalledWith(
      client,
      'a@b.com'
    );
    expect(result).toBe(true);
  });
});

describe('finishSubscriberLinkRestore', () => {
  it('logs out when link succeeded but no JWT is available', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const complete = vi.fn();

    await finishSubscriberLinkRestore(null, 'user@example.com', 1, true, {
      getSessionEpoch: () => 1,
      logoutBlocksSessionRestore: () => false,
      signOutBounded: vi.fn(),
      getSession: vi.fn().mockResolvedValue(null),
      logout,
      completeRestoredAuthSession: complete,
    });

    expect(logout).toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it('completes restore when session user is present', async () => {
    const user = { id: '1', email: 'user@example.com' };
    const complete = vi.fn().mockResolvedValue(undefined);

    await finishSubscriberLinkRestore(
      { user } as never,
      'user@example.com',
      1,
      false,
      {
        getSessionEpoch: () => 1,
        logoutBlocksSessionRestore: () => false,
        signOutBounded: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ user }),
        logout: vi.fn(),
        completeRestoredAuthSession: complete,
      }
    );

    expect(complete).toHaveBeenCalledWith(user);
  });

  it('signs out when epoch changed and logout blocks restore', async () => {
    const signOutBounded = vi.fn().mockResolvedValue(undefined);
    await finishSubscriberLinkRestore(null, 'user@example.com', 1, false, {
      getSessionEpoch: () => 2,
      logoutBlocksSessionRestore: () => true,
      signOutBounded,
      getSession: vi.fn(),
      logout: vi.fn(),
      completeRestoredAuthSession: vi.fn(),
    });
    expect(signOutBounded).toHaveBeenCalled();
  });

  it('logs out when MFA email does not match Supabase user', async () => {
    const user = { id: '1', email: 'other@example.com' };
    const logout = vi.fn().mockResolvedValue(undefined);
    await finishSubscriberLinkRestore(
      { user } as never,
      'user@example.com',
      1,
      false,
      {
        getSessionEpoch: () => 1,
        logoutBlocksSessionRestore: () => false,
        signOutBounded: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ user }),
        logout,
        completeRestoredAuthSession: vi.fn(),
      }
    );
    expect(logout).toHaveBeenCalled();
  });

  it('retries getSession when link succeeded and initial session empty', async () => {
    const user = { id: '1', email: 'user@example.com' };
    const getSession = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ user });
    const complete = vi.fn().mockResolvedValue(undefined);

    await finishSubscriberLinkRestore(null, 'user@example.com', 1, true, {
      getSessionEpoch: () => 1,
      logoutBlocksSessionRestore: () => false,
      signOutBounded: vi.fn(),
      getSession,
      logout: vi.fn(),
      completeRestoredAuthSession: complete,
    });

    expect(getSession).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenCalledWith(user);
  });
});
