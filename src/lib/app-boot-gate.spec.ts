import { describe, it, expect, vi } from 'vitest';
import { runPreBootstrapGate } from './app-boot-gate';

describe('runPreBootstrapGate', () => {
  it('returns false when native hydrate rejects so bootstrap can continue', async () => {
    const redirected = await runPreBootstrapGate({
      isNative: true,
      hydrateNativeAuth: vi.fn().mockRejectedValue(new Error('preferences failed')),
      maybeRedirectToLiveSite: vi.fn(),
    });
    expect(redirected).toBe(false);
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
