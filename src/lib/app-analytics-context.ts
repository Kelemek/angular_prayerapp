import { Capacitor } from '@capacitor/core';

/**
 * Marketing version of the running JS bundle.
 * Keep in sync with iOS `MARKETING_VERSION` and Android `versionName` when shipping a store release.
 */
export const APP_BUNDLE_VERSION = '2.21';

export interface AppAnalyticsContext {
  app_version: string;
  app_platform: string;
  app_environment: 'production' | 'development';
  [key: string]: string;
}

export function getAppAnalyticsContext(
  production: boolean
): AppAnalyticsContext {
  return {
    app_version: APP_BUNDLE_VERSION,
    app_platform: Capacitor.getPlatform(),
    app_environment: production ? 'production' : 'development',
  };
}
