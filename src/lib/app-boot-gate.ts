/**
 * Native auth hydrate before Angular bootstrap.
 * Never throws — failures fall through to bundled app boot.
 *
 * Live-site redirect runs after bootstrap (see main.ts) so we never leave
 * capacitor://localhost without a running app when navigation is blocked.
 */
export async function runPreBootstrapHydrate(options: {
  isNative: boolean;
  hydrateNativeAuth: () => Promise<void>;
}): Promise<void> {
  try {
    if (options.isNative) {
      await options.hydrateNativeAuth();
    }
  } catch (error) {
    console.error(
      '[AppInitialization] Pre-bootstrap hydrate failed; loading bundled app:',
      error
    );
  }
}

/** @deprecated Use runPreBootstrapHydrate; redirect is no longer gated before bootstrap. */
export async function runPreBootstrapGate(options: {
  isNative: boolean;
  hydrateNativeAuth: () => Promise<void>;
  maybeRedirectToLiveSite: () => Promise<boolean>;
}): Promise<boolean> {
  await runPreBootstrapHydrate({
    isNative: options.isNative,
    hydrateNativeAuth: options.hydrateNativeAuth,
  });
  return await options.maybeRedirectToLiveSite();
}
