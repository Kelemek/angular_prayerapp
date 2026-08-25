import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Capacitor } from '@capacitor/core';
import {
  APP_BUNDLE_VERSION,
  getAppAnalyticsContext,
} from './app-analytics-context';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'web'),
  },
}));

describe('getAppAnalyticsContext', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
  });

  it('returns the bundle version, platform, and development environment', () => {
    expect(getAppAnalyticsContext(false)).toEqual({
      app_version: APP_BUNDLE_VERSION,
      app_platform: 'web',
      app_environment: 'development',
    });
  });

  it('returns production environment when production is true', () => {
    expect(getAppAnalyticsContext(true).app_environment).toBe('production');
  });

  it('uses the Capacitor platform so native builds are distinguishable', () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');

    expect(getAppAnalyticsContext(true)).toEqual({
      app_version: APP_BUNDLE_VERSION,
      app_platform: 'ios',
      app_environment: 'production',
    });
  });
});
