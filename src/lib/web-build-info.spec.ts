import { describe, expect, it } from 'vitest';
import { APP_BUNDLE_VERSION } from './app-analytics-context';
import {
  formatWebBuildLabel,
  getWebBuildLabel,
  WEB_BUILD_REVISION,
} from './web-build-info';

describe('formatWebBuildLabel', () => {
  it('joins marketing version and revision with a dot', () => {
    expect(formatWebBuildLabel('3.0', '847998b')).toBe('3.0.847998b');
  });
});

describe('getWebBuildLabel', () => {
  it('uses APP_BUNDLE_VERSION and WEB_BUILD_REVISION', () => {
    expect(getWebBuildLabel()).toBe(
      `${APP_BUNDLE_VERSION}.${WEB_BUILD_REVISION}`
    );
  });
});
