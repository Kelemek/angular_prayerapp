import { describe, it, expect, vi } from 'vitest';
import {
  finishSubscriberLinkRestore,
  runDedupedSubscriberAuthLinkOnLoad,
} from './admin-auth-subscriber-restore';

describe('runDedupedSubscriberAuthLinkOnLoad', () => {
  it('dedupes concurrent links for the same email', async () => {
    const inFlight = new Map<string, Promise<boolean>>();
    let resolveStamp!: () => void;
    const stampPromise = new Promise<{ ok: true }>((resolve) => {
      resolveStamp = () => resolve({ ok: true });
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { email: 'user@example.com' } } },
        }),
      },
      rpc: vi.fn(() => stampPromise),
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
});
