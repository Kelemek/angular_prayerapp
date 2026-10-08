/**
 * Native hydrate + live redirect before Angular bootstrap.
 * Never throws — failures fall through to bundled app boot.
 */
export async function runPreBootstrapGate(options: {
  isNative: boolean;
  hydrateNativeAuth: () => Promise<void>;
  maybeRedirectToLiveSite: () => Promise<boolean>;
}): Promise<boolean> {
  try {
    if (options.isNative) {
      await options.hydrateNativeAuth();
    }
    return await options.maybeRedirectToLiveSite();
  } catch (error) {
    console.error(
      '[AppInitialization] Pre-bootstrap gate failed; loading bundled app:',
      error
    );
    return false;
  }
}
