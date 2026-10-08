import { APP_BUNDLE_VERSION } from './app-analytics-context';

/** Git short SHA (or `local`) baked in at build/serve time — see `scripts/write-web-build-info.mjs`. */
export const WEB_BUILD_REVISION = '0a9594b';

export function formatWebBuildLabel(
  bundleVersion: string,
  revision: string
): string {
  return `${bundleVersion}.${revision}`;
}

export function getWebBuildLabel(): string {
  return formatWebBuildLabel(APP_BUNDLE_VERSION, WEB_BUILD_REVISION);
}
