import { describe, it, expect, vi } from 'vitest';
import { runPreBootstrapGate, runPreBootstrapHydrate } from './app-boot-gate';

describe('runPreBootstrapHydrate', () => {
  it('does not throw when native hydrate rejects', async () => {
    await expect(
      runPreBootstrapHydrate({
        isNative: true,
        hydrateNativeAuth: vi.fn().mockRejectedValue(new Error('preferences failed')),
      })
    ).resolves.toBeUndefined();
  });

  it('skips hydrate on web', async () => {
    const hydrate = vi.fn();
    await runPreBootstrapHydrate({ isNative: false, hydrateNativeAuth: hydrate });
    expect(hydrate).not.toHaveBeenCalled();
  });
});

describe('runPreBootstrapGate (legacy)', () => {
  it('returns false when native hydrate rejects so bootstrap can continue', async () => {
    const maybeRedirectToLiveSite = vi.fn().mockResolvedValue(false);
    const redirected = await runPreBootstrapGate({
      isNative: true,
      hydrateNativeAuth: vi.fn().mockRejectedValue(new Error('preferences failed')),
      maybeRedirectToLiveSite,
    });
    expect(redirected).toBe(false);
    expect(maybeRedirectToLiveSite).toHaveBeenCalled();
  });

  it('returns true when redirect succeeds', async () => {
    const redirected = await runPreBootstrapGate({
      isNative: false,
      hydrateNativeAuth: vi.fn(),
      maybeRedirectToLiveSite: vi.fn().mockResolvedValue(true),
    });
    expect(redirected).toBe(true);
  });
});
